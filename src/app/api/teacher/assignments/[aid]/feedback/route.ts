import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { extractOllamaContent, getOllamaConfig } from "@/lib/ollama";
import { getAssignmentReview, updateAssignmentFeedback } from "@/lib/mockdb";

type FeedbackMap = Record<string, string>;

const stripJsonWrapper = (text: string) => text.replace(/```json|```/gi, "").trim();

const parseJsonObject = (raw: string): Record<string, unknown> | null => {
  const cleaned = stripJsonWrapper(raw);
  const match = cleaned.match(/(\{[\s\S]*\})/);
  const candidate = match ? match[1] : cleaned;
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
};

const normalizeSelection = (value: unknown) => {
  const numbers = Array.isArray(value)
    ? value.map(v => Number(v)).filter(v => Number.isInteger(v))
    : typeof value === "number"
      ? [value]
      : [];
  return Array.from(new Set(numbers));
};

const toOptionLabel = (options: string[] | null | undefined, index: number) => {
  if (!options || !options[index]) return `#${index + 1}`;
  return `${index + 1}. ${options[index]}`;
};

const formatSelection = (options: string[] | null | undefined, selection: number[]) => {
  if (!selection.length) return "—";
  return selection.map(idx => toOptionLabel(options, idx)).join(", ");
};

export async function POST(_: Request, ctx: { params: Promise<{ aid: string }> }) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { aid } = await ctx.params;

  const review = await getAssignmentReview(me, aid);
  if ("error" in review) {
    const statusMap: Record<string, number> = { FORBIDDEN: 403, ASSIGNMENT_NOT_FOUND: 404 };
    return NextResponse.json({ error: review.error }, { status: statusMap[review.error] ?? 400 });
  }

  if (!review.answers) return NextResponse.json({ error: "NO_ANSWERS" }, { status: 400 });

  const payload = review.questions.map(q => {
    const options = q.options ?? null;
    const hasOptions = Array.isArray(options) && options.length > 0;
    const multiSelect = Array.isArray(q.correctIndices) && q.correctIndices.length > 0;
    const expectedIndices = multiSelect
      ? q.correctIndices ?? []
      : typeof q.correctIndex === "number"
        ? [q.correctIndex]
        : [];
    const answerRaw = review.answers?.[q.id];
    const selection = normalizeSelection(answerRaw);
    const expectedText = hasOptions ? formatSelection(options, expectedIndices) : q.answerText || "—";
    const answerText = hasOptions
      ? formatSelection(options, selection)
      : typeof answerRaw === "string" && answerRaw.trim()
        ? answerRaw.trim()
        : "—";
    const isCorrect = hasOptions
      ? selection.length === expectedIndices.length && selection.every(idx => expectedIndices.includes(idx))
      : null;
    return {
      id: q.id,
      text: q.text,
      type: hasOptions ? (multiSelect ? "multi" : "single") : "long",
      options: options ?? [],
      expectedAnswer: expectedText,
      studentAnswer: answerText,
      correct: isCorrect,
      sampleAnswer: q.answerText ?? null,
    };
  });

  const systemPrompt = `
Ты — преподаватель, который даёт короткий фидбэк по каждому ответу студента.
Ответ строго JSON:
{
  "feedback": {
    "<questionId>": "<короткий фидбэк>"
  }
}

Правила:
- Пиши по-русски, 1–3 предложения.
- Если ответ верный: похвали и кратко закрепи ключевую мысль.
- Если ответ неверный: мягко укажи ошибку и дай правильный ответ или подсказку.
- Для длинных ответов сравни с sampleAnswer (если есть) и укажи, что улучшить.
- Не добавляй Markdown, списки и лишние поля.
`.trim();

  const userPrompt = `
Данные по ответам:
${JSON.stringify({ test: review.test.title, student: review.student.name, items: payload }, null, 2)}
`.trim();

  const { model, baseUrl, timeoutMs } = getOllamaConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const raw = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: "OLLAMA_FAILED", details: raw.slice(0, 300) }, { status: 502 });
    }
    const content = extractOllamaContent(raw);
    const parsed = parseJsonObject(content);
    if (!parsed) return NextResponse.json({ error: "PARSE_ERROR", raw: content.slice(0, 300) }, { status: 502 });
    const mapCandidate = (parsed.feedback && typeof parsed.feedback === "object" ? parsed.feedback : parsed) as Record<string, unknown>;
    const validIds = new Set(review.questions.map(q => q.id));
    const feedback: FeedbackMap = {};
    for (const [key, value] of Object.entries(mapCandidate)) {
      if (!validIds.has(key)) continue;
      if (typeof value === "string" && value.trim()) feedback[key] = value.trim();
    }
    if (Object.keys(feedback).length === 0) {
      return NextResponse.json({ error: "EMPTY_FEEDBACK" }, { status: 502 });
    }
    const updated = await updateAssignmentFeedback(me, aid, feedback);
    if ("error" in updated) {
      const statusMap: Record<string, number> = { FORBIDDEN: 403, ASSIGNMENT_NOT_FOUND: 404 };
      return NextResponse.json({ error: updated.error }, { status: statusMap[updated.error] ?? 400 });
    }
    return NextResponse.json({ ok: true, feedback });
  } catch (e: unknown) {
    clearTimeout(timeoutId);
    const isAbort = e instanceof Error && e.name === "AbortError";
    return NextResponse.json({ error: isAbort ? "OLLAMA_TIMEOUT" : "OLLAMA_REQUEST_FAILED" }, { status: isAbort ? 504 : 502 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ aid: string }> }) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { aid } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const raw = body?.feedback;
  if (!raw || typeof raw !== "object") return NextResponse.json({ error: "FEEDBACK_REQUIRED" }, { status: 400 });
  const feedback: FeedbackMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) feedback[key] = value.trim();
  }
  if (Object.keys(feedback).length === 0) return NextResponse.json({ error: "FEEDBACK_REQUIRED" }, { status: 400 });

  const updated = await updateAssignmentFeedback(me, aid, feedback);
  if ("error" in updated) {
    const statusMap: Record<string, number> = { FORBIDDEN: 403, ASSIGNMENT_NOT_FOUND: 404 };
    return NextResponse.json({ error: updated.error }, { status: statusMap[updated.error] ?? 400 });
  }
  return NextResponse.json({ ok: true, feedback });
}

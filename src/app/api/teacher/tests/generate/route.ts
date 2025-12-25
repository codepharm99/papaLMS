import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { currentUser } from "@/lib/auth";
import { extractOllamaContent, getOllamaConfig } from "@/lib/ollama";
import { addQuestionToTest, createTestForTeacher } from "@/lib/mockdb";

type GeneratedQuestion = {
  type?: string;
  text?: string;
  options?: string[];
  correctIndex?: number | null;
  correctIndices?: number[] | null;
  correctAnswer?: string | null;
  answerText?: string | null;
};

type GeneratedTest = {
  title?: string;
  description?: string;
  questions?: GeneratedQuestion[];
};

const MAX_QUESTIONS = 30;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const stripJsonWrapper = (text: string) => text.replace(/```json|```/gi, "").trim();

const parseJsonObject = (raw: string): GeneratedTest | null => {
  const cleaned = stripJsonWrapper(raw);
  const match = cleaned.match(/(\{[\s\S]*\})/);
  const candidate = match ? match[1] : cleaned;
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object") return parsed as GeneratedTest;
    return null;
  } catch {
    return null;
  }
};

const pickString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const pickNumber = (value: unknown) => {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeOptions = (options: unknown, maxCount: number) => {
  if (!Array.isArray(options)) return null;
  const cleaned = options.map(o => String(o ?? "").trim()).filter(Boolean);
  const trimmed = cleaned.slice(0, maxCount);
  return trimmed.length >= MIN_OPTIONS ? trimmed : null;
};

const normalizeIndices = (value: unknown, max: number) => {
  if (!Array.isArray(value)) return null;
  const indices = Array.from(new Set(value.map(v => Number(v)).filter(v => Number.isInteger(v))));
  if (indices.length === 0) return null;
  if (indices.some(i => i < 0 || i >= max)) return null;
  return indices;
};

const resolveCorrectIndex = (q: GeneratedQuestion, options: string[]) => {
  const direct = pickNumber(q.correctIndex);
  if (direct != null && Number.isInteger(direct) && direct >= 0 && direct < options.length) return direct;
  const answer = pickString(q.correctAnswer);
  if (!answer) return null;
  const idx = options.findIndex(opt => opt.toLowerCase() === answer.toLowerCase());
  return idx >= 0 ? idx : null;
};

const resolveCorrectIndices = (q: GeneratedQuestion, options: string[]) => {
  const direct = normalizeIndices(q.correctIndices, options.length);
  if (direct) return direct;
  const single = pickNumber(q.correctIndex);
  if (single != null && Number.isInteger(single) && single >= 0 && single < options.length) return [single];
  const answer = pickString(q.correctAnswer);
  if (!answer) return null;
  const parts = answer.split(/[,;\n]/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const indices = parts
    .map(part => options.findIndex(opt => opt.toLowerCase() === part.toLowerCase()))
    .filter(idx => idx >= 0);
  return indices.length > 0 ? Array.from(new Set(indices)) : null;
};

const resolveTrueFalseIndex = (q: GeneratedQuestion) => {
  const direct = pickNumber(q.correctIndex);
  if (direct != null && Number.isInteger(direct) && (direct === 0 || direct === 1)) return direct;
  const answer = pickString(q.correctAnswer).toLowerCase();
  if (!answer) return null;
  if (answer.includes("true") || answer.includes("верн")) return 0;
  if (answer.includes("false") || answer.includes("невер")) return 1;
  return null;
};

const normalizeType = (raw: string) => {
  const t = raw.toLowerCase().replace(/\s+/g, "");
  if (!t) return "";
  if (["truefalse", "true/false", "true-false", "tf", "boolean", "верно/неверно", "верноневерно"].includes(t)) {
    return "truefalse";
  }
  if (t.includes("multi") || t.includes("multiplecorrect") || t.includes("multiselect")) return "multi";
  if (t.includes("long") || t.includes("open") || t.includes("text") || t.includes("essay") || t.includes("written")) return "long";
  if (t.includes("multiple") || t.includes("single")) return "multiple";
  return "";
};

const looksLikeTrueFalseOptions = (options: string[] | null) => {
  if (!options || options.length !== 2) return false;
  const normalized = options.map(o => o.toLowerCase());
  return (
    normalized.some(o => o.includes("верно") || o.includes("true")) &&
    normalized.some(o => o.includes("невер") || o.includes("false"))
  );
};

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== Role.TEACHER) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const topic = pickString(body?.topic);
  const title = pickString(body?.title);
  const description = pickString(body?.description);
  const multipleCount = clamp(Number(body?.multipleCount ?? 0) || 0, 0, MAX_QUESTIONS);
  const multiCount = clamp(Number(body?.multiCount ?? 0) || 0, 0, MAX_QUESTIONS);
  const trueFalseCount = clamp(Number(body?.trueFalseCount ?? 0) || 0, 0, MAX_QUESTIONS);
  const longCount = clamp(Number(body?.longCount ?? 0) || 0, 0, MAX_QUESTIONS);
  const optionsCount = clamp(Number(body?.optionsCount ?? 4) || 4, MIN_OPTIONS, MAX_OPTIONS);
  const totalCount = clamp(multipleCount + multiCount + trueFalseCount + longCount, 1, MAX_QUESTIONS);
  const isDraft = Boolean(body?.draft);

  if (!topic && !title) return NextResponse.json({ error: "TOPIC_REQUIRED" }, { status: 400 });
  if (totalCount <= 0) return NextResponse.json({ error: "COUNT_REQUIRED" }, { status: 400 });

  const { model, baseUrl, timeoutMs } = getOllamaConfig();

  const systemPrompt = `
You are an assistant that generates tests for teachers.
Output JSON only with the following schema:
{
  "title": "<string>",
  "description": "<string>",
  "questions": [
    {
      "type": "multiple" | "multi" | "truefalse" | "long",
      "text": "<question text>",
      "options": ["A", "B", ...],
      "correctIndex": 0,
      "correctIndices": [0, 2],
      "answerText": "<model answer for long>"
    }
  ]
}

Rules:
- Write in Russian.
- For type "multiple", provide ${optionsCount} short answer options and one correctIndex (0-based).
- For type "multi", provide ${optionsCount} short answer options and correctIndices (0-based, 2+ values).
- For type "truefalse", do not include custom options; use correctIndex 0 for "Верно", 1 for "Неверно".
- For type "long", do not include options; add "answerText" with a full written answer.
- Questions must be clear and concise.
- Do not add explanations or extra fields. Output JSON only.
`.trim();

  const userPrompt = `
Сгенерируй тест по теме: ${topic || title}.
Название теста: ${title || "на основе темы"}.
Описание: ${description || "краткое"}.
Нужно вопросов с вариантами ответа: ${multipleCount}.
Нужно вопросов с несколькими правильными: ${multiCount}.
Нужно вопросов true/false: ${trueFalseCount}.
Нужно вопросов с длинным ответом: ${longCount}.
`.trim();

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

    const finalTitle = pickString(parsed.title) || title || topic || "Тест";
    const finalDescription = pickString(parsed.description) || description || undefined;

    let added = 0;
    let remainingMultiple = multipleCount;
    let remainingMulti = multiCount;
    let remainingTrueFalse = trueFalseCount;
    let remainingLong = longCount;
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    const prepared: Array<{
      type: "multiple" | "multi" | "truefalse" | "long";
      text: string;
      options?: string[];
      correctIndex?: number | null;
      correctIndices?: number[] | null;
      answerText?: string | null;
    }> = [];
    for (const q of questions) {
      if (prepared.length >= totalCount) break;
      const text = pickString(q.text);
      if (!text) continue;
      const typeRaw = normalizeType(pickString(q.type));
      const options = normalizeOptions(q.options, optionsCount);
      const guessTrueFalse = options && looksLikeTrueFalseOptions(options);
      const type =
        typeRaw ||
        (guessTrueFalse ? "truefalse" : "") ||
        (options ? (normalizeIndices(q.correctIndices, options.length) ? "multi" : "multiple") : "") ||
        (pickString(q.answerText || q.correctAnswer) ? "long" : "");

      if (type === "truefalse") {
        if (remainingTrueFalse <= 0) continue;
        const correctIndex = resolveTrueFalseIndex(q);
        if (correctIndex == null && !isDraft) continue;
        prepared.push({ type: "truefalse", text, options: ["Верно", "Неверно"], correctIndex: correctIndex ?? null });
        remainingTrueFalse -= 1;
        continue;
      }

      if (type === "long") {
        if (remainingLong <= 0) continue;
        const answerText = pickString(q.answerText ?? q.correctAnswer) || null;
        prepared.push({ type: "long", text, answerText });
        remainingLong -= 1;
        continue;
      }

      if (type === "multi") {
        if (remainingMulti <= 0) continue;
        if (!options) continue;
        const indices = resolveCorrectIndices(q, options);
        if (!indices && !isDraft) continue;
        prepared.push({ type: "multi", text, options, correctIndices: indices ?? null });
        remainingMulti -= 1;
        continue;
      }

      if (type === "multiple") {
        if (remainingMultiple <= 0) continue;
        if (!options) continue;
        const correctIndex = resolveCorrectIndex(q, options);
        if (correctIndex == null && !isDraft) continue;
        prepared.push({ type: "multiple", text, options, correctIndex: correctIndex ?? null });
        remainingMultiple -= 1;
      }
    }

    if (prepared.length === 0) {
      return NextResponse.json({ error: "NO_VALID_QUESTIONS", raw: content.slice(0, 300) }, { status: 502 });
    }

    if (isDraft) {
      return NextResponse.json({
        ok: true,
        draft: {
          title: finalTitle,
          description: finalDescription || "",
          questions: prepared,
        },
        requested: totalCount,
        model,
      });
    }

    const created = await createTestForTeacher(me, {
      title: finalTitle,
      description: finalDescription || undefined,
    });
    if ("error" in created) {
      return NextResponse.json({ error: created.error }, { status: 400 });
    }

    for (const q of prepared) {
      const result = await addQuestionToTest(me, created.item.id, {
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex ?? null,
        correctIndices: q.correctIndices ?? null,
        answerText: q.answerText ?? null,
      });
      if ("ok" in result) {
        added += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      testId: created.item.id,
      questionsAdded: added,
      requested: totalCount,
      model,
    });
  } catch (e: unknown) {
    clearTimeout(timeoutId);
    const isAbort = e instanceof Error && e.name === "AbortError";
    return NextResponse.json({ error: isAbort ? "OLLAMA_TIMEOUT" : "OLLAMA_REQUEST_FAILED" }, { status: isAbort ? 504 : 502 });
  }
}

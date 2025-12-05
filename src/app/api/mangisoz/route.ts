import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MANGISOZ_BASE_URL = "https://mangisoz.nu.edu.kz/external-api/v1";
const DEFAULT_OLLAMA_BASE = "http://100.75.71.86:11434";

const OLLAMA_BASE = (
  process.env.OLLAMA_API_URL ||
  process.env.OLLAMA_BASE_URL ||
  DEFAULT_OLLAMA_BASE
).replace(/\/+$/, "");

const OLLAMA_URL = `${OLLAMA_BASE}/api/chat`;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma3:4b";
const OLLAMA_MAX_CHARS = Number(process.env.OLLAMA_MAX_CHARS || 1200);
const TTS_LANG = process.env.MANGISOZ_TTS_LANG || "kaz";
const TTS_VOICE = process.env.MANGISOZ_TTS_VOICE || "female";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 20000);
const HISTORY_LIMIT = 8;

export const dynamic = "force-dynamic";

const logPrefix = "[kausar-api]";
const logInfo = (...args: unknown[]) => console.info(logPrefix, ...args);
const logError = (...args: unknown[]) => console.error(logPrefix, ...args);

function extractOllamaMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const message = (payload as { message?: { content?: unknown } }).message;
  if (message && typeof message.content === "string") {
    return message.content;
  }

  const response = (payload as { response?: unknown }).response;
  if (typeof response === "string") {
    return response;
  }

  return "";
}

function sanitizeForSpeech(text: string): string {
  return text.replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

function enforceAnswerLimit(text: string): string {
  const trimmed = text.trim();
  const max = Number.isFinite(OLLAMA_MAX_CHARS) ? Math.max(0, OLLAMA_MAX_CHARS) : 0;
  if (!max || trimmed.length <= max) {
    return trimmed;
  }
  const truncated = trimmed.slice(0, Math.max(0, max - 1)).trimEnd();
  return `${truncated}…`;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

function parseHistory(raw: FormDataEntryValue | null): ChatMessage[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const cleaned = data
      .map(item => {
        if (!item || typeof item !== "object") return null;
        const role = (item as { role?: string }).role;
        const content = (item as { content?: unknown }).content;
        if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
          return { role, content: content.trim() };
        }
        return null;
      })
      .filter(Boolean) as ChatMessage[];
    return cleaned.slice(-HISTORY_LIMIT);
  } catch {
    return [];
  }
}

async function buildContext() {
  const me = await currentUser();
  if (!me) return { me: null, contextText: "" };

  // Students snapshot (names only, limited to keep prompt short).
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 30,
  });
  const studentNames = students.map(s => s.name).filter(Boolean);

  // Presentations of current teacher, if applicable.
  let presentations: { title: string; slideHeads: string[] }[] = [];
  if (me.role === "TEACHER") {
    const items = await prisma.presentation.findMany({
      where: { teacherId: me.id },
      orderBy: { createdAt: "desc" },
      select: { title: true, slides: true },
      take: 10,
    });
    presentations = items.map(item => {
      const slides = (item.slides as unknown[]) || [];
      const heads = slides
        .map(s => (s && typeof s === "object" ? (s as { heading?: string; text?: string }).heading || (s as { heading?: string; text?: string }).text : ""))
        .filter(Boolean)
        .slice(0, 3);
      return { title: item.title, slideHeads: heads };
    });
  }

  const contextParts: string[] = [];
  if (studentNames.length) {
    const more = students.length >= 30 ? " (показаны первые 30)" : "";
    contextParts.push(`Студенты${more}: ${studentNames.join(", ")}`);
  }
  if (presentations.length) {
    const presSummary = presentations
      .map(p => `${p.title}${p.slideHeads.length ? ` — слайды: ${p.slideHeads.join("; ")}` : ""}`)
      .join(" | ");
    contextParts.push(`Презентации преподавателя: ${presSummary}`);
  }

  const contextText = contextParts.join(" | ");
  return { me, contextText };
}

export async function POST(req: Request) {
  const mangisozToken = process.env.MANGISOZAPI;
  if (!mangisozToken) {
    logError("MANGISOZAPI is missing");
    return NextResponse.json(
      { error: "Missing MANGISOZAPI environment variable" },
      { status: 500 }
    );
  }

  const incomingForm = await req.formData();
  const file = incomingForm.get("file");
  const history = parseHistory(incomingForm.get("history"));

  if (!(file instanceof File)) {
    logError("No file provided in form-data");
    return NextResponse.json(
      { error: "Audio file not provided" },
      { status: 400 }
    );
  }

  logInfo("Received audio", { name: file.name, size: file.size, type: file.type });
  if (history.length) {
    logInfo("History included", { messages: history.length });
  }

  const upstreamForm = new FormData();
  upstreamForm.append("file", file, file.name || "audio.wav");

  let transcription = "";

  try {
    logInfo("Calling Mangisoz for transcription...");
    const transcriptionResponse = await fetch(
      `${MANGISOZ_BASE_URL}/transcript/transcript_audio/`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${mangisozToken}` },
        body: upstreamForm,
      }
    );

    if (!transcriptionResponse.ok) {
      const detail = await transcriptionResponse.text();
      logError("Mangisoz transcription failed", transcriptionResponse.status, detail);
      return NextResponse.json(
        { error: "Failed to transcribe audio with Mangisoz", detail },
        { status: transcriptionResponse.status }
      );
    }

    const result = await transcriptionResponse.json();
    transcription =
      typeof result?.transcription_text === "string"
        ? result.transcription_text
        : "";
    logInfo("Mangisoz transcription success", transcription);
  } catch (error) {
    logError("Mangisoz transcription error", error);
    return NextResponse.json(
      {
        error: "Unexpected error while contacting Mangisoz",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }

  let ollamaAnswer = "";

  const { contextText } = await buildContext();

  if (transcription.trim()) {
    try {
      logInfo("Sending prompt to Ollama...", { url: OLLAMA_URL, model: OLLAMA_MODEL, timeoutMs: OLLAMA_TIMEOUT_MS });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
      const startedAt = Date.now();

      const ollamaResponse = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are Kausar, a concise educational assistant. Respond in Kazakh, avoid markdown and lists. For simple or factual questions, answer in one short sentence. Otherwise keep it 2-3 sentences and under ~600 characters. Skip filler and greetings.",
            },
            ...(contextText
              ? [
                  {
                    role: "system" as const,
                    content: `Доступный контекст о студентах и презентациях: ${contextText}`,
                  },
                ]
              : []),
            ...history,
            { role: "user", content: transcription },
          ],
          stream: false,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (ollamaResponse.ok) {
        const payload = await ollamaResponse.json();
        const rawAnswer = extractOllamaMessage(payload);
        ollamaAnswer = enforceAnswerLimit(rawAnswer);
        logInfo("Ollama responded", {
          length: ollamaAnswer.length,
          durationMs: Date.now() - startedAt,
        });
      } else {
        const detail = await ollamaResponse.text();
        logError("Ollama error", ollamaResponse.status, detail);
        return NextResponse.json(
          { transcription, error: "Ollama responded with an error", detail },
          { status: ollamaResponse.status }
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        const msg = `Ollama timed out after ${OLLAMA_TIMEOUT_MS}ms`;
        logError(msg);
        return NextResponse.json(
          { transcription, error: msg },
          { status: 504 }
        );
      }
      logError("Ollama network error", error);
      return NextResponse.json(
        {
          transcription,
          error: "Could not reach Ollama",
          detail: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 502 }
      );
    }
  }

  let speechAudio: string | undefined;
  const ttsInput = sanitizeForSpeech(ollamaAnswer);

  if (ttsInput) {
    try {
      logInfo("Requesting TTS from Mangisoz...");
      const ttsResponse = await fetch(
        `${MANGISOZ_BASE_URL}/translate/text/?output_format=audio&output_voice=${TTS_VOICE}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mangisozToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_language: TTS_LANG,
            target_language: TTS_LANG,
            text: ttsInput,
          }),
        }
      );

      if (ttsResponse.ok) {
        const payload = await ttsResponse.json();
        if (typeof payload?.audio === "string") {
          speechAudio = payload.audio;
          logInfo("TTS success, audio length", speechAudio.length);
        }
      } else {
        const detail = await ttsResponse.text();
        logError("TTS error", ttsResponse.status, detail);
      }
    } catch {
      // text-to-speech is optional
      logError("TTS request failed (ignored)");
    }
  }

  logInfo("Responding to client");

  return NextResponse.json({
    transcription,
    answer: ollamaAnswer,
    ttsAudio: speechAudio,
  });
}

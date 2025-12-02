import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

type OllamaResponse = { response?: string | null };

const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "mistral:7b";
const BASE_URL = (process.env.OLLAMA_BASE_URL || "http://100.81.115.30:11434").replace(/\/+$/, "");
const PROMPT_PATH =
  process.env.PRESENTATION_DETAIL_PROMPT_PATH || path.join(process.cwd(), "prompts", "presentation-detail.md");
const RULES_PATH =
  process.env.PRESENTATION_DETAIL_RULES_PATH || path.join(process.cwd(), "prompts", "presentation-text-rules.md");

const DEFAULT_RULES = [
  "Write in English.",
  "No numbered or bullet lists; produce continuous, coherent text.",
  "Be concise but not sparse: include enough meaningful detail without fluff.",
  "Stay on topic and follow the slide heading as a mini outline.",
].join("\n");

const pickString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

async function loadPromptTemplate(): Promise<string | null> {
  try {
    const file = await fs.readFile(PROMPT_PATH, "utf8");
    const trimmed = file.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

async function loadRules(): Promise<string> {
  try {
    const file = await fs.readFile(RULES_PATH, "utf8");
    const trimmed = file.trim();
    return trimmed || DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

function renderPrompt(template: string, ctx: { topic: string; heading: string }, rules: string) {
  const withRules = template.replace(/\{\{\s*rules\s*\}\}/gi, rules);
  const withVars = withRules.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    if (key === "topic") return ctx.topic;
    if (key === "heading") return ctx.heading;
    return `{{${key}}}`;
  });
  if (rules && !withVars.toLowerCase().includes("rules")) {
    return `${withVars}\n\nRules:\n${rules}`;
  }
  return withVars;
}

function stripJsonWrapper(text: string) {
  return text.replace(/```json|```/gi, "").trim();
}

function pickDetails(raw: string): string {
  const cleaned = stripJsonWrapper(raw);
  // If JSON, try to pick "details" or "body"
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") {
      const details =
        pickString((parsed as Record<string, unknown>).details) ||
        pickString((parsed as Record<string, unknown>).body) ||
        pickString((parsed as Record<string, unknown>).text);
      if (details) return details;
    }
  } catch {
    // plain text is ok
  }
  return pickString(cleaned);
}

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const topic = pickString(body.topic).slice(0, 400);
  const heading = pickString(body.heading).slice(0, 200);

  if (!topic || !heading) {
    return NextResponse.json({ error: "NO_DATA" }, { status: 400 });
  }

  const template = await loadPromptTemplate();
  if (!template) {
    return NextResponse.json({ error: "NO_PROMPT_TEMPLATE" }, { status: 500 });
  }

  const rules = await loadRules();
  const prompt = renderPrompt(template, { topic, heading }, rules);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: DEFAULT_MODEL, prompt, stream: false }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const details = await res.text().catch(() => "");
      return NextResponse.json({ error: "OLLAMA_FAILED", details: details.slice(0, 300) }, { status: 502 });
    }

    const data = (await res.json()) as OllamaResponse;
    const raw = pickString(data?.response);
    if (!raw) return NextResponse.json({ error: "EMPTY_RESPONSE" }, { status: 502 });

    const details = pickDetails(raw);
    if (!details) return NextResponse.json({ error: "PARSE_ERROR" }, { status: 502 });

    return NextResponse.json({ details, model: DEFAULT_MODEL });
  } catch (e: unknown) {
    clearTimeout(timeoutId);
    const isAbort = e instanceof Error && e.name === "AbortError";
    return NextResponse.json({ error: isAbort ? "TIMEOUT" : "REQUEST_FAILED" }, { status: 502 });
  }
}

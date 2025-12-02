import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

type OllamaResponse = { response?: string | null };

const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "mistral:7b";
const BASE_URL = (process.env.OLLAMA_BASE_URL || "http://100.81.115.30:11434").replace(/\/+$/, "");
const PROMPT_PATH =
  process.env.PRESENTATION_PROMPT_PATH || path.join(process.cwd(), "prompts", "presentation.md");
const PEXELS_KEY = process.env.PEXELS_API_KEY || "";

type NormalizedSlide = {
  heading: string;
  details?: string;
  imageDataUrl?: string;
  imageAuthorName?: string;
  imageAuthorUrl?: string;
};

const pickString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const pickStringArray = (value: unknown) => (Array.isArray(value) ? value.map(pickString).filter(Boolean) : []);

function stripJsonWrapper(text: string) {
  return text.replace(/```json|```/gi, "").trim();
}

function extractJson(text: string): unknown {
  const cleaned = stripJsonWrapper(text);
  const blockMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  const candidate = blockMatch ? blockMatch[1] : cleaned;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeSlide(raw: unknown): NormalizedSlide | null {
  if (typeof raw === "string") {
    const heading = raw.trim();
    return heading ? { heading } : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const heading = pickString(obj.title) || pickString(obj.heading) || pickString(obj.topic) || pickString(obj.text);
  if (!heading) return null;
  const body = pickString(obj.body) || pickString(obj.summary) || pickString(obj.description);
  const bullets = pickStringArray(obj.bullets ?? obj.points ?? obj.items ?? obj.bulletPoints ?? obj.list);
  const details = [body, bullets.map(b => `• ${b}`).join("\n")].filter(Boolean).join("\n").trim() || undefined;
  return { heading, ...(details ? { details } : {}) };
}

function normalizePayload(payload: unknown, fallbackTitle: string): { title: string; slides: NormalizedSlide[] } {
  const maybeObj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const slidesSource = maybeObj?.slides ?? payload;
  const slidesArray = Array.isArray(slidesSource) ? slidesSource : [];
  const slides = slidesArray.map(normalizeSlide).filter(Boolean) as NormalizedSlide[];
  const title = pickString(maybeObj?.title) || fallbackTitle;
  return { title, slides };
}

async function loadPromptTemplate(): Promise<string | null> {
  try {
    const file = await fs.readFile(PROMPT_PATH, "utf8");
    const trimmed = file.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

function renderPrompt(template: string, ctx: { topic: string; slides: number }) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    if (key === "topic") return ctx.topic;
    if (key === "slides") return String(ctx.slides);
    return `{{${key}}}`;
  });
}

type PexelsPick = { url: string; authorName?: string; authorUrl?: string };

async function fetchPexelsByQuery(query: string): Promise<PexelsPick[]> {
  if (!PEXELS_KEY || !query) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "8");
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("size", "large");
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Authorization: PEXELS_KEY },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      photos?: Array<{
        src?: { large?: string; large2x?: string; medium?: string; landscape?: string };
        photographer?: string;
        photographer_url?: string;
      }>;
    };
    return (
      data?.photos
        ?.map(p => {
          const urlPick = pickString(
            p.src?.large2x || p.src?.landscape || p.src?.large || p.src?.medium
          );
          if (!urlPick) return null;
          return {
            url: urlPick,
            authorName: pickString(p.photographer),
            authorUrl: pickString(p.photographer_url),
          } satisfies PexelsPick;
        })
        .filter(Boolean) as PexelsPick[]
    ) || [];
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

const pexelsCache = new Map<string, PexelsPick[]>();
const usedImages = new Set<string>();

async function pickPexelsImage(heading: string, topic: string): Promise<PexelsPick | null> {
  if (!PEXELS_KEY) return null;
  const queries = [
    [heading, topic].filter(Boolean).join(", ").trim(),
    heading.trim(),
    topic.trim(),
  ]
    .map(q => q.slice(0, 120))
    .filter(Boolean);

  for (const query of queries) {
    if (!pexelsCache.has(query)) {
      const picks = await fetchPexelsByQuery(query);
      pexelsCache.set(query, picks);
    }
    const picks = pexelsCache.get(query) || [];
    const pick = picks.find(p => p.url && !usedImages.has(p.url));
    if (pick) {
      usedImages.add(pick.url);
      return pick;
    }
  }
  return null;
}

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const topic = pickString(body.topic).slice(0, 400);
  const slidesRaw = typeof body.slides === "number" ? body.slides : Number.parseInt(String(body.slides ?? ""), 10);
  const requestedSlides = Number.isFinite(slidesRaw) ? Math.min(Math.max(Math.round(slidesRaw), 3), 12) : 8;

  if (!topic) {
    return NextResponse.json({ error: "NO_TOPIC" }, { status: 400 });
  }

  const template = await loadPromptTemplate();
  if (!template) {
    return NextResponse.json({ error: "NO_PROMPT_TEMPLATE" }, { status: 500 });
  }
  const prompt = renderPrompt(template, { topic, slides: requestedSlides });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

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

    const parsed = extractJson(raw);
    if (!parsed) return NextResponse.json({ error: "PARSE_ERROR" }, { status: 502 });

    const normalized = normalizePayload(parsed, topic);
    if (!normalized.slides.length) return NextResponse.json({ error: "NO_SLIDES" }, { status: 502 });

    let slidesWithImages: NormalizedSlide[] = normalized.slides;
    if (PEXELS_KEY && normalized.slides.length > 0) {
      const enriched: NormalizedSlide[] = [];
      for (const slide of normalized.slides) {
        const heading = slide.heading || topic;
        const image = await pickPexelsImage(heading, topic);
        enriched.push(
          image
            ? { ...slide, imageDataUrl: image.url, imageAuthorName: image.authorName, imageAuthorUrl: image.authorUrl }
            : slide
        );
      }
      slidesWithImages = enriched;
    }

    return NextResponse.json({ title: normalized.title, slides: slidesWithImages, model: DEFAULT_MODEL });
  } catch (e: unknown) {
    clearTimeout(timeoutId);
    const isAbort = e instanceof Error && e.name === "AbortError";
    return NextResponse.json({ error: isAbort ? "TIMEOUT" : "REQUEST_FAILED" }, { status: 502 });
  }
}

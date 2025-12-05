import { NextResponse } from "next/server";

const MANGISOZ_BASE_URL = "https://mangisoz.nu.edu.kz/external-api/v1";
const OLLAMA_URL =
  process.env.OLLAMA_API_URL || "http://100.75.71.86:11434/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma3:4b";
const OLLAMA_TRANSLATOR_MODEL =
  process.env.OLLAMA_TRANSLATOR_MODEL || "zongwei/gemma3-translator:4b";
const TTS_LANG = process.env.MANGISOZ_TTS_LANG || "kaz";
const TTS_VOICE = process.env.MANGISOZ_TTS_VOICE || "female";

export const dynamic = "force-dynamic";

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

export async function POST(req: Request) {
  const mangisozToken = process.env.MANGISOZAPI;
  if (!mangisozToken) {
    return NextResponse.json(
      { error: "Missing MANGISOZAPI environment variable" },
      { status: 500 }
    );
  }

  const incomingForm = await req.formData();
  const file = incomingForm.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Audio file not provided" },
      { status: 400 }
    );
  }

  const upstreamForm = new FormData();
  upstreamForm.append("file", file, file.name || "audio.wav");

  let transcription = "";

  try {
    const transcriptionResponse = await fetch(
      `${MANGISOZ_BASE_URL}/transcript/transcript_audio/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mangisozToken}`,
        },
        body: upstreamForm,
      }
    );

    if (!transcriptionResponse.ok) {
      const detail = await transcriptionResponse.text();
      return NextResponse.json(
        {
          error: "Failed to transcribe audio with Mangisoz",
          detail,
        },
        { status: transcriptionResponse.status }
      );
    }

    const result = await transcriptionResponse.json();
    transcription =
      typeof result?.transcription_text === "string"
        ? result.transcription_text
        : "";
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error while contacting Mangisoz",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }

  let ollamaAnswer = "";
  let translatedForOllama = transcription;

  if (transcription.trim()) {
    try {
      try {
        const translatorResponse = await fetch(OLLAMA_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: OLLAMA_TRANSLATOR_MODEL,
            messages: [
              {
                role: "user",
                content: `Translate from Kazakh to English:\n${transcription}`,
              },
            ],
            stream: false,
          }),
        });

        if (translatorResponse.ok) {
          const translatorPayload = await translatorResponse.json();
          const maybeTranslated = extractOllamaMessage(translatorPayload);
          if (maybeTranslated.trim()) {
            translatedForOllama = maybeTranslated;
          }
        }
      } catch {
        // ignore translation errors and keep original transcription
      }

      const ollamaResponse = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [{ role: "user", content: translatedForOllama }],
          stream: false,
        }),
      });

      if (ollamaResponse.ok) {
        const payload = await ollamaResponse.json();
        ollamaAnswer = extractOllamaMessage(payload);
      } else {
        const detail = await ollamaResponse.text();
        return NextResponse.json(
          {
            transcription,
            error: "Ollama responded with an error",
            detail,
          },
          { status: ollamaResponse.status }
        );
      }
    } catch (error) {
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
        }
      }
    } catch {
      // Ignore TTS errors; main answer still returns.
    }
  }

  return NextResponse.json({
    transcription,
    answer: ollamaAnswer,
    ttsAudio: speechAudio,
  });
}

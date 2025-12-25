export type OllamaConfig = {
  model: string;
  baseUrl: string;
  timeoutMs: number;
};

type OllamaEnvelope = {
  message?: { content?: string | null };
  response?: string | null;
};

const parsePositiveNumber = (value?: string) => {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const resolveTimeoutMs = () => {
  const timeoutMs = parsePositiveNumber(process.env.OLLAMA_TIMEOUT_MS);
  if (timeoutMs != null) return Math.round(timeoutMs);
  const timeoutSeconds = parsePositiveNumber(process.env.OLLAMA_TIMEOUT);
  if (timeoutSeconds != null) return Math.round(timeoutSeconds * 1000);
  return 90_000;
};

export function getOllamaConfig(): OllamaConfig {
  const model = process.env.OLLAMA_MODEL || "gemma3:12b";
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://100.92.41.89:11434").replace(/\/+$/, "");
  const timeoutMs = resolveTimeoutMs();
  return { model, baseUrl, timeoutMs };
}

export const extractOllamaContent = (rawText: string): string => {
  try {
    const parsed = JSON.parse(rawText) as OllamaEnvelope;
    const messageContent = typeof parsed?.message?.content === "string" ? parsed.message.content.trim() : "";
    if (messageContent) return messageContent;
    const responseContent = typeof parsed?.response === "string" ? parsed.response.trim() : "";
    if (responseContent) return responseContent;
  } catch {
    // non-JSON response
  }
  return rawText;
};

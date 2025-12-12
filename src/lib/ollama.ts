export type OllamaConfig = {
  model: string;
  baseUrl: string;
};

export function getOllamaConfig(): OllamaConfig {
  const model = process.env.OLLAMA_MODEL || "ministral-3:3b";
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://100.92.41.89:11434").replace(/\/+$/, "");
  return { model, baseUrl };
}

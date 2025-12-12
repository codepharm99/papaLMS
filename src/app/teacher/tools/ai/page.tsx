"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

type ApiResult = {
  ok: boolean;
  model?: string;
  actions?: number;
  reason?: string;
  results?: Array<{ type: string; ok: boolean; detail: string; error?: string }>;
};

const heroPaint: CSSProperties = {
  "--module-accent-1": "230 88% 70%",
  "--module-accent-2": "266 84% 68%",
  "--module-accent-3": "308 78% 66%",
};

const introMessage: ChatMessage = {
  id: "intro",
  role: "assistant",
  text:
    "Я могу создавать тесты и обновлять оценки студентов ваших курсов. Примеры: " +
    "«Создай тест “Алгебра” с 2 вопросами про корни уравнений»; " +
    "«Поставь студенту student1 по курсу CS101 за 3 неделю лекцию 90, практику 85»; " +
    "«Переименуй student2 в Иван Иванов, он на моём курсе CS404».",
};

function formatAssistantReply(res: ApiResult): string {
  if (!res.ok) return "Не удалось выполнить: " + (res.reason || "ошибка сервера.");
  const lines: string[] = [];
  if (res.reason) lines.push(`План: ${res.reason}`);
  if (typeof res.actions === "number") lines.push(`Действий в плане: ${res.actions}`);
  if (Array.isArray(res.results) && res.results.length > 0) {
    for (const r of res.results) {
      const status = r.ok ? "✔" : "✖";
      lines.push(`${status} [${r.type}] ${r.detail}`);
    }
  } else {
    lines.push("Нет действий.");
  }
  if (res.model) lines.push(`Модель: ${res.model}`);
  return lines.join("\n");
}

export default function TeacherAiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([introMessage]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  const send = async () => {
    if (!canSend) return;
    const text = input.trim();
    const userMsg: ChatMessage = { id: String(Date.now()), role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setError(null);
    const res = await fetch("/api/teacher/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult & { raw?: string; error?: string };

    if (!data.ok) {
      const detail = [data.error, data.reason, data.raw].filter(Boolean).join(" · ") || "Не удалось обработать запрос.";
      const reply: ChatMessage = {
        id: String(Date.now()) + "-assistant-error",
        role: "assistant",
        text: `Ошибка: ${detail}`,
      };
      setMessages(prev => [...prev, reply]);
      setError(null);
    } else {
      const reply: ChatMessage = {
        id: String(Date.now()) + "-assistant",
        role: "assistant",
        text: formatAssistantReply(data),
      };
      setMessages(prev => [...prev, reply]);
      setError(null);
    }
    setSending(false);
  };

  return (
    <div className="page-aurora space-y-5 rounded-3xl p-1" style={heroPaint}>
      <div
        className="module-illustration rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-fuchsia-600 px-6 py-5 text-white shadow-xl"
        style={heroPaint}
      >
        <p className="text-xs uppercase tracking-[0.28em] text-white/70">Инструменты преподавателя</p>
        <h1 className="mt-2 text-2xl font-bold">AI-помощник</h1>
        <p className="text-sm text-white/80">
          Общайтесь в свободной форме: помощник создаст тесты или обновит оценки студентов ваших курсов.
        </p>
        <div className="mt-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          Модель: gpt-oss:20b
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Чат с AI</div>
            <p className="text-sm text-gray-600">
              Поддерживаются: создание тестов, добавление вопросов, изменение имени студента (если он на вашем курсе),
              обновление оценок (неделя, лекция/практика/инд.работа/рейтинг/мидтерм/экзамен).
            </p>
          </div>
          <div className="text-xs text-gray-500">Шлите один запрос за раз</div>
        </div>

        <div className="space-y-3 max-h-[420px] overflow-y-auto rounded-xl border bg-gray-50/80 p-3">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={msg.role === "user" ? "text-gray-900" : "whitespace-pre-wrap text-gray-800"}
            >
              <span className="mr-2 text-xs uppercase tracking-wide text-gray-500">
                {msg.role === "user" ? "Вы" : "AI"}
              </span>
              <span>{msg.text}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <textarea
            className="w-full rounded-xl border px-3 py-2 text-sm"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Например: Создай тест “База данных” с 3 вопросами про индексы; или Поставь student1 за CS101 неделю 2: лекция 90, практика 85, инд.работа 80"
          />
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sending ? "Отправляем..." : "Отправить"}
            </button>
            {error && <span className="text-sm text-red-700">{error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

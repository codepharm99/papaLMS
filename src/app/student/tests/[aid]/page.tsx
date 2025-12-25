"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type Assignment = { id: string; test: { id: string; title: string }; dueAt?: number | null; status: string };
type Q = { id: string; text: string; options?: string[] | null; multiSelect?: boolean };

export default function TakeTestPage() {
  const params = useParams<{ aid: string }>();
  const aid = params?.aid as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);

  // answers: map questionId -> number (index), number[] (multi), or string (text)
  const [answers, setAnswers] = useState<Record<string, number | number[] | string | null>>({});
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/student/tests/${aid}`, { cache: "no-store" });
        if (!r.ok) throw new Error("Не удалось загрузить тест");
        const j: { assignment: Assignment; questions: Q[] } = await r.json();
        if (!cancelled) {
          setAssignment(j.assignment);
          setQuestions(j.questions ?? []);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (aid) load();
    return () => {
      cancelled = true;
    };
  }, [aid]);

  useEffect(() => {
    if (!assignment?.dueAt) {
      setTimeLeftMs(null);
      return;
    }
    const update = () => {
      const left = assignment.dueAt - Date.now();
      setTimeLeftMs(Math.max(0, left));
    };
    update();
    const timerId = window.setInterval(update, 1000);
    return () => window.clearInterval(timerId);
  }, [assignment?.dueAt]);

  const isExpired = timeLeftMs !== null && timeLeftMs <= 0;
  const isReadOnly = assignment?.status === "COMPLETED" || isExpired;

  const formatTimeLeft = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}ч ${minutes}м ${seconds}с`;
    return `${minutes}м ${seconds}с`;
  };

  const canSubmit = useMemo(() => {
    if (isReadOnly) return false;
    if (!questions.length) return false;
    // require an answer for every question that has options
    return questions.every(q => {
      if (q.options && q.options.length > 0) {
        if (q.multiSelect) return Array.isArray(answers[q.id]) && (answers[q.id] as number[]).length > 0;
        return typeof answers[q.id] === "number";
      }
      return typeof answers[q.id] === "string" || answers[q.id] == null; // open questions optional
    });
  }, [questions, answers, isReadOnly]);

  const submit = async () => {
    if (isExpired) {
      setError("Время вышло. Отправка недоступна.");
      return;
    }
    setError(null);
    const r = await fetch(`/api/student/tests/${aid}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j?.error || "Не удалось отправить ответы");
    } else {
      setResult({ score: j.score, total: j.total });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{assignment?.test.title ?? "Тест"}</h1>
      {assignment?.dueAt && (
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Таймер</div>
          <div className={`mt-1 text-2xl font-semibold ${isExpired ? "text-red-600" : "text-gray-900"}`}>
            {timeLeftMs === null ? "—" : isExpired ? "Время вышло" : formatTimeLeft(timeLeftMs)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Срок сдачи: {new Date(assignment.dueAt).toLocaleString()}
          </div>
        </div>
      )}
      {assignment?.status === "COMPLETED" && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">Этот тест уже сдан. Можно просмотреть вопросы ниже.</div>
      )}
      {isExpired && assignment?.status !== "COMPLETED" && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">Время на выполнение истекло. Ответы больше нельзя отправить.</div>
      )}

      {loading ? (
        <div className="text-sm text-gray-600">Загрузка…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <form
          onSubmit={e => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          {questions.map((q, idx) => (
            <div key={q.id} className="rounded-xl border bg-white p-4">
              <div className="mb-2 text-sm text-gray-500">Вопрос {idx + 1}</div>
              <div className="font-medium">{q.text}</div>
              {q.options && q.options.length > 0 ? (
                <div className="mt-2 grid gap-2">
                  {q.options.map((o, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm">
                      <input
                        type={q.multiSelect ? "checkbox" : "radio"}
                        name={`q-${q.id}`}
                        checked={
                          q.multiSelect
                            ? Array.isArray(answers[q.id]) && (answers[q.id] as number[]).includes(i)
                            : answers[q.id] === i
                        }
                        disabled={isReadOnly}
                        onChange={() =>
                          setAnswers(prev => {
                            if (!q.multiSelect) return { ...prev, [q.id]: i };
                            const current = Array.isArray(prev[q.id]) ? (prev[q.id] as number[]) : [];
                            const next = current.includes(i) ? current.filter(idx => idx !== i) : [...current, i];
                            return { ...prev, [q.id]: next };
                          })
                        }
                      />
                      {o}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="mt-2 w-full rounded-md border p-2 text-sm"
                  placeholder="Ваш ответ (необязательно)"
                  value={(answers[q.id] as string) || ""}
                  disabled={isReadOnly}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                />
              )}
            </div>
          ))}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!canSubmit}>
              Отправить ответы
            </Button>
            {result && (
              <span className="text-sm text-gray-700">
                Результат: {result.score} / {result.total}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

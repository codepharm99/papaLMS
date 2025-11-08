"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type Assignment = { id: string; test: { id: string; title: string }; dueAt?: number | null; status: string };
type Q = { id: string; text: string; options?: string[] | null };

export default function TakeTestPage() {
  const params = useParams<{ aid: string }>();
  const aid = params?.aid as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // answers: map questionId -> number (index) or string (text)
  const [answers, setAnswers] = useState<Record<string, number | string | null>>({});
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
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (aid) load();
    return () => {
      cancelled = true;
    };
  }, [aid]);

  const canSubmit = useMemo(() => {
    if (!questions.length) return false;
    // require an answer for every question that has options
    return questions.every(q => {
      if (q.options && q.options.length > 0) return typeof answers[q.id] === "number";
      return typeof answers[q.id] === "string" || answers[q.id] == null; // open questions optional
    });
  }, [questions, answers]);

  const submit = async () => {
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
        <div className="text-sm text-gray-600">Срок сдачи: {new Date(assignment.dueAt).toLocaleString()}</div>
      )}
      {assignment?.status === "COMPLETED" && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">Этот тест уже сдан. Можно просмотреть вопросы ниже.</div>
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
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === i}
                        onChange={() => setAnswers(prev => ({ ...prev, [q.id]: i }))}
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


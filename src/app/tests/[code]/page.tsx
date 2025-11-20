"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type PublicTest = { id: string; title: string; description?: string | null };
type PublicQuestion = { id: string; text: string; options?: string[] | null };

export default function PublicTestPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<PublicTest | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, number | string | null>>({});
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tests/${code}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "Не найдено");
        if (!cancelled) {
          setTest(j.test);
          setQuestions(j.questions ?? []);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (code) load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    return true;
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tests/${code}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, answers }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Не удалось отправить");
      setResult({ score: j.score, total: j.total });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Загрузка...</div>;
  if (error) return <div className="p-6 text-red-600">Ошибка: {error}</div>;
  if (!test) return <div className="p-6">Тест не найден</div>;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
      <header className="rounded-xl border bg-white p-4">
        <h1 className="text-2xl font-semibold">{test.title}</h1>
        {test.description && <p className="mt-2 text-gray-600">{test.description}</p>}
      </header>

      <section className="rounded-xl border bg-white p-4">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm text-gray-700">Имя для результата</span>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Введите имя" required />
          </label>

          {questions.map(q => (
            <div key={q.id} className="rounded-lg border p-3">
              <div className="font-medium">{q.text}</div>
              {q.options ? (
                <div className="mt-2 grid gap-2">
                  {q.options.map((opt, idx) => (
                    <label key={idx} className="flex gap-2 text-sm">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={idx}
                        checked={answers[q.id] === idx}
                        onChange={() => setAnswers(prev => ({ ...prev, [q.id]: idx }))}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <Textarea
                  className="mt-2"
                  placeholder="Ваш ответ"
                  value={(answers[q.id] as string) || ""}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                />
              )}
            </div>
          ))}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "Отправка..." : "Сдать тест"}
            </Button>
            {result && <span className="text-sm text-gray-700">Результат: {result.score} / {result.total}</span>}
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </form>
      </section>
    </div>
  );
}

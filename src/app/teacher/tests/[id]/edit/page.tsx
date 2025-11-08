"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TestItem = { id: string; title: string; description?: string | null; createdAt: number };
type QuestionItem = { id: string; testId: string; text: string; options?: string[] | null; correctIndex?: number | null; createdAt: number };

export default function EditTestPage() {
  const params = useParams<{ id: string }>();
  const testId = params?.id as string;

  const [test, setTest] = useState<TestItem | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form state for new question
  const [text, setText] = useState("");
  const [options, setOptions] = useState<string[]>([""]);
  const [correct, setCorrect] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/teacher/tests/${testId}/questions`, { cache: "no-store" });
        if (!res.ok) throw new Error("Не удалось загрузить тест");
        const j: { test: TestItem; items: QuestionItem[] } = await res.json();
        if (!cancelled) {
          setTest(j.test);
          setQuestions(j.items ?? []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (testId) load();
    return () => {
      cancelled = true;
    };
  }, [testId]);

  const addOption = () => setOptions(prev => [...prev, ""]);
  const removeOption = (idx: number) => {
    setOptions(prev => prev.filter((_, i) => i !== idx));
    if (correct === idx) setCorrect(null);
    if (correct && idx < correct) setCorrect(correct - 1);
  };

  const canSubmit = useMemo(() => {
    const filled = options.map(o => o.trim()).filter(Boolean);
    if (filled.length === 0) return text.trim().length > 0; // открытый вопрос
    if (correct == null) return false;
    return text.trim().length > 0 && correct >= 0 && correct < filled.length;
  }, [text, options, correct]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const filled = options.map(o => o.trim()).filter(Boolean);
      const body: any = { text };
      if (filled.length > 0) {
        body.options = filled;
        body.correctIndex = correct;
      }
      const res = await fetch(`/api/teacher/tests/${testId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Не удалось добавить вопрос");
      setQuestions(prev => [...prev, j.item]);
      setText("");
      setOptions([""]);
      setCorrect(null);
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    }
  };

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Инструменты", href: "/teacher/tools" },
          { label: "Меню", href: "/teacher/tools" },
          { label: "Тестирование (прошлые тесты)", href: "/teacher/tests" },
          { label: test?.title ? `Создать тест: ${test.title}` : "Создать тест" },
        ]}
      />

      {loading ? (
        <div className="text-sm text-gray-600">Загрузка…</div>
      ) : (
        <>
          <section className="rounded-xl border bg-white p-4">
            <h1 className="mb-3 text-lg font-medium">Добавить вопрос</h1>
            <form onSubmit={handleAdd} className="grid gap-3 md:max-w-2xl">
              <label className="grid gap-1">
                <span className="text-sm text-gray-700">Формулировка</span>
                <Textarea value={text} onChange={e => setText(e.target.value)} required placeholder="Введите вопрос" />
              </label>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Варианты ответа (необязательно)</span>
                  <Button type="button" onClick={addOption} variant="secondary" className="text-sm">
                    Добавить вариант
                  </Button>
                </div>
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      className="h-4 w-4"
                      checked={correct === i}
                      onChange={() => setCorrect(i)}
                      disabled={opt.trim() === ""}
                      title="Правильный ответ"
                    />
                    <Input
                      value={opt}
                      onChange={e => setOptions(prev => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                      placeholder={`Вариант ${i + 1}`}
                    />
                    <Button type="button" variant="secondary" onClick={() => removeOption(i)}>
                      Удалить
                    </Button>
                  </div>
                ))}
              </div>

              <div>
                <Button type="submit" disabled={!canSubmit}>
                  Сохранить вопрос
                </Button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          </section>

          <section className="rounded-xl border bg-white p-4">
            <h2 className="mb-3 text-lg font-medium">Вопросы</h2>
            {questions.length === 0 ? (
              <div className="text-sm text-gray-600">Пока нет вопросов</div>
            ) : (
              <QuestionList testId={testId} items={questions} onUpdate={setQuestions} />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function QuestionList({
  testId,
  items,
  onUpdate,
}: {
  testId: string;
  items: QuestionItem[];
  onUpdate: (items: QuestionItem[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [correct, setCorrect] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (q: QuestionItem) => {
    setEditingId(q.id);
    setText(q.text);
    setOptions((q.options ?? []).slice());
    setCorrect(q.correctIndex ?? null);
  };
  const cancel = () => {
    setEditingId(null);
    setText("");
    setOptions([]);
    setCorrect(null);
  };
  const addOpt = () => setOptions(prev => [...prev, ""]);
  const rmOpt = (i: number) => {
    setOptions(prev => prev.filter((_, idx) => idx !== i));
    if (correct === i) setCorrect(null);
    if (typeof correct === "number" && i < correct) setCorrect(correct - 1);
  };
  const canSave = text.trim().length > 0 && (options.filter(o => o.trim()).length === 0 || (correct != null));

  const save = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const filled = options.map(o => o.trim()).filter(Boolean);
      const body: any = { text };
      if (filled.length > 0) {
        body.options = filled;
        body.correctIndex = correct;
      } else {
        body.options = null;
        body.correctIndex = null;
      }
      const res = await fetch(`/api/teacher/tests/${testId}/questions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Не удалось сохранить");
      onUpdate(items.map(it => (it.id === editingId ? j.item : it)));
      cancel();
    } finally {
      setSaving(false);
    }
  };
  const del = async (id: string) => {
    if (!confirm("Удалить вопрос?")) return;
    const res = await fetch(`/api/teacher/tests/${testId}/questions/${id}`, { method: "DELETE" });
    if (res.ok) onUpdate(items.filter(i => i.id !== id));
  };

  return (
    <ol className="space-y-3">
      {items.map((q, idx) => (
        <li key={q.id} className="rounded-lg border p-3">
          <div className="mb-1 flex items-center justify-between text-sm text-gray-500">
            <span>Вопрос {idx + 1}</span>
            {editingId === q.id ? (
              <span className="text-xs text-gray-400">Режим редактирования</span>
            ) : (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => startEdit(q)}>
                  Изменить
                </Button>
                <Button variant="secondary" size="sm" onClick={() => del(q.id)}>
                  Удалить
                </Button>
              </div>
            )}
          </div>

          {editingId === q.id ? (
            <div className="grid gap-2">
              <Textarea value={text} onChange={e => setText(e.target.value)} />
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Варианты (можно оставить пустыми)</span>
                  <Button variant="secondary" size="sm" type="button" onClick={addOpt}>
                    Добавить вариант
                  </Button>
                </div>
                {options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      className="h-4 w-4"
                      checked={correct === i}
                      onChange={() => setCorrect(i)}
                      disabled={o.trim() === ""}
                    />
                    <Input value={o} onChange={e => setOptions(prev => prev.map((v, idx) => (idx === i ? e.target.value : v)))} />
                    <Button variant="secondary" size="sm" type="button" onClick={() => rmOpt(i)}>
                      Удалить
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={save} disabled={!canSave || saving}>
                  Сохранить
                </Button>
                <Button size="sm" variant="secondary" onClick={cancel}>
                  Отменить
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="font-medium">{q.text}</div>
              {q.options && q.options.length > 0 && (
                <ul className="mt-2 list-decimal pl-6 text-sm">
                  {q.options.map((o, i) => (
                    <li key={i} className={q.correctIndex === i ? "font-semibold text-green-700" : undefined}>
                      {o}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </li>
      ))}
    </ol>
  );
}

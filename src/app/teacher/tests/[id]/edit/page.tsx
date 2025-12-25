"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TestItem = {
  id: string;
  title: string;
  description?: string | null;
  publicCode?: string | null;
  publishedAt?: number | null;
  createdAt: number;
};
type QuestionItem = { id: string; testId: string; text: string; answerText?: string | null; options?: string[]; correctIndex?: number | null; correctIndices?: number[] | null; createdAt: number };
type StudentItem = { id: string; name: string };
type StudentStatus = { id: string; name: string; status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED"; timestamp: number };
type QuestionPayload = { text: string; options?: string[] | null; correctIndex?: number | null; correctIndices?: number[] | null; answerText?: string | null };
type GuestAttempt = { id: string; name: string; score: number; total: number; createdAt: number };

export default function EditTestPage() {
  const params = useParams<{ id: string }>();
  const testId = params?.id as string;

  const [test, setTest] = useState<TestItem | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentStatus, setStudentStatus] = useState<StudentStatus[]>([]);
  const [guestAttempts, setGuestAttempts] = useState<GuestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [guestLoading, setGuestLoading] = useState(true);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [questionType, setQuestionType] = useState<"multiple" | "multi" | "truefalse" | "long">("multiple");
  const [options, setOptions] = useState<string[]>([""]);
  const [correct, setCorrect] = useState<number | null>(null);
  const [correctIndices, setCorrectIndices] = useState<number[]>([]);
  const [answerText, setAnswerText] = useState("");

  const [questionSavingId, setQuestionSavingId] = useState<string | null>(null);
  const [questionSaveError, setQuestionSaveError] = useState<string | null>(null);

  const [assignStudentId, setAssignStudentId] = useState("");
  const [assignDueAt, setAssignDueAt] = useState("");
  const [assignDuration, setAssignDuration] = useState("");
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  const formatDateTimeLocal = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // --- Загрузка теста и вопросов ---
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/teacher/tests/${testId}/questions`);
        const data = await res.json();
        if (!cancelled) {
          setTest(data.test);
          setQuestions(data.items ?? []);
        }
      } catch (e) {
        console.error("Ошибка загрузки теста:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (testId) load();
    return () => { cancelled = true; };
  }, [testId]);

  // --- Загрузка студентов ---
  useEffect(() => {
    let cancelled = false;
    async function loadStudents() {
      try {
        const res = await fetch("/api/teacher/students");
        const j = await res.json();
        if (!cancelled) {
          setStudents(j.data ?? []);
          if (j.data?.length) setAssignStudentId(j.data[0].id);
        }
      } catch (e) { console.error(e); }
    }
    loadStudents();
    return () => { cancelled = true; };
  }, []);

  // --- Загрузка статуса студентов для текущего теста ---
  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      setStatusLoading(true);
      try {
        const res = await fetch(`/api/teacher/tests/${testId}/status`);
        if (!res.ok) throw new Error(`Статус ${res.status}`);
        const data: StudentStatus[] = await res.json();
        if (!cancelled) setStudentStatus(data);
      } catch (e) { console.error("Ошибка загрузки статуса студентов:", e); }
      finally { if (!cancelled) setStatusLoading(false); }
    }
    if (testId) loadStatus();
    return () => { cancelled = true; };
  }, [testId]);

  // --- Гостевые попытки ---
  useEffect(() => {
    let cancelled = false;
    async function loadGuests() {
      setGuestLoading(true);
      setGuestError(null);
      try {
        const res = await fetch(`/api/teacher/tests/${testId}/guests`);
        if (!res.ok) throw new Error(`Статус ${res.status}`);
        const data: GuestAttempt[] = await res.json();
        if (!cancelled) setGuestAttempts(data);
      } catch (e) {
        if (!cancelled) setGuestError(e instanceof Error ? e.message : "Ошибка загрузки гостевых попыток");
      } finally {
        if (!cancelled) setGuestLoading(false);
      }
    }
    if (testId) loadGuests();
    return () => { cancelled = true; };
  }, [testId]);

  // --- Работа с вариантами ---
  const addOption = () => setOptions(prev => [...prev, ""]);
  const removeOption = (idx: number) => {
    setOptions(prev => prev.filter((_, i) => i !== idx));
    if (correct === idx) setCorrect(null);
    if (correct !== null && idx < correct) setCorrect(correct - 1);
    setCorrectIndices(prev => prev.filter(i => i !== idx).map(i => (i > idx ? i - 1 : i)));
  };

  const toggleCorrectIndex = (idx: number) => {
    setCorrectIndices(prev => (prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]));
  };

  const setType = (next: "multiple" | "multi" | "truefalse" | "long") => {
    setQuestionType(next);
    if (next === "multiple") {
      setOptions([""]);
      setCorrect(null);
      setCorrectIndices([]);
      setAnswerText("");
    }
    if (next === "multi") {
      setOptions(["", ""]);
      setCorrect(null);
      setCorrectIndices([]);
      setAnswerText("");
    }
    if (next === "truefalse") {
      setOptions(["Верно", "Неверно"]);
      setCorrect(null);
      setCorrectIndices([]);
      setAnswerText("");
    }
    if (next === "long") {
      setOptions([]);
      setCorrect(null);
      setCorrectIndices([]);
      setAnswerText("");
    }
  };

  const canSubmit = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (questionType === "long") return true;
    const filled = options.map(o => o.trim()).filter(Boolean);
    const hasEmpty = options.some(o => !o.trim());
    if (questionType === "truefalse") return correct !== null;
    if (filled.length < 2) return false;
    if (hasEmpty) return false;
    if (questionType === "multi") return correctIndices.length > 0;
    if (correct == null) return false;
    return correct >= 0 && correct < filled.length;
  }, [text, options, correct, correctIndices, questionType]);

  const getQuestionKind = (q: QuestionItem) => {
    const opts = q.options ?? null;
    if (!opts || opts.length === 0) return "long";
    if (opts.length === 2 && opts[0]?.toLowerCase().includes("вер") && opts[1]?.toLowerCase().includes("невер")) {
      return "truefalse";
    }
    if (Array.isArray(q.correctIndices) && q.correctIndices.length > 0) return "multi";
    return "multiple";
  };

  const updateQuestionField = (id: string, updates: Partial<QuestionItem>) => {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...updates } : q)));
  };

  const updateQuestionOption = (id: string, idx: number, value: string) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== id) return q;
        const next = Array.isArray(q.options) ? [...q.options] : [];
        next[idx] = value;
        return { ...q, options: next };
      })
    );
  };

  const addQuestionOption = (id: string) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== id) return q;
        const next = Array.isArray(q.options) ? [...q.options] : [];
        next.push("");
        return { ...q, options: next };
      })
    );
  };

  const removeQuestionOption = (id: string, idx: number) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== id) return q;
        const next = Array.isArray(q.options) ? [...q.options] : [];
        next.splice(idx, 1);
        let nextCorrect = q.correctIndex ?? null;
        let nextCorrectIndices = Array.isArray(q.correctIndices) ? [...q.correctIndices] : [];
        if (nextCorrect === idx) nextCorrect = null;
        if (nextCorrect != null && idx < nextCorrect) nextCorrect = nextCorrect - 1;
        if (nextCorrectIndices.length > 0) {
          nextCorrectIndices = nextCorrectIndices.filter(i => i !== idx).map(i => (i > idx ? i - 1 : i));
        }
        return { ...q, options: next, correctIndex: nextCorrect, correctIndices: nextCorrectIndices };
      })
    );
  };

  const toggleQuestionCorrectIndex = (id: string, idx: number) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== id) return q;
        const current = Array.isArray(q.correctIndices) ? q.correctIndices : [];
        const next = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx];
        return { ...q, correctIndices: next };
      })
    );
  };

  const saveQuestion = async (q: QuestionItem) => {
    setQuestionSaveError(null);
    setQuestionSavingId(q.id);
    const kind = getQuestionKind(q);
    const text = q.text.trim();
    if (!text) {
      setQuestionSaveError("Текст вопроса обязателен.");
      setQuestionSavingId(null);
      return;
    }
    const optionsRaw = Array.isArray(q.options) ? q.options.map(o => o.trim()) : [];
    const optionsClean = optionsRaw.filter(Boolean);
    let payload: QuestionPayload = { text, answerText: q.answerText ?? null };
    if (kind === "long") {
      payload = { ...payload, options: null, correctIndex: null, correctIndices: null };
    } else if (kind === "multi") {
      payload = {
        ...payload,
        options: optionsClean,
        correctIndices: Array.isArray(q.correctIndices) ? q.correctIndices : [],
        correctIndex: null,
      };
    } else {
      payload = {
        ...payload,
        options: optionsClean,
        correctIndex: q.correctIndex ?? null,
        correctIndices: null,
      };
    }
    try {
      const res = await fetch(`/api/teacher/tests/${testId}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: q.id, ...payload }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Ошибка сохранения");
      setQuestions(prev => prev.map(item => (item.id === q.id ? j.item : item)));
    } catch (e: unknown) {
      setQuestionSaveError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setQuestionSavingId(null);
    }
  };

  const deleteQuestion = async (id: string) => {
    setQuestionSaveError(null);
    setQuestionSavingId(id);
    try {
      const res = await fetch(`/api/teacher/tests/${testId}/questions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Ошибка удаления");
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (e: unknown) {
      setQuestionSaveError(e instanceof Error ? e.message : "Ошибка удаления");
    } finally {
      setQuestionSavingId(null);
    }
  };

  const isPublished = !!test?.publishedAt;
  const shareLink = useMemo(() => {
    if (!test?.publicCode) return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/tests/${test.publicCode}`;
  }, [test?.publicCode]);

  const handlePublish = async () => {
    if (!testId) return;
    setPublishError(null);
    setPublishLoading(true);
    try {
      const res = await fetch(`/api/teacher/tests/${testId}/publish`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Не удалось опубликовать");
      setTest(j.item);
    } catch (e: unknown) {
      setPublishError(e instanceof Error ? e.message : "Ошибка публикации");
    } finally {
      setPublishLoading(false);
    }
  };

  // --- Добавление вопроса ---
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPublished) return;
    const trimmedText = text.trim();
    const filled = options.map(o => o.trim()).filter(Boolean);
    const body: QuestionPayload = { text: trimmedText };
    if (questionType === "long") {
      body.options = undefined;
      body.correctIndex = null;
      body.correctIndices = null;
      body.answerText = answerText.trim() || null;
    } else if (questionType === "truefalse") {
      body.options = ["Верно", "Неверно"];
      body.correctIndex = correct ?? null;
      body.correctIndices = null;
    } else if (questionType === "multi") {
      body.options = filled;
      body.correctIndices = Array.from(new Set(correctIndices));
      body.correctIndex = null;
    } else if (filled.length) {
      body.options = filled;
      body.correctIndex = correct ?? null;
      body.correctIndices = null;
    }
    try {
      const res = await fetch(`/api/teacher/tests/${testId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (res.ok) {
        setQuestions(prev => [...prev, j.item]);
        setText("");
        setType("multiple");
        setAnswerText("");
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Инструменты", href: "/teacher/tools" },
        { label: "Тестирование", href: "/teacher/tests" },
        { label: test?.title || "Редактирование теста" },
      ]} />

      {loading ? <div>Загрузка теста...</div> : (
        <>
          {/* Публикация и ссылка */}
          <section className="border p-4 rounded-xl bg-white space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Публикация</h2>
                <p className="text-sm text-gray-600">
                  После публикации редактирование вопросов будет заблокировано. Ссылка открыта для всех.
                </p>
              </div>
              <Button variant="secondary" onClick={handlePublish} disabled={publishLoading || isPublished}>
                {isPublished ? "Уже опубликован" : publishLoading ? "Публикую..." : "Опубликовать"}
              </Button>
            </div>
            {publishError && <div className="text-sm text-red-600">{publishError}</div>}
            {isPublished && shareLink && (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-center">
                <div className="grid gap-2">
                  <div className="text-sm text-gray-700">Публичная ссылка</div>
                  <div className="flex gap-2">
                    <Input readOnly value={shareLink} />
                    <Button type="button" onClick={() => navigator.clipboard.writeText(shareLink)}>Скопировать</Button>
                  </div>
                </div>
                <div className="justify-self-end rounded-lg border bg-white p-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareLink)}`}
                    alt="QR-код для ссылки"
                    className="h-[180px] w-[180px]"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Добавление вопросов */}
          <section className="border p-4 rounded-xl bg-white">
            <h2 className="text-lg font-semibold mb-2">Добавить вопрос</h2>
            {isPublished ? (
              <div className="text-sm text-gray-600">Тест опубликован. Вопросы больше редактировать нельзя.</div>
            ) : (
              <form onSubmit={handleAdd} className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Тип вопроса</span>
                  <select
                    className="rounded-md border px-3 py-2 text-sm"
                    value={questionType}
                    onChange={(e) => setType(e.target.value as "multiple" | "multi" | "truefalse" | "long")}
                  >
                    <option value="multiple">Несколько вариантов</option>
                    <option value="multi">Несколько правильных</option>
                    <option value="truefalse">Верно / Неверно</option>
                    <option value="long">Длинный ответ</option>
                  </select>
                </label>
                <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Введите вопрос" required />

                {questionType === "multiple" && (
                  <div className="grid gap-2">
                    <div className="text-xs text-gray-500">Выберите один правильный вариант.</div>
                    {options.map((opt, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="radio" checked={correct === i} onChange={() => setCorrect(i)} title="Правильный ответ" />
                        <Input
                          value={opt}
                          onChange={e => setOptions(prev => prev.map((v, j) => (j === i ? e.target.value : v)))}
                          placeholder={`Вариант ${i + 1}`}
                        />
                        <Button type="button" onClick={() => removeOption(i)}>Удалить</Button>
                      </div>
                    ))}
                    <Button type="button" onClick={addOption}>Добавить вариант</Button>
                  </div>
                )}

                {questionType === "multi" && (
                  <div className="grid gap-2">
                    <div className="text-xs text-gray-500">Отметьте все правильные варианты.</div>
                    {options.map((opt, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="checkbox" checked={correctIndices.includes(i)} onChange={() => toggleCorrectIndex(i)} />
                        <Input
                          value={opt}
                          onChange={e => setOptions(prev => prev.map((v, j) => (j === i ? e.target.value : v)))}
                          placeholder={`Вариант ${i + 1}`}
                        />
                        <Button type="button" onClick={() => removeOption(i)}>Удалить</Button>
                      </div>
                    ))}
                    <Button type="button" onClick={addOption}>Добавить вариант</Button>
                  </div>
                )}

                {questionType === "truefalse" && (
                  <div className="grid gap-2">
                    <div className="text-xs text-gray-500">Выберите один правильный вариант.</div>
                    {["Верно", "Неверно"].map((label, i) => (
                      <label key={label} className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="radio" checked={correct === i} onChange={() => setCorrect(i)} />
                        {label}
                      </label>
                    ))}
                  </div>
                )}

                {questionType === "long" && (
                  <div className="grid gap-2">
                    <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-600">
                      Студент даст развернутый ответ в текстовом поле.
                    </div>
                    <label className="grid gap-1">
                      <span className="text-xs uppercase tracking-wide text-gray-500">Пример ответа (опционально)</span>
                      <Textarea
                        value={answerText}
                        onChange={e => setAnswerText(e.target.value)}
                        placeholder="Краткий образец правильного ответа"
                      />
                    </label>
                  </div>
                )}

                <Button type="submit" disabled={!canSubmit}>Сохранить вопрос</Button>
              </form>
            )}
          </section>

          {/* Редактирование вопросов */}
          <section className="border p-4 rounded-xl bg-white space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Текущие вопросы</h2>
              <span className="text-xs text-gray-500">Всего: {questions.length}</span>
            </div>
            {questions.length === 0 ? (
              <div className="text-sm text-gray-600">Вопросов пока нет.</div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => {
                  const kind = getQuestionKind(q);
                  const opts = Array.isArray(q.options) ? q.options : [];
                  return (
                    <div key={q.id} className="rounded-xl border bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-500">
                          Вопрос {idx + 1} · {kind === "long" ? "Длинный ответ" : kind === "multi" ? "Несколько правильных" : kind === "truefalse" ? "Верно/Неверно" : "Один правильный"}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{new Date(q.createdAt).toLocaleDateString("ru-RU")}</span>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => saveQuestion(q)}
                            disabled={questionSavingId === q.id || isPublished}
                          >
                            {questionSavingId === q.id ? "Сохраняем..." : "Сохранить"}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => deleteQuestion(q.id)}
                            disabled={questionSavingId === q.id || isPublished}
                          >
                            Удалить
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={q.text}
                        onChange={e => updateQuestionField(q.id, { text: e.target.value })}
                        className="min-h-20"
                        placeholder="Текст вопроса"
                        disabled={isPublished}
                      />

                      {kind === "long" ? (
                        <label className="mt-3 grid gap-1">
                          <span className="text-xs uppercase tracking-wide text-gray-500">Пример ответа</span>
                          <Textarea
                            value={q.answerText ?? ""}
                            onChange={e => updateQuestionField(q.id, { answerText: e.target.value })}
                            placeholder="Образец правильного ответа"
                            disabled={isPublished}
                          />
                        </label>
                      ) : (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs text-gray-500">
                            {kind === "multi" ? "Отметьте все правильные варианты." : "Выберите один правильный вариант."}
                          </div>
                          {opts.map((opt, optIdx) => (
                            <div key={`${q.id}-${optIdx}`} className="flex items-center gap-2">
                              {kind === "multi" ? (
                                <input
                                  type="checkbox"
                                  checked={Array.isArray(q.correctIndices) && q.correctIndices.includes(optIdx)}
                                  onChange={() => toggleQuestionCorrectIndex(q.id, optIdx)}
                                  disabled={isPublished}
                                />
                              ) : (
                                <input
                                  type="radio"
                                  name={`q-${q.id}`}
                                  checked={q.correctIndex === optIdx}
                                  onChange={() => updateQuestionField(q.id, { correctIndex: optIdx, correctIndices: [] })}
                                  disabled={isPublished}
                                />
                              )}
                              <Input
                                value={opt}
                                onChange={e => updateQuestionOption(q.id, optIdx, e.target.value)}
                                placeholder={`Вариант ${optIdx + 1}`}
                                disabled={isPublished}
                              />
                              <Button type="button" onClick={() => removeQuestionOption(q.id, optIdx)} disabled={isPublished}>
                                Удалить
                              </Button>
                            </div>
                          ))}
                          {kind !== "truefalse" && (
                            <Button type="button" onClick={() => addQuestionOption(q.id)} disabled={isPublished}>
                              Добавить вариант
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {questionSaveError && <div className="text-sm text-red-600">{questionSaveError}</div>}
            {isPublished && (
              <div className="text-xs text-gray-500">Тест опубликован. Редактирование вопросов недоступно.</div>
            )}
          </section>

          {/* Назначение теста */}
          <section className="border p-4 rounded-xl bg-white">
            <h2 className="text-lg font-semibold mb-2">Назначить тест студенту</h2>
            <form onSubmit={async e=>{
              e.preventDefault();
              try {
                const durationMinutes = Number(assignDuration);
                const dueAtValue =
                  Number.isFinite(durationMinutes) && durationMinutes > 0
                    ? formatDateTimeLocal(new Date(Date.now() + durationMinutes * 60000))
                    : assignDueAt || null;
                const res = await fetch("/api/teacher/assignments", {
                  method:"POST",
                  headers:{"Content-Type":"application/json"}, 
                  body: JSON.stringify({ testId, studentId: assignStudentId, dueAt: dueAtValue })
                });
                setAssignMsg(res.ok ? "Назначение создано" : "Ошибка при назначении");
              } catch (err) { console.error(err); }
            }} className="grid gap-2">
              <select value={assignStudentId} onChange={e=>setAssignStudentId(e.target.value)}>
                {students.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <label className="grid gap-1">
                <span className="text-xs text-gray-600">Время на выполнение (в минутах)</span>
                <Input
                  type="number"
                  min={1}
                  value={assignDuration}
                  onChange={e => {
                    const next = e.target.value;
                    setAssignDuration(next);
                    const minutes = Number(next);
                    if (Number.isFinite(minutes) && minutes > 0) {
                      setAssignDueAt(formatDateTimeLocal(new Date(Date.now() + minutes * 60000)));
                    }
                  }}
                  placeholder="Напр. 45"
                />
              </label>
              <Input
                type="datetime-local"
                value={assignDueAt}
                onChange={e => {
                  setAssignDueAt(e.target.value);
                  if (assignDuration) setAssignDuration("");
                }}
              />
              {assignDuration && (
                <div className="text-xs text-gray-500">
                  Дедлайн рассчитан автоматически на основе времени выполнения.
                </div>
              )}
              <Button type="submit">Назначить</Button>
              {assignMsg && <span className="text-sm text-gray-600">{assignMsg}</span>}
            </form>
          </section>

          {/* Статус студентов */}
          <section className="border p-4 rounded-xl bg-white">
            <h2 className="text-lg font-semibold mb-2">Статус теста</h2>
            {statusLoading ? <div>Загрузка статуса студентов...</div> : (
              <div className="space-y-2">
                <div>
                  <h3 className="font-medium text-gray-700">Не начат</h3>
                  <ul className="ml-4 list-disc">
                    {studentStatus.filter(s => s.status==="ASSIGNED").map(s => (
                      <li key={`${s.id}-${s.timestamp}`} className="text-gray-500">{s.name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-orange-700">В процессе</h3>
                  <ul className="ml-4 list-disc">
                    {studentStatus.filter(s => s.status==="IN_PROGRESS").map(s => (
                      <li key={`${s.id}-${s.timestamp}`} className="text-orange-500">{s.name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-green-700">Сдано</h3>
                  <ul className="ml-4 list-disc">
                    {studentStatus.filter(s => s.status==="COMPLETED").map(s => (
                      <li key={`${s.id}-${s.timestamp}`} className="text-green-600">{s.name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          {/* Гостевые попытки */}
          <section className="border p-4 rounded-xl bg-white">
            <h2 className="text-lg font-semibold mb-2">Гостевые сдачи по ссылке</h2>
            {guestLoading ? (
              <div>Загрузка...</div>
            ) : guestError ? (
              <div className="text-sm text-red-600">{guestError}</div>
            ) : guestAttempts.length === 0 ? (
              <div className="text-sm text-gray-600">Пока никто не сдавал тест по публичной ссылке.</div>
            ) : (
              <div className="space-y-2">
                {guestAttempts.map(a => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{a.score} / {a.total}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

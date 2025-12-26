"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type AssignmentItem = {
  id: string;
  student: { id: string; name: string };
  status: string;
  score?: number | null;
  total?: number | null;
  completedAt?: number | null;
  dueAt?: number | null;
  assignedAt: number;
};

type ReviewQuestion = {
  id: string;
  text: string;
  options?: string[] | null;
  correctIndex?: number | null;
  correctIndices?: number[] | null;
  answerText?: string | null;
};

type ReviewData = {
  assignment: {
    id: string;
    status: string;
    score?: number | null;
    total?: number | null;
    completedAt?: number | null;
    dueAt?: number | null;
    assignedAt: number;
  };
  student: { id: string; name: string };
  test: { id: string; title: string };
  questions: ReviewQuestion[];
  answers: Record<string, unknown> | null;
  feedback: Record<string, string> | null;
};

const formatPercent = (value: number) => `${Math.round(value * 1000) / 10}%`;

const normalizeSelection = (value: unknown) => {
  const numbers = Array.isArray(value)
    ? value.map(v => Number(v)).filter(v => Number.isInteger(v))
    : typeof value === "number"
      ? [value]
      : [];
  return Array.from(new Set(numbers));
};

const formatOption = (options: string[] | null | undefined, idx: number) => {
  if (!options || !options[idx]) return `#${idx + 1}`;
  return `${idx + 1}. ${options[idx]}`;
};

const formatSelection = (options: string[] | null | undefined, selection: number[]) => {
  if (!selection.length) return "—";
  return selection.map(idx => formatOption(options, idx)).join(", ");
};

export default function ReviewTestPage() {
  const params = useParams<{ id: string }>();
  const testId = params?.id as string;

  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAssignments() {
      setAssignmentsLoading(true);
      setAssignmentsError(null);
      try {
        const res = await fetch(`/api/teacher/tests/${testId}/assignments`, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Не удалось загрузить работы");
        if (!cancelled) {
          const items = j.items ?? [];
          setAssignments(items);
          setSelectedId(prev => prev || items[0]?.id || "");
        }
      } catch (e: unknown) {
        if (!cancelled) setAssignmentsError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setAssignmentsLoading(false);
      }
    }
    if (testId) loadAssignments();
    return () => {
      cancelled = true;
    };
  }, [testId]);

  useEffect(() => {
    if (!selectedId) {
      setReviewData(null);
      return;
    }
    let cancelled = false;
    async function loadReview() {
      setReviewLoading(true);
      setReviewError(null);
      setSaveMessage(null);
      try {
        const res = await fetch(`/api/teacher/assignments/${selectedId}`, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.data) throw new Error(j?.error || "Не удалось загрузить работу");
        if (!cancelled) {
          setReviewData(j.data as ReviewData);
          setFeedbackDraft(j.data.feedback ?? {});
        }
      } catch (e: unknown) {
        if (!cancelled) setReviewError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setReviewLoading(false);
      }
    }
    loadReview();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const completed = reviewData?.assignment.status === "COMPLETED";

  const reviewSummary = useMemo(() => {
    if (!reviewData) return null;
    const { score, total } = reviewData.assignment;
    if (typeof score !== "number" || typeof total !== "number" || total === 0) return null;
    return formatPercent(score / total);
  }, [reviewData]);

  const updateFeedback = (id: string, value: string) => {
    setFeedbackDraft(prev => ({ ...prev, [id]: value }));
  };

  const saveFeedback = async () => {
    if (!selectedId) return;
    setSaveLoading(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/teacher/assignments/${selectedId}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackDraft }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Не удалось сохранить фидбэк");
      setSaveMessage("Фидбэк сохранён и будет виден студенту.");
    } catch (e: unknown) {
      setSaveMessage(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaveLoading(false);
    }
  };

  const generateFeedback = async () => {
    if (!selectedId) return;
    setGenerateLoading(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/teacher/assignments/${selectedId}/feedback`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Не удалось сгенерировать фидбэк");
      setFeedbackDraft(j.feedback ?? {});
      setSaveMessage("Фидбэк сгенерирован. Проверьте и сохраните.");
    } catch (e: unknown) {
      setSaveMessage(e instanceof Error ? e.message : "Ошибка генерации");
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: "Инструменты", href: "/teacher/tools" },
          { label: "Тестирование", href: "/teacher/tests" },
          { label: "Проверка работ" },
        ]}
      />

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Проверка работ</h1>
            <p className="text-sm text-gray-600">Выберите студента и дайте фидбэк по ответам.</p>
          </div>
          <Link
            href={`/teacher/tests/${testId}/edit`}
            className="rounded-full border px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            К тесту →
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-gray-900">Список сдач</h2>
            <span className="text-xs text-gray-500">Всего: {assignments.length}</span>
          </div>
          {assignmentsLoading ? (
            <div className="mt-3 text-sm text-gray-600">Загрузка…</div>
          ) : assignmentsError ? (
            <div className="mt-3 text-sm text-red-600">{assignmentsError}</div>
          ) : assignments.length === 0 ? (
            <div className="mt-3 text-sm text-gray-600">Пока нет назначений.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {assignments.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    selectedId === item.id ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900">{item.student.name}</span>
                    <span className="text-xs text-gray-500">{item.status}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                    <span>Назначен: {new Date(item.assignedAt).toLocaleDateString("ru-RU")}</span>
                    {typeof item.score === "number" && typeof item.total === "number" && item.total > 0 ? (
                      <span>{formatPercent(item.score / item.total)}</span>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Разбор работы</h2>
              {reviewData && (
                <div className="mt-1 text-xs text-gray-500">
                  Студент: <span className="font-semibold text-gray-900">{reviewData.student.name}</span> ·{" "}
                  {reviewData.test.title}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={generateFeedback} disabled={!completed || generateLoading}>
                {generateLoading ? "Генерируем..." : "Сгенерировать фидбэк"}
              </Button>
              <Button type="button" onClick={saveFeedback} disabled={!completed || saveLoading}>
                {saveLoading ? "Сохраняем..." : "Сохранить фидбэк"}
              </Button>
            </div>
          </div>

          {reviewLoading ? (
            <div className="mt-4 text-sm text-gray-600">Загрузка работы…</div>
          ) : reviewError ? (
            <div className="mt-4 text-sm text-red-600">{reviewError}</div>
          ) : !reviewData ? (
            <div className="mt-4 text-sm text-gray-600">Выберите сдачу в списке слева.</div>
          ) : (
            <>
              <div className="mt-4 rounded-xl border bg-slate-50 p-3 text-sm text-gray-700">
                <div className="flex flex-wrap items-center gap-4">
                  <span>Статус: {reviewData.assignment.status}</span>
                  {reviewData.assignment.completedAt && (
                    <span>Сдан: {new Date(reviewData.assignment.completedAt).toLocaleDateString("ru-RU")}</span>
                  )}
                  {reviewSummary && <span>Результат: {reviewSummary}</span>}
                </div>
              </div>

              {saveMessage && (
                <div className={`mt-3 text-sm ${saveMessage.includes("Ошибка") ? "text-red-600" : "text-emerald-600"}`}>
                  {saveMessage}
                </div>
              )}

              <div className="mt-4 space-y-4">
                {reviewData.questions.map((q, idx) => {
                  const options = q.options ?? null;
                  const multi = Array.isArray(q.correctIndices) && q.correctIndices.length > 0;
                  const expectedIndices = multi
                    ? q.correctIndices ?? []
                    : typeof q.correctIndex === "number"
                      ? [q.correctIndex]
                      : [];
                  const studentRaw = reviewData.answers?.[q.id];
                  const selection = normalizeSelection(studentRaw);
                  const expectedText = options
                    ? formatSelection(options, expectedIndices)
                    : q.answerText || "—";
                  const studentText = options
                    ? formatSelection(options, selection)
                    : typeof studentRaw === "string" && studentRaw.trim()
                      ? studentRaw.trim()
                      : "—";
                  const correct =
                    options && expectedIndices.length > 0
                      ? selection.length === expectedIndices.length &&
                        selection.every(idx => expectedIndices.includes(idx))
                      : null;
                  return (
                    <div key={q.id} className="rounded-xl border bg-white p-4">
                      <div className="text-xs text-gray-500">Вопрос {idx + 1}</div>
                      <div className="mt-1 font-semibold text-gray-900">{q.text}</div>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div>
                          <span className="text-xs text-gray-500">Ответ студента: </span>
                          <span className="font-medium text-gray-900">{studentText}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Правильный ответ: </span>
                          <span className="font-medium text-gray-900">{expectedText}</span>
                        </div>
                        {correct !== null && (
                          <div className={`text-xs ${correct ? "text-emerald-600" : "text-rose-600"}`}>
                            {correct ? "Ответ верный" : "Ответ неверный"}
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Фидбэк преподавателя</div>
                        <Textarea
                          value={feedbackDraft[q.id] ?? ""}
                          onChange={e => updateFeedback(q.id, e.target.value)}
                          className="mt-2 min-h-20"
                          placeholder="Введите фидбэк или сгенерируйте через ИИ"
                          disabled={!completed}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

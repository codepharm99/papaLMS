"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type TestItem = { id: string; title: string; description?: string | null; publicCode?: string | null; publishedAt?: number | null; createdAt: number };
type TemplateCard = { id: string; label: string; caption: string; title: string; description: string; accent: string };
type CSSVars = CSSProperties & Record<`--${string}`, string>;
type DraftQuestion = {
  id: string;
  type: "multiple" | "multi" | "truefalse" | "long";
  text: string;
  options?: string[];
  correctIndex?: number | null;
  correctIndices?: number[] | null;
  answerText?: string | null;
};
type DraftTest = {
  title: string;
  description: string;
  questions: DraftQuestion[];
  model?: string;
};

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const templateCards: TemplateCard[] = [
  {
    id: "blank",
    label: "Пустая форма",
    caption: "Начните с нуля и настройте всё под себя.",
    title: "",
    description: "",
    accent: "from-slate-900 via-slate-700 to-slate-600",
  },
  {
    id: "quiz",
    label: "Мини‑тест",
    caption: "5–10 вопросов на быструю проверку.",
    title: "Мини‑тест",
    description: "Короткий тест для быстрой проверки знаний.",
    accent: "from-emerald-500 via-teal-500 to-sky-500",
  },
  {
    id: "midterm",
    label: "Мидтерм",
    caption: "Середина семестра, без спешки.",
    title: "Мидтерм",
    description: "Промежуточный контроль знаний.",
    accent: "from-sky-500 via-cyan-500 to-amber-400",
  },
  {
    id: "final",
    label: "Финальный экзамен",
    caption: "Итоговый тест с итоговыми оценками.",
    title: "Экзамен",
    description: "Финальный контроль по курсу.",
    accent: "from-amber-500 via-orange-500 to-rose-500",
  },
];

export default function TeacherTestsPage() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<string>("blank");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [genTitle, setGenTitle] = useState("");
  const [genTopic, setGenTopic] = useState("");
  const [genDescription, setGenDescription] = useState("");
  const [genMultipleCount, setGenMultipleCount] = useState(6);
  const [genMultiCount, setGenMultiCount] = useState(2);
  const [genTrueFalseCount, setGenTrueFalseCount] = useState(4);
  const [genLongCount, setGenLongCount] = useState(2);
  const [genOptionsCount, setGenOptionsCount] = useState(4);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genDraft, setGenDraft] = useState<DraftTest | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const heroPaint: CSSVars = {
    "--module-accent-1": "168 76% 64%",
    "--module-accent-2": "196 72% 60%",
    "--module-accent-3": "214 70% 62%",
  };
  const createPaint: CSSVars = {
    "--module-accent-1": "194 80% 78%",
    "--module-accent-2": "216 76% 72%",
    "--module-accent-3": "42 90% 72%",
  };
  const listPaint: CSSVars = {
    "--module-accent-1": "210 76% 78%",
    "--module-accent-2": "236 72% 74%",
    "--module-accent-3": "34 84% 72%",
  };
  const pagePaint: CSSVars = {
    "--aurora-accent-1": "223 92% 66%",
    "--aurora-accent-2": "260 82% 66%",
    "--aurora-accent-3": "308 76% 64%",
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/teacher/tests", { cache: "no-store" });
        if (!res.ok) throw new Error("Не удалось загрузить тесты");
        const j: { data: TestItem[] } = await res.json();
        if (!cancelled) setTests(j.data ?? []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyTemplate = (template: TemplateCard) => {
    setActiveTemplate(template.id);
    setTitle(template.title);
    setDescription(template.description);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/teacher/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) throw new Error("Не удалось создать тест");
      const j: { item: TestItem } = await res.json();
      setTests(prev => [j.item, ...prev]);
      setTitle("");
      setDescription("");
      setActiveTemplate("blank");
      window.location.href = `/teacher/tests/${j.item.id}/edit`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при создании");
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenError(null);
    setDraftError(null);
    setGenDraft(null);
    const total = genMultipleCount + genMultiCount + genTrueFalseCount + genLongCount;
    if (total <= 0) {
      setGenError("Укажите количество вопросов.");
      return;
    }
    if (!genTopic.trim() && !genTitle.trim()) {
      setGenError("Введите тему или название теста.");
      return;
    }
    setGenLoading(true);
    try {
      const res = await fetch("/api/teacher/tests/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: genTitle,
          topic: genTopic,
          description: genDescription,
          multipleCount: genMultipleCount,
          multiCount: genMultiCount,
          trueFalseCount: genTrueFalseCount,
          longCount: genLongCount,
          optionsCount: genOptionsCount,
          draft: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.draft) {
        const detail = data?.error ? String(data.error) : "Не удалось сгенерировать тест.";
        throw new Error(detail);
      }
      const draftQuestions: DraftQuestion[] = Array.isArray(data.draft?.questions)
        ? data.draft.questions.map((q: DraftQuestion) => ({
            id: makeId(),
            type: q.type || "multiple",
            text: q.text ?? "",
            options: Array.isArray(q.options) ? q.options : undefined,
            correctIndex: q.correctIndex ?? null,
            correctIndices: Array.isArray(q.correctIndices) ? q.correctIndices : null,
            answerText: q.answerText ?? null,
          }))
        : [];
      setGenDraft({
        title: typeof data.draft?.title === "string" ? data.draft.title : genTitle || genTopic || "Тест",
        description: typeof data.draft?.description === "string" ? data.draft.description : genDescription || "",
        questions: draftQuestions,
        model: typeof data?.model === "string" ? data.model : undefined,
      });
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "Ошибка генерации");
    } finally {
      setGenLoading(false);
    }
  };

  const updateDraftQuestion = (id: string, updates: Partial<DraftQuestion>) => {
    setGenDraft(prev =>
      prev ? { ...prev, questions: prev.questions.map(q => (q.id === id ? { ...q, ...updates } : q)) } : prev
    );
  };

  const updateDraftOption = (id: string, idx: number, value: string) => {
    setGenDraft(prev => {
      if (!prev) return prev;
      const nextQuestions = prev.questions.map(q => {
        if (q.id !== id) return q;
        const nextOptions = Array.isArray(q.options) ? [...q.options] : [];
        nextOptions[idx] = value;
        return { ...q, options: nextOptions };
      });
      return { ...prev, questions: nextQuestions };
    });
  };

  const addDraftOption = (id: string) => {
    setGenDraft(prev => {
      if (!prev) return prev;
      const nextQuestions = prev.questions.map(q => {
        if (q.id !== id) return q;
        const nextOptions = Array.isArray(q.options) ? [...q.options, ""] : [""];
        return { ...q, options: nextOptions };
      });
      return { ...prev, questions: nextQuestions };
    });
  };

  const removeDraftOption = (id: string, idx: number) => {
    setGenDraft(prev => {
      if (!prev) return prev;
      const nextQuestions = prev.questions.map(q => {
        if (q.id !== id) return q;
        const nextOptions = Array.isArray(q.options) ? [...q.options] : [];
        nextOptions.splice(idx, 1);
        let nextCorrect = q.correctIndex ?? null;
        let nextCorrectIndices = Array.isArray(q.correctIndices) ? [...q.correctIndices] : [];
        if (nextCorrect === idx) nextCorrect = null;
        if (nextCorrect != null && idx < nextCorrect) nextCorrect = nextCorrect - 1;
        if (nextCorrectIndices.length > 0) {
          nextCorrectIndices = nextCorrectIndices.filter(i => i !== idx).map(i => (i > idx ? i - 1 : i));
        }
        return {
          ...q,
          options: nextOptions,
          correctIndex: nextCorrect,
          correctIndices: nextCorrectIndices,
        };
      });
      return { ...prev, questions: nextQuestions };
    });
  };

  const toggleDraftCorrectIndex = (id: string, idx: number) => {
    setGenDraft(prev => {
      if (!prev) return prev;
      const nextQuestions = prev.questions.map(q => {
        if (q.id !== id) return q;
        const current = Array.isArray(q.correctIndices) ? q.correctIndices : [];
        const next = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx];
        return { ...q, correctIndices: next };
      });
      return { ...prev, questions: nextQuestions };
    });
  };

  const setDraftType = (id: string, type: DraftQuestion["type"]) => {
    setGenDraft(prev => {
      if (!prev) return prev;
      const nextQuestions = prev.questions.map(q => {
        if (q.id !== id) return q;
        if (type === "truefalse") {
          return { ...q, type, options: ["Верно", "Неверно"], correctIndex: q.correctIndex ?? null, correctIndices: null };
        }
        if (type === "long") {
          return { ...q, type, options: undefined, correctIndex: null, correctIndices: null };
        }
        if (type === "multi") {
          const opts = Array.isArray(q.options) ? q.options : ["", ""];
          return { ...q, type, options: opts, correctIndex: null, correctIndices: q.correctIndices ?? [] };
        }
        const opts = Array.isArray(q.options) ? q.options : ["", ""];
        return { ...q, type, options: opts, correctIndex: q.correctIndex ?? null, correctIndices: null };
      });
      return { ...prev, questions: nextQuestions };
    });
  };

  const removeDraftQuestion = (id: string) => {
    setGenDraft(prev => (prev ? { ...prev, questions: prev.questions.filter(q => q.id !== id) } : prev));
  };

  const handleCreateFromDraft = async () => {
    if (!genDraft) return;
    setDraftError(null);
    setDraftSaving(true);
    try {
      const titleValue = genDraft.title.trim();
      if (!titleValue) throw new Error("Укажите название теста.");
      for (const q of genDraft.questions) {
        const text = q.text.trim();
        if (!text) throw new Error("В черновике есть вопрос без текста.");
        if (q.type === "long") continue;
        const opts = (q.options ?? []).map(o => o.trim()).filter(Boolean);
        if (opts.length < 2) throw new Error("В одном из вопросов недостаточно вариантов ответа.");
        if (q.type === "multi") {
          if (!Array.isArray(q.correctIndices) || q.correctIndices.length === 0) {
            throw new Error("Для вопросов с несколькими правильными нужно отметить ответы.");
          }
        } else if (q.correctIndex == null) {
          throw new Error("Для вопросов с одним правильным нужно выбрать ответ.");
        }
      }
      const res = await fetch("/api/teacher/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleValue, description: genDraft.description }),
      });
      const j: { item: TestItem } = await res.json();
      if (!res.ok) throw new Error("Не удалось создать тест");
      const testId = j.item.id;
      for (const q of genDraft.questions) {
        const payload: Record<string, unknown> = { text: q.text };
        if (q.type === "long") {
          payload.options = null;
          payload.correctIndex = null;
          payload.correctIndices = null;
          payload.answerText = q.answerText ?? null;
        } else if (q.type === "truefalse") {
          payload.options = ["Верно", "Неверно"];
          payload.correctIndex = q.correctIndex ?? null;
          payload.correctIndices = null;
        } else if (q.type === "multi") {
          payload.options = (q.options ?? []).map(o => o.trim()).filter(Boolean);
          payload.correctIndices = Array.isArray(q.correctIndices) ? q.correctIndices : [];
          payload.correctIndex = null;
        } else {
          payload.options = (q.options ?? []).map(o => o.trim()).filter(Boolean);
          payload.correctIndex = q.correctIndex ?? null;
          payload.correctIndices = null;
        }
        await fetch(`/api/teacher/tests/${testId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      window.location.href = `/teacher/tests/${testId}/edit`;
    } catch (e: unknown) {
      setDraftError(e instanceof Error ? e.message : "Ошибка сохранения черновика");
    } finally {
      setDraftSaving(false);
    }
  };

  const filteredTests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tests.filter(test => {
      const matchesSearch = !q || test.title.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "draft" && !test.publishedAt) ||
        (statusFilter === "published" && !!test.publishedAt);
      return matchesSearch && matchesStatus;
    });
  }, [tests, search, statusFilter]);

  const draftsCount = tests.filter(t => !t.publishedAt).length;
  const publishedCount = tests.filter(t => t.publishedAt).length;

  return (
    <div className="page-aurora space-y-5 rounded-3xl p-1" style={pagePaint}>
      <Breadcrumbs
        items={[
          { label: "Инструменты", href: "/teacher/tools" },
          { label: "Тестирование" },
        ]}
      />

      <section
        className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-500 px-6 py-6 text-white shadow-lg"
        style={heroPaint}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-white/70">Конструктор тестов</p>
        <h1 className="mt-2 text-2xl font-bold">Создавайте тесты как захотите</h1>
        <p className="text-sm text-white/80">
          Шаблон → заголовок → вопросы. Создание теста занимает пару минут.
        </p>
      </section>

      <section className="rounded-2xl border bg-white/95 p-5 shadow-sm" style={createPaint}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Стартовый шаблон</h2>
            <p className="text-sm text-gray-600">Выберите шаблон или начните с чистого листа.</p>
          </div>
          <div className="rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-600">
            Шаг 1 из 2
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {templateCards.map(template => (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template)}
              className={`group flex h-full flex-col rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                activeTemplate === template.id ? "border-emerald-300 ring-2 ring-emerald-200" : "border-gray-200"
              }`}
            >
              <div className={`h-1.5 w-full rounded-full bg-gradient-to-r ${template.accent}`} />
              <div className="mt-3 text-sm font-semibold text-gray-900">{template.label}</div>
              <div className="mt-1 text-xs text-gray-600">{template.caption}</div>
              <div className="mt-auto pt-3 text-xs font-semibold text-emerald-700">
                Использовать →
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Генерация через Ollama</h3>
              <p className="text-sm text-gray-600">Авто‑тест с выбором, multi‑select, true/false и длинными ответами.</p>
            </div>
            <div className="rounded-full border bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
              AI
            </div>
          </div>

          <form onSubmit={handleGenerate} className="mt-4 grid gap-4 md:max-w-3xl">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide text-gray-500">Название (опционально)</span>
                <Input
                  value={genTitle}
                  onChange={e => setGenTitle(e.target.value)}
                  placeholder="Напр. Тест по органике"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide text-gray-500">Тема теста</span>
                <Input
                  value={genTopic}
                  onChange={e => setGenTopic(e.target.value)}
                  placeholder="Напр. Кислоты и основания"
                />
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-wide text-gray-500">Описание</span>
              <Textarea
                value={genDescription}
                onChange={e => setGenDescription(e.target.value)}
                placeholder="Короткое описание теста"
                className="min-h-20"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide text-gray-500">Вопросы с вариантами</span>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={genMultipleCount}
                  onChange={e => setGenMultipleCount(Number(e.target.value) || 0)}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide text-gray-500">Несколько правильных</span>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={genMultiCount}
                  onChange={e => setGenMultiCount(Number(e.target.value) || 0)}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide text-gray-500">True / False</span>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={genTrueFalseCount}
                  onChange={e => setGenTrueFalseCount(Number(e.target.value) || 0)}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide text-gray-500">Длинный ответ</span>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={genLongCount}
                  onChange={e => setGenLongCount(Number(e.target.value) || 0)}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-wide text-gray-500">Вариантов в вопросе</span>
                <Input
                  type="number"
                  min={2}
                  max={6}
                  value={genOptionsCount}
                  onChange={e => setGenOptionsCount(Number(e.target.value) || 4)}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={genLoading}>
                {genLoading ? "Генерируем..." : "Сгенерировать тест"}
              </Button>
              <span className="text-xs text-gray-500">
                Всего вопросов: {genMultipleCount + genMultiCount + genTrueFalseCount + genLongCount}
              </span>
              {genError && <span className="text-xs text-red-600">{genError}</span>}
            </div>
          </form>

          {genDraft && (
            <div className="mt-6 rounded-2xl border bg-white/95 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-semibold text-gray-900">Черновик теста</h4>
                  <p className="text-xs text-gray-500">
                    Отредактируйте вопросы перед сохранением.
                    {genDraft.model ? ` Модель: ${genDraft.model}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => setGenDraft(null)} disabled={draftSaving}>
                    Очистить
                  </Button>
                  <Button type="button" onClick={handleCreateFromDraft} disabled={draftSaving}>
                    {draftSaving ? "Сохраняем..." : "Создать тест"}
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Название</span>
                  <Input
                    value={genDraft.title}
                    onChange={e => setGenDraft(prev => (prev ? { ...prev, title: e.target.value } : prev))}
                    placeholder="Название теста"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs uppercase tracking-wide text-gray-500">Описание</span>
                  <Input
                    value={genDraft.description}
                    onChange={e => setGenDraft(prev => (prev ? { ...prev, description: e.target.value } : prev))}
                    placeholder="Короткое описание"
                  />
                </label>
              </div>

              {draftError && <div className="mt-3 text-sm text-red-600">{draftError}</div>}

              <div className="mt-4 space-y-3">
                {genDraft.questions.map((q, idx) => (
                  <div key={q.id} className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-gray-500">Вопрос {idx + 1}</div>
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-md border bg-white px-2 py-1 text-xs"
                          value={q.type}
                          onChange={e => setDraftType(q.id, e.target.value as DraftQuestion["type"])}
                        >
                          <option value="multiple">Один правильный</option>
                          <option value="multi">Несколько правильных</option>
                          <option value="truefalse">Верно / Неверно</option>
                          <option value="long">Длинный ответ</option>
                        </select>
                        <Button type="button" variant="secondary" onClick={() => removeDraftQuestion(q.id)}>
                          Удалить
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={q.text}
                      onChange={e => updateDraftQuestion(q.id, { text: e.target.value })}
                      className="mt-2 min-h-20"
                      placeholder="Текст вопроса"
                    />

                    {q.type === "long" ? (
                      <label className="mt-3 grid gap-1">
                        <span className="text-xs uppercase tracking-wide text-gray-500">Пример ответа</span>
                        <Textarea
                          value={q.answerText ?? ""}
                          onChange={e => updateDraftQuestion(q.id, { answerText: e.target.value })}
                          placeholder="Полный ответ для ориентира"
                        />
                      </label>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs text-gray-500">
                          {q.type === "multi" ? "Отметьте все правильные варианты." : "Выберите один правильный вариант."}
                        </div>
                        {(q.options ?? []).map((opt, optIdx) => (
                          <div key={`${q.id}-${optIdx}`} className="flex items-center gap-2">
                            {q.type === "multi" ? (
                              <input
                                type="checkbox"
                                checked={Array.isArray(q.correctIndices) && q.correctIndices.includes(optIdx)}
                                onChange={() => toggleDraftCorrectIndex(q.id, optIdx)}
                              />
                            ) : (
                              <input
                                type="radio"
                                name={`draft-${q.id}`}
                                checked={q.correctIndex === optIdx}
                                onChange={() => updateDraftQuestion(q.id, { correctIndex: optIdx, correctIndices: [] })}
                              />
                            )}
                            <Input
                              value={opt}
                              onChange={e => updateDraftOption(q.id, optIdx, e.target.value)}
                              placeholder={`Вариант ${optIdx + 1}`}
                            />
                            <Button type="button" onClick={() => removeDraftOption(q.id, optIdx)}>
                              Удалить
                            </Button>
                          </div>
                        ))}
                        {q.type !== "truefalse" && (
                          <Button type="button" onClick={() => addDraftOption(q.id)}>
                            Добавить вариант
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-amber-400" />
          <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:max-w-2xl">
            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-wide text-gray-500">Название теста</span>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="Напр. Контрольная №1"
                className="text-lg font-semibold"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-wide text-gray-500">Описание</span>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Что нужно помнить студентам? Тема, время, формат."
                className="min-h-24 text-base"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" className="bg-gray-900 text-white hover:bg-gray-800">
                Создать и перейти к вопросам
              </Button>
              <span className="text-xs text-gray-500">После создания откроется конструктор вопросов.</span>
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-2xl border bg-white/95 p-5 shadow-sm" style={listPaint}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Мои тесты</h2>
            <p className="text-sm text-gray-600">
              Черновики: {draftsCount} · Опубликованные: {publishedCount}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию"
              className="h-9 w-56"
            />
            <select
              className="h-9 rounded-md border bg-white px-3 text-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as "all" | "draft" | "published")}
            >
              <option value="all">Все</option>
              <option value="draft">Черновики</option>
              <option value="published">Опубликованные</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-gray-600">Загрузка…</div>
        ) : filteredTests.length === 0 ? (
          <div className="mt-4 text-sm text-gray-600">Пока нет тестов по заданным фильтрам.</div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {filteredTests.map(test => (
              <li key={test.id} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-gray-900">{test.title}</div>
                    {test.description && <div className="text-sm text-gray-600">{test.description}</div>}
                    <div className="mt-1 text-xs text-gray-500">
                      Создано {new Date(test.createdAt).toLocaleDateString("ru-RU")}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      test.publishedAt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {test.publishedAt ? "Опубликован" : "Черновик"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <Link
                    href={`/teacher/tests/${test.id}/edit`}
                    className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Открыть редактор
                  </Link>
                  <Link
                    href={`/teacher/tests/${test.id}/review`}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    Проверить работы
                  </Link>
                  {test.publicCode && (
                    <Link
                      href={`/tests/${test.publicCode}`}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Открыть ссылку
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      </section>
    </div>
  );
}

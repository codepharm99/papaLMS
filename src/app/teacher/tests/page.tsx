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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-context";

type Item = { id: string; test: { id: string; title: string }; dueAt?: number | null; status: string };

export default function StudentTestsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();
  const tr = (ru: string, en: string) => (language === "ru" ? ru : en);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/student/tests", { cache: "no-store" });
        if (!r.ok) throw new Error(tr("Не удалось загрузить назначения", "Failed to load assignments"));
        const j: { data: Item[] } = await r.json();
        if (!cancelled) setItems(j.data ?? []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : tr("Ошибка загрузки", "Load error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-6 py-5 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.3em] text-white/70">{tr("Тестирование", "Testing")}</p>
        <h1 className="mt-2 text-2xl font-bold">{tr("Мои тесты", "My tests")}</h1>
        <p className="text-sm text-white/80">
          {tr("Назначенные тесты, сроки и статусы попыток — всё здесь.", "Assigned tests, due dates, and statuses — all in one place.")}
        </p>
      </div>
      {loading ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">{tr("Загрузка…", "Loading...")}</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-6 text-sm text-gray-600">
          {tr("Назначенных тестов пока нет", "No assigned tests yet")}
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border bg-white shadow-sm">
          {items.map(a => (
            <li key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium text-gray-900">{a.test.title}</div>
                <div className="text-sm text-gray-600">
                  {tr("Статус", "Status")}: {a.status}
                  {a.dueAt ? ` · ${tr("Срок", "Due")}: ${new Date(a.dueAt).toLocaleString()}` : ""}
                </div>
              </div>
              <div>
                <Link href={`/student/tests/${a.id}`} className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1.5 text-sm text-white shadow hover:bg-indigo-700">
                  {a.status === "COMPLETED" ? tr("Открыть", "Open") : tr("Сдать", "Submit")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

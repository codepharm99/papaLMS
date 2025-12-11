"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { ScoreEntry } from "@/lib/generateScores";

type ApiResponse = { data: ScoreEntry[] };

export default function GradesPage() {
  const [items, setItems] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/grades", { cache: "no-store" });
        if (!res.ok) throw new Error("Не удалось загрузить оценки");
        const json: ApiResponse = await res.json();
        if (!cancelled) setItems(json.data ?? []);
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

  const average = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.round(items.reduce((acc, item) => acc + item.grade, 0) / items.length);
  }, [items]);

  const passedShare = useMemo(() => {
    if (items.length === 0) return 0;
    const passed = items.filter((i) => i.grade >= 70).length;
    return Math.round((passed / items.length) * 100);
  }, [items]);
  const tablePaint: CSSProperties = {
    "--module-accent-1": "213 86% 78%",
    "--module-accent-2": "190 80% 74%",
    "--module-accent-3": "171 74% 70%",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">Аналитика успеваемости (мок-данные)</p>
            <h1 className="text-3xl font-bold text-gray-900">Оценки</h1>
          </div>
          <div className="text-sm text-gray-600">
            {items.length > 0 ? `${items.length} записей` : "—"}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Средний балл" value={average ? `${average} / 100` : "—"} />
          <StatCard title="Успешных работ" value={`${passedShare}%`} />
          <StatCard title="Обновлено" value="Из мок-API /api/grades" />
        </div>

        <div
          className="module-illustration light overflow-hidden rounded-2xl border bg-white/95 shadow-sm"
          style={tablePaint}
        >
          <div className="border-b px-4 py-3">
            <h2 className="text-base font-semibold text-gray-800">Последние оценки</h2>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-gray-600">Загрузка…</div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">Нет данных.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <HeaderCell>Студент</HeaderCell>
                    <HeaderCell>Курс</HeaderCell>
                    <HeaderCell>Работа</HeaderCell>
                    <HeaderCell>Оценка</HeaderCell>
                    <HeaderCell>Тренд</HeaderCell>
                    <HeaderCell>Обновлено</HeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <DataCell>
                        <div className="font-medium text-gray-900">{row.student}</div>
                      </DataCell>
                      <DataCell>
                        <div className="text-sm text-gray-700">{row.course}</div>
                      </DataCell>
                      <DataCell>
                        <div className="text-sm text-gray-700">{row.assignment}</div>
                      </DataCell>
                      <DataCell>
                        <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                          {row.grade} / {row.maxGrade}
                        </span>
                      </DataCell>
                      <DataCell>
                        <TrendPill trend={row.trend} />
                      </DataCell>
                      <DataCell>
                        <div className="text-sm text-gray-600">
                          {new Date(row.updatedAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}
                        </div>
                      </DataCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  const accentMap: Record<string, [string, string, string]> = {
    "Средний балл": ["229 86% 78%", "258 78% 78%", "286 75% 74%"],
    "Успешных работ": ["163 74% 74%", "192 78% 72%", "151 72% 66%"],
    "Обновлено": ["34 92% 72%", "15 88% 68%", "47 80% 66%"],
  };
  const [a1, a2, a3] = accentMap[title] ?? ["220 16% 76%", "240 16% 74%", "200 16% 72%"];
  const paint: CSSProperties = {
    "--module-accent-1": a1,
    "--module-accent-2": a2,
    "--module-accent-3": a3,
  };
  return (
    <div
      className="module-illustration light rounded-xl border bg-white/95 px-4 py-3 shadow-sm"
      style={paint}
    >
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{children}</th>;
}

function DataCell({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-top">{children}</td>;
}

function TrendPill({ trend }: { trend: ScoreEntry["trend"] }) {
  const map: Record<ScoreEntry["trend"], { label: string; className: string }> = {
    up: { label: "Рост", className: "bg-green-50 text-green-700" },
    down: { label: "Падает", className: "bg-red-50 text-red-700" },
    steady: { label: "Стабильно", className: "bg-gray-100 text-gray-700" },
  };
  const { label, className } = map[trend];
  return <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${className}`}>{label}</span>;
}

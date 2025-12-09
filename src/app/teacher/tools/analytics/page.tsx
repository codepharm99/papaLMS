"use client";

import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

type AnalyticsData = {
  summary: {
    testsTotal: number;
    publishedTests: number;
    questionsTotal: number;
    avgQuestionsPerTest: number;
    assignmentsTotal: number;
    completedAssignments: number;
    completionRate: number;
    uniqueStudents: number;
    upcomingDue: number;
    guestAttemptsTotal: number;
    avgGuestScore: number;
  };
  status: { assigned: number; inProgress: number; completed: number };
  recentTests: Array<{
    id: string;
    title: string;
    createdAt: number;
    publishedAt?: number | null;
    questions: number;
    assignments: number;
    completedAssignments: number;
    completionRate: number;
    guestAttempts: number;
    avgGuestScore: number;
  }>;
  topStudents: Array<{ id: string; name: string; totalAssignments: number; completedAssignments: number }>;
};

type StatCardProps = { title: string; value: string; hint?: string };

const numberFmt = new Intl.NumberFormat("ru-RU");

const formatPercent = (value: number) => `${Math.round(value * 1000) / 10}%`;

function StatCard({ title, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-sm text-gray-600">{hint}</div>}
    </div>
  );
}

export default function TeacherAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/teacher/analytics", { cache: "no-store" });
        if (!res.ok) throw new Error("Не удалось загрузить аналитику");
        const j: { data: AnalyticsData } = await res.json();
        if (!cancelled) setData(j.data);
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

  const statusTotal = useMemo(() => {
    if (!data) return 0;
    return data.status.assigned + data.status.inProgress + data.status.completed;
  }, [data]);

  const nowLabel = useMemo(() => new Date().toLocaleString(), []);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Инструменты", href: "/teacher/tools" }, { label: "Аналитика" }]} />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Аналитика тестирования</h1>
        <p className="text-sm text-gray-600">
          Быстрый взгляд на создание тестов, назначение студентам и активность по публичным ссылкам.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-600">Загрузка аналитики…</div>
      ) : error ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-red-700 shadow-sm">{error}</div>
      ) : !data ? (
        <div className="text-sm text-gray-600">Нет данных для отображения.</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Создано тестов"
              value={numberFmt.format(data.summary.testsTotal)}
              hint={`${numberFmt.format(data.summary.publishedTests)} опубликовано`}
            />
            <StatCard
              title="Вопросов всего"
              value={numberFmt.format(data.summary.questionsTotal)}
              hint={`~${data.summary.avgQuestionsPerTest.toFixed(1)} на тест`}
            />
            <StatCard
              title="Назначения студентам"
              value={numberFmt.format(data.summary.assignmentsTotal)}
              hint={
                data.summary.assignmentsTotal === 0
                  ? "Ещё не выдавали назначений"
                  : `${formatPercent(data.summary.completionRate)} завершено`
              }
            />
            <StatCard
              title="Уникальные студенты"
              value={numberFmt.format(data.summary.uniqueStudents)}
              hint={
                data.summary.upcomingDue > 0
                  ? `Активных дедлайнов: ${data.summary.upcomingDue}`
                  : "Дедлайнов впереди нет"
              }
            />
            <StatCard
              title="Гостевые попытки"
              value={numberFmt.format(data.summary.guestAttemptsTotal)}
              hint={
                data.summary.guestAttemptsTotal === 0
                  ? "Публичные попытки ещё не отправляли"
                  : `Средний балл: ${formatPercent(data.summary.avgGuestScore)}`
              }
            />
            <StatCard
              title="Черновики"
              value={numberFmt.format(data.summary.testsTotal - data.summary.publishedTests)}
              hint="Не опубликованы, можно дополнять"
            />
          </div>

          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Статус назначений</h2>
                <p className="text-sm text-gray-600">
                  Как двигаются студенты по назначенным тестам.
                </p>
              </div>
              <div className="text-xs text-gray-500">Обновлено {nowLabel}</div>
            </div>
            {statusTotal === 0 ? (
              <div className="mt-3 text-sm text-gray-600">Пока нет назначенных тестов.</div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-gray-400"
                    style={{ width: `${(data.status.assigned / statusTotal) * 100}%` }}
                  />
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${(data.status.inProgress / statusTotal) * 100}%` }}
                  />
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${(data.status.completed / statusTotal) * 100}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                    Не начат: {numberFmt.format(data.status.assigned)}
                  </div>
                  <div className="flex items-center gap-2 text-amber-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    В процессе: {numberFmt.format(data.status.inProgress)}
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Завершено: {numberFmt.format(data.status.completed)}
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="lg:col-span-2 rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Последние тесты</h2>
                <div className="text-xs text-gray-500">до 5 последних</div>
              </div>
              {data.recentTests.length === 0 ? (
                <div className="mt-3 text-sm text-gray-600">Тестов пока нет.</div>
              ) : (
                <div className="mt-3 space-y-3">
                  {data.recentTests.map(test => (
                    <div key={test.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-gray-500">
                            {test.publishedAt ? "Опубликован" : "Черновик"}
                          </div>
                          <div className="text-base font-semibold text-gray-900">{test.title}</div>
                          <div className="text-xs text-gray-500">
                            Создан {new Date(test.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-semibold text-gray-900">{formatPercent(test.completionRate)}</div>
                          <div className="text-xs text-gray-500">завершено</div>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-gray-500">Вопросов</div>
                          <div className="text-base font-semibold">{numberFmt.format(test.questions)}</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-gray-500">Назначений</div>
                          <div className="text-base font-semibold">
                            {numberFmt.format(test.completedAssignments)} / {numberFmt.format(test.assignments)}
                          </div>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-gray-500">Гостевые попытки</div>
                          <div className="text-base font-semibold">
                            {numberFmt.format(test.guestAttempts)} · {formatPercent(test.avgGuestScore)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Активные студенты</h2>
              <p className="text-sm text-gray-600">Больше всего завершённых назначений.</p>
              {data.topStudents.length === 0 ? (
                <div className="mt-3 text-sm text-gray-600">Статистики по студентам пока нет.</div>
              ) : (
                <div className="mt-3 space-y-3">
                  {data.topStudents.map(student => {
                    const ratio =
                      student.totalAssignments === 0
                        ? 0
                        : Math.min(student.completedAssignments / student.totalAssignments, 1);
                    return (
                      <div key={student.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <div className="font-semibold text-gray-900">{student.name}</div>
                          <div className="text-xs text-gray-600">
                            {numberFmt.format(student.completedAssignments)} /{" "}
                            {numberFmt.format(student.totalAssignments)}
                          </div>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${ratio * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}


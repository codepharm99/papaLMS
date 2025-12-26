"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
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

type StudentItem = { id: string; name: string };

type StudentAnalytics = {
  student: { id: string; name: string };
  summary: {
    totalAssignments: number;
    completedAssignments: number;
    completionRate: number;
    scoredAssignments: number;
    avgScore: number;
    bestScore: number;
    worstScore: number;
    lastCompletedAt?: number | null;
  };
  completed: Array<{
    id: string;
    testId: string;
    title: string;
    score: number | null;
    total: number | null;
    percent: number | null;
    completedAt?: number | null;
    assignedAt: number;
    dueAt?: number | null;
  }>;
};

type KpiTileProps = { title: string; value: string; hint?: string; accent: string };

const numberFmt = new Intl.NumberFormat("ru-RU");

const formatPercent = (value: number) => `${Math.round(value * 1000) / 10}%`;

function KpiTile({ title, value, hint, accent }: KpiTileProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-white/95 p-3 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-gray-600">{hint}</div>}
    </div>
  );
}

export default function TeacherAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowLabel, setNowLabel] = useState("");
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentId, setStudentId] = useState("");
  const [studentData, setStudentData] = useState<StudentAnalytics | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const pagePaint: CSSProperties = {
    "--aurora-accent-1": "210 92% 66%",
    "--aurora-accent-2": "255 82% 66%",
    "--aurora-accent-3": "312 76% 64%",
  };

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

  useEffect(() => {
    let cancelled = false;
    async function loadStudents() {
      try {
        const res = await fetch("/api/teacher/students", { cache: "no-store" });
        if (!res.ok) throw new Error("Не удалось загрузить список студентов");
        const j: { data: StudentItem[] } = await res.json();
        if (!cancelled) {
          const items = j.data ?? [];
          setStudents(items);
          setStudentId(prev => prev || items[0]?.id || "");
        }
      } catch (e: unknown) {
        if (!cancelled) setStudentError(e instanceof Error ? e.message : "Ошибка загрузки студентов");
      }
    }
    loadStudents();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!studentId) {
      setStudentData(null);
      setStudentError(null);
      return;
    }
    let cancelled = false;
    async function loadStudentAnalytics() {
      setStudentLoading(true);
      setStudentError(null);
      setStudentData(null);
      try {
        const res = await fetch(`/api/teacher/analytics/student?studentId=${encodeURIComponent(studentId)}`, { cache: "no-store" });
        const j: { data?: StudentAnalytics; error?: string } = await res.json().catch(() => ({}));
        if (!res.ok || !j.data) {
          const detail = j.error || "Не удалось загрузить аналитику студента";
          throw new Error(detail);
        }
        if (!cancelled) setStudentData(j.data);
      } catch (e: unknown) {
        if (!cancelled) setStudentError(e instanceof Error ? e.message : "Ошибка загрузки аналитики");
      } finally {
        if (!cancelled) setStudentLoading(false);
      }
    }
    loadStudentAnalytics();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const statusTotal = useMemo(() => {
    if (!data) return 0;
    return data.status.assigned + data.status.inProgress + data.status.completed;
  }, [data]);

  const avgAssignmentsPerStudent = useMemo(() => {
    if (!data || data.summary.uniqueStudents === 0) return 0;
    return data.summary.assignmentsTotal / data.summary.uniqueStudents;
  }, [data]);

  const avgCompletedPerStudent = useMemo(() => {
    if (!data || data.summary.uniqueStudents === 0) return 0;
    return data.summary.completedAssignments / data.summary.uniqueStudents;
  }, [data]);

  const statusItems = useMemo(() => {
    if (!data) return [];
    const total = statusTotal || 1;
    return [
      {
        key: "assigned",
        label: "Не начат",
        value: data.status.assigned,
        dot: "bg-slate-500",
        badge: "text-slate-700",
        badgeBg: "bg-slate-100",
      },
      {
        key: "inProgress",
        label: "В процессе",
        value: data.status.inProgress,
        dot: "bg-amber-500",
        badge: "text-amber-700",
        badgeBg: "bg-amber-50",
      },
      {
        key: "completed",
        label: "Завершено",
        value: data.status.completed,
        dot: "bg-emerald-500",
        badge: "text-emerald-700",
        badgeBg: "bg-emerald-50",
      },
    ].map(item => ({
      ...item,
      percent: (item.value / total) * 100,
      percentLabel: formatPercent(item.value / total),
    }));
  }, [data, statusTotal]);

  useEffect(() => {
    setNowLabel(new Date().toLocaleString("ru-RU"));
  }, []);

  return (
    <div className="page-aurora space-y-6 rounded-3xl p-1" style={pagePaint}>
      <Breadcrumbs items={[{ label: "Инструменты", href: "/teacher/tools" }, { label: "Аналитика" }]} />

      <section className="rounded-2xl border bg-slate-950 px-5 py-4 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">Teacher Analytics</p>
            <h1 className="mt-2 text-2xl font-semibold">Аналитика тестирования</h1>
            <p className="text-sm text-white/70">
              KPI, статус назначений и таблицы активности по тестам и студентам.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            <div>Обновлено</div>
            <div className="mt-1 text-sm font-semibold text-white">{nowLabel || "—"}</div>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border bg-white/90 p-5 text-sm text-gray-600 shadow-sm">
          Загрузка аналитики…
        </section>
      ) : error ? (
        <section className="rounded-2xl border bg-white/90 p-5 text-sm text-red-700 shadow-sm">{error}</section>
      ) : !data ? (
        <section className="rounded-2xl border bg-white/90 p-5 text-sm text-gray-600 shadow-sm">
          Нет данных для отображения.
        </section>
      ) : (
        <>
          <section className="rounded-2xl border bg-white/95 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">KPI-лента по студентам</h2>
                <p className="text-xs text-gray-500">Только про сдачу и активность студентов.</p>
              </div>
              <div className="text-xs text-gray-500">Всего показателей: 8</div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <KpiTile
                title="Уникальные студенты"
                value={numberFmt.format(data.summary.uniqueStudents)}
                hint="Получили назначения"
                accent="from-indigo-500 via-sky-500 to-emerald-400"
              />
              <KpiTile
                title="Назначений всего"
                value={numberFmt.format(data.summary.assignmentsTotal)}
                hint="По студентам"
                accent="from-amber-500 via-orange-500 to-rose-500"
              />
              <KpiTile
                title="Завершено назначений"
                value={numberFmt.format(data.summary.completedAssignments)}
                hint={`${formatPercent(data.summary.completionRate)} выполнения`}
                accent="from-emerald-500 via-teal-500 to-sky-500"
              />
              <KpiTile
                title="В процессе"
                value={numberFmt.format(data.status.inProgress)}
                hint={
                  statusTotal === 0 ? "0% от всех" : `${formatPercent(data.status.inProgress / statusTotal)} от всех`
                }
                accent="from-amber-400 via-orange-500 to-red-500"
              />
              <KpiTile
                title="Не начато"
                value={numberFmt.format(data.status.assigned)}
                hint={statusTotal === 0 ? "0% от всех" : `${formatPercent(data.status.assigned / statusTotal)} от всех`}
                accent="from-slate-500 via-gray-500 to-zinc-500"
              />
              <KpiTile
                title="Активных дедлайнов"
                value={numberFmt.format(data.summary.upcomingDue)}
                hint="Ожидают сдачи"
                accent="from-blue-500 via-indigo-500 to-purple-500"
              />
              <KpiTile
                title="Назначений на студента"
                value={numberFmt.format(Math.round(avgAssignmentsPerStudent * 10) / 10)}
                hint="В среднем"
                accent="from-cyan-500 via-sky-500 to-indigo-500"
              />
              <KpiTile
                title="Сдано на студента"
                value={numberFmt.format(Math.round(avgCompletedPerStudent * 10) / 10)}
                hint="В среднем"
                accent="from-emerald-600 via-lime-500 to-amber-400"
              />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-4">
            <section className="rounded-2xl border bg-white/95 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Статус назначений</h2>
                  <p className="text-xs text-gray-500">Распределение по этапам.</p>
                </div>
                <div className="text-xs text-gray-500">Всего: {numberFmt.format(statusTotal)}</div>
              </div>
              {statusTotal === 0 ? (
                <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-gray-600">
                  Пока нет назначенных тестов.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {statusItems.map(item => (
                      <div key={item.key} className="rounded-xl border bg-slate-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-gray-600">
                            <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                            <span className="uppercase tracking-wide">{item.label}</span>
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.badge} ${item.badgeBg}`}>
                            {item.percentLabel}
                          </span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-lg font-semibold text-gray-900">
                            {numberFmt.format(item.value)}
                          </span>
                          <span className="text-xs text-gray-500">из {numberFmt.format(statusTotal)}</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">Доля: {item.percentLabel}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

              <section className="rounded-2xl border bg-white/95 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-gray-900">Последние тесты</h2>
                  <div className="text-xs text-gray-500">до 5 последних</div>
                </div>
                {data.recentTests.length === 0 ? (
                  <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-gray-600">Тестов пока нет.</div>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                          <th className="py-2 pr-4">Тест</th>
                          <th className="py-2 pr-4 text-right">Вопросы</th>
                          <th className="py-2 pr-4 text-right">Назначения</th>
                          <th className="py-2 pr-4">Завершение</th>
                          <th className="py-2 text-right">Гости</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentTests.map(test => {
                          const completion = Math.min(Math.max(test.completionRate, 0), 1);
                          return (
                            <tr key={test.id} className="border-b last:border-b-0">
                              <td className="py-3 pr-4">
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold text-gray-900">{test.title}</span>
                                  <span
                                    className={`text-[11px] uppercase tracking-wide ${
                                      test.publishedAt ? "text-emerald-700" : "text-amber-700"
                                    }`}
                                  >
                                    {test.publishedAt ? "Опубликован" : "Черновик"} ·{" "}
                                    {new Date(test.createdAt).toLocaleDateString("ru-RU")}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-right font-semibold text-gray-900">
                                {numberFmt.format(test.questions)}
                              </td>
                              <td className="py-3 pr-4 text-right">
                                <div className="text-sm font-semibold text-gray-900">
                                  {numberFmt.format(test.completedAssignments)} / {numberFmt.format(test.assignments)}
                                </div>
                                <div className="text-[11px] text-gray-500">выполнено</div>
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-28 rounded-full bg-gray-100">
                                    <div
                                      className="h-2 rounded-full bg-emerald-500"
                                      style={{ width: `${completion * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-gray-700">
                                    {formatPercent(completion)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 text-right">
                                <div className="text-sm font-semibold text-gray-900">
                                  {numberFmt.format(test.guestAttempts)}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  средний: {formatPercent(test.avgGuestScore)}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-2xl border bg-white/95 p-5 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">Активные студенты</h2>
                <p className="text-xs text-gray-500">Топ по завершённым назначениям.</p>
                {data.topStudents.length === 0 ? (
                  <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-gray-600">
                    Статистики по студентам пока нет.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {data.topStudents.map(student => {
                      const ratio =
                        student.totalAssignments === 0
                          ? 0
                          : Math.min(student.completedAssignments / student.totalAssignments, 1);
                      return (
                        <div key={student.id} className="rounded-xl border bg-white p-3 shadow-sm">
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

              <section className="rounded-2xl border bg-white/95 p-5 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900">Гостевые результаты</h2>
                <p className="text-xs text-gray-500">Сводка по публичным попыткам.</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Попытки</span>
                    <span className="font-semibold text-gray-900">
                      {numberFmt.format(data.summary.guestAttemptsTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Средний балл</span>
                    <span className="font-semibold text-gray-900">
                      {formatPercent(data.summary.avgGuestScore)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-fuchsia-500"
                      style={{ width: `${Math.min(Math.max(data.summary.avgGuestScore, 0), 1) * 100}%` }}
                    />
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <section className="rounded-2xl border bg-white/95 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Аналитика по студенту</h2>
                <p className="text-xs text-gray-500">Список пройденных экзаменов и статистика оценок.</p>
                {studentData && (
                  <div className="mt-1 text-xs text-gray-500">
                    Студент: <span className="font-semibold text-gray-900">{studentData.student.name}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <label htmlFor="student-select">Студент</label>
                <select
                  id="student-select"
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  disabled={students.length === 0}
                  className="rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-900 disabled:opacity-60"
                >
                  <option value="">Выберите студента</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {studentLoading ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-gray-600">
                Загружаем аналитику студента…
              </div>
            ) : studentError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {studentError}
              </div>
            ) : !studentData ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-gray-600">
                Выберите студента, чтобы увидеть результаты.
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Пройдено экзаменов</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {numberFmt.format(studentData.summary.completedAssignments)}
                    </div>
                    <div className="text-xs text-gray-500">
                      из {numberFmt.format(studentData.summary.totalAssignments)}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Completion rate</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {formatPercent(studentData.summary.completionRate)}
                    </div>
                    <div className="text-xs text-gray-500">по назначениям</div>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Средний результат</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {studentData.summary.scoredAssignments > 0
                        ? formatPercent(studentData.summary.avgScore)
                        : "—"}
                    </div>
                    <div className="text-xs text-gray-500">по сданным</div>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Лучший / худший</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {studentData.summary.scoredAssignments > 0
                        ? `${formatPercent(studentData.summary.bestScore)} / ${formatPercent(studentData.summary.worstScore)}`
                        : "—"}
                    </div>
                    <div className="text-xs text-gray-500">по экзаменам</div>
                  </div>
                  <div className="rounded-xl border bg-slate-50 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500">Последняя сдача</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {studentData.summary.lastCompletedAt
                        ? new Date(studentData.summary.lastCompletedAt).toLocaleDateString("ru-RU")
                        : "—"}
                    </div>
                    <div className="text-xs text-gray-500">дата</div>
                  </div>
                </div>

                {studentData.completed.length === 0 ? (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-gray-600">
                    Пока нет пройденных экзаменов.
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                          <th className="py-2 pr-4">Экзамен</th>
                          <th className="py-2 pr-4 text-right">Баллы</th>
                          <th className="py-2 pr-4 text-right">Процент</th>
                          <th className="py-2 pr-4">Сдан</th>
                          <th className="py-2">Дедлайн</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentData.completed.map(item => (
                          <tr key={item.id} className="border-b last:border-b-0">
                            <td className="py-3 pr-4">
                              <div className="font-semibold text-gray-900">{item.title}</div>
                            </td>
                            <td className="py-3 pr-4 text-right">
                              {item.score != null && item.total != null
                                ? `${numberFmt.format(item.score)} / ${numberFmt.format(item.total)}`
                                : "—"}
                            </td>
                            <td className="py-3 pr-4 text-right font-semibold text-gray-900">
                              {item.percent != null ? formatPercent(item.percent) : "—"}
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              {item.completedAt
                                ? new Date(item.completedAt).toLocaleDateString("ru-RU")
                                : "—"}
                            </td>
                            <td className="py-3 text-gray-600">
                              {item.dueAt ? new Date(item.dueAt).toLocaleDateString("ru-RU") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

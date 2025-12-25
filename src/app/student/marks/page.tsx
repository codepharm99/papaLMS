"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

type WeeklyScoreRow = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  week: number;
  part: number;
  lectureScore: number;
  practiceScore: number;
  individualWorkScore: number;
  ratingScore?: number | null;
  midtermScore?: number | null;
  examScore?: number | null;
};

type CourseOption = { id: string; code: string; title: string };
type ColumnKey = "lecture" | "practice" | "individual" | "rating" | "midterm" | "exam";

export default function StudentMarksPage() {
  const [data, setData] = useState<WeeklyScoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [selectedPart, setSelectedPart] = useState<string>("all");
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    lecture: true,
    practice: true,
    individual: true,
    rating: true,
    midterm: true,
    exam: true,
  });
  const heroPaint: CSSProperties = {
    "--module-accent-1": "216 90% 68%",
    "--module-accent-2": "245 86% 66%",
    "--module-accent-3": "286 80% 66%",
  };
  const panelPaint: CSSProperties = {
    "--module-accent-1": "226 84% 78%",
    "--module-accent-2": "252 78% 74%",
    "--module-accent-3": "294 76% 70%",
  };
  const pagePaint: CSSProperties = {
    "--aurora-accent-1": "223 92% 66%",
    "--aurora-accent-2": "260 82% 66%",
    "--aurora-accent-3": "308 76% 64%",
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/student/weekly-scores", { cache: "no-store" });
        if (!res.ok) {
          const errText = res.status === 401 ? "Нужно войти." : res.status === 403 ? "Доступ запрещён." : "Не удалось загрузить оценки.";
          throw new Error(errText);
        }
        const j = await res.json().catch(() => ({}));
        const items = Array.isArray(j?.items) ? (j.items as WeeklyScoreRow[]) : [];
        setData(items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить оценки.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const courses: CourseOption[] = useMemo(() => {
    const map = new Map<string, CourseOption>();
    for (const row of data) {
      if (!map.has(row.courseId)) {
        map.set(row.courseId, { id: row.courseId, code: row.courseCode, title: row.courseTitle });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [data]);

  useEffect(() => {
    if (selectedCourse !== "all" && !courses.some(course => course.id === selectedCourse)) {
      setSelectedCourse("all");
    }
  }, [courses, selectedCourse]);

  const columnDefs = useMemo(
    () =>
      [
        { key: "lecture" as const, label: "Лекция", get: (row: WeeklyScoreRow) => row.lectureScore },
        { key: "practice" as const, label: "Практика", get: (row: WeeklyScoreRow) => row.practiceScore },
        { key: "individual" as const, label: "Инд. работа", get: (row: WeeklyScoreRow) => row.individualWorkScore },
        { key: "rating" as const, label: "Рейтинг", get: (row: WeeklyScoreRow) => row.ratingScore },
        { key: "midterm" as const, label: "Мидтерм", get: (row: WeeklyScoreRow) => row.midtermScore },
        { key: "exam" as const, label: "Экзамен", get: (row: WeeklyScoreRow) => row.examScore },
      ].filter(column => visibleColumns[column.key]),
    [visibleColumns]
  );

  const filteredRows = useMemo(() => {
    const weekValue = selectedWeek === "all" ? null : Number(selectedWeek);
    const partValue = selectedPart === "all" ? null : Number(selectedPart);
    return data
      .filter(row => (selectedCourse === "all" || row.courseId === selectedCourse))
      .filter(row => (weekValue === null || row.week === weekValue))
      .filter(row => (partValue === null || row.part === partValue))
      .sort((a, b) => {
        const course = a.courseTitle.localeCompare(b.courseTitle);
        if (course !== 0) return course;
        if (a.week !== b.week) return a.week - b.week;
        return a.part - b.part;
      });
  }, [data, selectedCourse, selectedWeek, selectedPart]);

  const showCourseColumn = selectedCourse === "all";
  const hasData = data.length > 0;
  const showEmptyState = !loading && !error && !hasData;
  const showFilteredEmptyState = !loading && !error && hasData && filteredRows.length === 0;
  const formatScore = (value?: number | null) => (value === null || value === undefined ? "—" : value);
  const weekOptions = Array.from({ length: 14 }, (_, index) => index + 1);
  const resetFilters = () => {
    setSelectedCourse("all");
    setSelectedWeek("all");
    setSelectedPart("all");
    setVisibleColumns({
      lecture: true,
      practice: true,
      individual: true,
      rating: true,
      midterm: true,
      exam: true,
    });
  };
  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="page-aurora space-y-5 rounded-3xl p-1" style={pagePaint}>
      <Breadcrumbs
        items={[
          { label: "Мои курсы", href: "/catalog?mine=1" },
          { label: "Оценки" },
        ]}
      />

      <div
        className="rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-5 text-white shadow-lg"
        style={heroPaint}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-white/70">Успеваемость</p>
        <h1 className="mt-2 text-2xl font-bold">Мои оценки</h1>
        <p className="text-sm text-white/80">
          Таблица по неделям с разбивкой по типам занятий. Отфильтруйте только нужные оценки.
        </p>
      </div>

      <div className="rounded-2xl border bg-white/95 p-4 shadow-sm" style={panelPaint}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium text-gray-700">
              Курс
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                disabled={loading || courses.length === 0}
              >
                <option value="all">Все курсы</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">
              Неделя
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                disabled={loading}
              >
                <option value="all">Все недели</option>
                {weekOptions.map(week => (
                  <option key={week} value={String(week)}>
                    Неделя {week}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">
              Часть
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                disabled={loading}
              >
                <option value="all">Все части</option>
                <option value="1">Часть 1</option>
                <option value="2">Часть 2</option>
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-gray-500">Показывать оценки</div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "lecture", label: "Лекция" },
                  { key: "practice", label: "Практика" },
                  { key: "individual", label: "Инд. работа" },
                  { key: "rating", label: "Рейтинг" },
                  { key: "midterm", label: "Мидтерм" },
                  { key: "exam", label: "Экзамен" },
                ] as const
              ).map(item => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-gray-600"
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-indigo-600"
                    checked={visibleColumns[item.key]}
                    onChange={() => toggleColumn(item.key)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>
            Строк: <span className="font-semibold text-gray-700">{filteredRows.length}</span>
          </span>
          <span>
            Курсов: <span className="font-semibold text-gray-700">{courses.length}</span>
          </span>
          <span>Мидтерм обычно на 7-й неделе, экзамен — на 14-й.</span>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Сбросить фильтры
          </button>
        </div>
      </div>

      {loading && <div className="rounded-2xl border bg-white/95 p-4 text-sm text-gray-600">Загрузка…</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {showEmptyState && (
        <div className="rounded-2xl border border-dashed bg-white/95 p-6 text-sm text-gray-600">
          Нет данных об оценках.
        </div>
      )}

      {showFilteredEmptyState && (
        <div className="rounded-2xl border border-dashed bg-white/95 p-6 text-sm text-gray-600">
          По выбранным фильтрам ничего не найдено. Попробуйте сбросить фильтры.
        </div>
      )}

      {!loading && !error && filteredRows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border bg-white/95 shadow-sm">
          <table className="min-w-[860px] w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
                {showCourseColumn && <th className="px-4 py-3 text-left">Курс</th>}
                <th className="px-4 py-3 text-left">Неделя</th>
                <th className="px-4 py-3 text-left">Часть</th>
                {columnDefs.map(column => (
                  <th key={column.key} className="px-4 py-3 text-left">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(row => (
                <tr key={`${row.courseId}-w${row.week}-p${row.part}`} className="hover:bg-slate-50/80">
                  {showCourseColumn && (
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.courseTitle}</div>
                      <div className="text-xs text-gray-500">{row.courseCode}</div>
                    </td>
                  )}
                  <td className="px-4 py-3 font-semibold text-gray-900">{row.week}</td>
                  <td className="px-4 py-3 text-gray-600">{row.part}</td>
                  {columnDefs.map(column => (
                    <td key={column.key} className="px-4 py-3 text-gray-900">
                      {formatScore(column.get(row))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

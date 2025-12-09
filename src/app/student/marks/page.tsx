"use client";

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

type CourseGroup = {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  rows: WeeklyScoreRow[];
};

export default function StudentMarksPage() {
  const [data, setData] = useState<WeeklyScoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const grouped: CourseGroup[] = useMemo(() => {
    const map = new Map<string, CourseGroup>();
    for (const row of data) {
      if (!map.has(row.courseId)) {
        map.set(row.courseId, { courseId: row.courseId, courseCode: row.courseCode, courseTitle: row.courseTitle, rows: [] });
      }
      map.get(row.courseId)?.rows.push(row);
    }
    return Array.from(map.values());
  }, [data]);

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Мои курсы", href: "/catalog?mine=1" },
          { label: "Оценки" },
        ]}
      />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Мои оценки</h1>
        <p className="text-sm text-gray-600">Таблица баллов по неделям: лекции, практики, индивидуальная работа, а также рейтинг, мидтерм (7 неделя) и экзамен (14 неделя).</p>
      </div>

      {loading && <div className="text-sm text-gray-500">Загрузка...</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!loading && !error && grouped.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-gray-500">Нет данных об оценках.</div>
      )}

      <div className="space-y-4">
        {grouped.map(course => (
          <div key={course.courseId} className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">{course.courseCode}</div>
                <div className="text-lg font-semibold">{course.courseTitle}</div>
              </div>
            </div>
            <div className="space-y-2">
              {course.rows.map(r => (
                <div key={`${course.courseId}-w${r.week}`} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="font-semibold text-gray-900">Неделя {r.week}</div>
                    <div className="text-xs text-gray-500">Часть {r.part}</div>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Лекция</dt>
                      <dd className="font-semibold text-gray-900">{r.lectureScore}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Практика</dt>
                      <dd className="font-semibold text-gray-900">{r.practiceScore}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Инд. работа</dt>
                      <dd className="font-semibold text-gray-900">{r.individualWorkScore}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Рейтинг</dt>
                      <dd className="font-semibold text-gray-900">{r.ratingScore ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Мидтерм (7)</dt>
                      <dd className="font-semibold text-gray-900">{r.midtermScore ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Экзамен (14)</dt>
                      <dd className="font-semibold text-gray-900">{r.examScore ?? "—"}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CourseCard, { type CourseVM } from "@/components/CourseCard";
import { useCurrentUser } from "@/components/user-context";
import { useLanguage } from "@/components/language-context";

export default function StudentCoursesPage() {
  const { user } = useCurrentUser();
  const { language } = useLanguage();
  const tr = (ru: string, en: string) => (language === "ru" ? ru : en);
  const [items, setItems] = useState<CourseVM[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heroPaint: CSSProperties = {
    "--module-accent-1": "224 92% 68%",
    "--module-accent-2": "281 82% 68%",
    "--module-accent-3": "325 78% 66%",
  };
  const emptyPaint: CSSProperties = {
    "--module-accent-1": "205 80% 78%",
    "--module-accent-2": "192 76% 72%",
    "--module-accent-3": "178 70% 70%",
  };
  const pagePaint: CSSProperties = {
    "--aurora-accent-1": "223 92% 66%",
    "--aurora-accent-2": "260 82% 66%",
    "--aurora-accent-3": "308 76% 64%",
  };

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("mine", "1");
    return `/api/courses?${p.toString()}`;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(query, { cache: "no-store" });
    setLoading(false);
    if (res.status === 401) {
      setError(tr("Нужно войти.", "You need to log in."));
      return;
    }
    if (!res.ok) {
      setError(tr("Не удалось загрузить курсы", "Failed to load courses"));
      return;
    }
    const data = await res.json();
    setItems(data.items ?? []);
  }, [query, language]);

  useEffect(() => {
    if (user?.role !== "STUDENT") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [user, load]);

  if (!user) {
    return <div className="text-gray-500">{tr("Нужно войти.", "You need to log in.")}</div>;
  }

  if (user.role !== "STUDENT") {
    return <div className="text-gray-500">{tr("Раздел доступен только студентам.", "Section available to students only.")}</div>;
  }
  return (
    <section className="page-aurora space-y-5 rounded-3xl p-1" style={pagePaint}>
      <div
        className="rounded-3xl bg-gradient-to-br from-indigo-800 via-purple-800 to-fuchsia-700 px-6 py-5 text-white shadow-lg"
        style={heroPaint}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-white/70">{tr("Лента студента", "Student feed")}</p>
        <h1 className="mt-2 text-2xl font-bold">{tr("Мои курсы", "My courses")}</h1>
        <p className="text-sm text-white/80">
          {tr("Следите за записанными курсами и подключайтесь к новым.", "Track your enrolled courses and join new ones.")}
        </p>
      </div>
      {loading && <div className="rounded-2xl border bg-white/95 p-4 text-sm text-gray-600">{tr("Загрузка...", "Loading...")}</div>}

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {!loading && !error && items && items.filter((course) => course.isEnrolled).length === 0 && (
        <div
          className="rounded-2xl border border-dashed bg-white/95 p-6 shadow-sm"
          style={emptyPaint}
        >
          <p className="font-medium text-gray-900">{tr("Пока нет записанных курсов.", "No enrolled courses yet.")}</p>
          <p className="mt-1 text-sm text-gray-600">
            {tr("Загляните в каталог, чтобы выбрать и записаться на подходящие курсы.", "Browse the catalog to pick and join courses.")}
          </p>
          <Link
            href="/catalog"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {tr("Открыть каталог курсов", "Open course catalog")}
          </Link>
        </div>
      )}

      {!loading && !error && items && items.filter((course) => course.isEnrolled).length > 0 && (
        <div className="grid grid-cols-1 gap-4 rounded-3xl border p-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.filter((course) => course.isEnrolled).map((course) => (
            <CourseCard
              key={course.id}
              data={course}
              onChanged={(next) =>
                setItems(prev => prev ? prev.map(item => (item.id === next.id ? next : item)) : prev)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

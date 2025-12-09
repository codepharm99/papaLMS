"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/components/user-context";
import { useLanguage } from "@/components/language-context";

export type CourseVM = {
  id: string;
  code: string;
  title: string;
  orgTag: string;
  teacherId: string;
  enrolledCount: number;
  isEnrolled: boolean;
};

export default function CourseCard({
  data,
  onChanged,
}: {
  data: CourseVM;
  onChanged?: (next: CourseVM) => void;
}) {
  const [isPending, start] = useTransition();
  const { user } = useCurrentUser();
  const { language } = useLanguage();
  const isStudent = user?.role === "STUDENT";
  const restrictEnroll = !!user && !isStudent;
  const tr = (ru: string, en: string) => (language === "ru" ? ru : en);

  const toggle = () => {
    if (restrictEnroll) return;

    start(async () => {
      // optimistic
      onChanged?.({
        ...data,
        isEnrolled: !data.isEnrolled,
        enrolledCount: data.isEnrolled ? data.enrolledCount - 1 : data.enrolledCount + 1,
      });

      const res = await fetch(`/api/courses/${data.id}/enroll`, { method: "POST" });
      if (!res.ok) {
        // откат при ошибке
        onChanged?.(data);
        if (res.status === 401) window.location.href = "/login";
        return;
      }
      const { item } = await res.json();
      onChanged?.(item);
    });
  };

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-indigo-50 bg-gradient-to-br from-white via-indigo-50/40 to-white p-5 shadow-lg shadow-indigo-100/50 transition-transform hover:-translate-y-0.5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.1),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.08),transparent_35%)]" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wide">
          {data.code}
        </div>
        <span className="text-[11px] text-gray-500 rounded-full border px-2 py-1 bg-white/80">{data.orgTag}</span>
      </div>
      <h3 className="relative mt-3 text-lg font-semibold text-gray-900">
        <Link href={`/course/${data.id}`} className="hover:underline">
          {data.title}
        </Link>
      </h3>
      <div className="relative mt-3 flex items-center justify-between">
        <div className="flex flex-col text-sm text-gray-600">
          <span className="font-semibold text-gray-800">{tr("Зачислено", "Enrolled")} · {data.enrolledCount}</span>
          {restrictEnroll && <span className="text-xs text-gray-500">{tr("Доступно только студентам", "Students only")}</span>}
        </div>
        {!restrictEnroll && (
          <button
            onClick={toggle}
            disabled={isPending}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow ${
              data.isEnrolled
                ? "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
            } disabled:opacity-60`}
          >
            {isPending ? tr("...", "...") : data.isEnrolled ? tr("Отписаться", "Unenroll") : tr("Записаться", "Enroll")}
          </button>
        )}
      </div>
    </div>
  );
}

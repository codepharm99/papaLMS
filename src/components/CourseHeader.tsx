"use client";

import type { CSSProperties } from "react";
import { useTransition } from "react";
import { useCurrentUser } from "@/components/user-context";

type CourseVM = {
  id: string;
  code: string;
  title: string;
  orgTag: string;
  teacherId: string;
  teacherName: string;
  enrolledCount: number;
  isEnrolled: boolean;
};

export default function CourseHeader({
  course,
  onChanged,
}: {
  course: CourseVM;
  onChanged: (next: CourseVM) => void;
}) {
  const [isPending, start] = useTransition();
  const { user } = useCurrentUser();
  const isStudent = user?.role === "STUDENT";
  const restrictEnroll = !!user && !isStudent;
  const paint: CSSProperties = {
    "--module-accent-1": "227 86% 76%",
    "--module-accent-2": "210 86% 74%",
    "--module-accent-3": "189 74% 72%",
  };

  const toggle = () => {
    if (restrictEnroll) return;

    start(async () => {
      onChanged({
        ...course,
        isEnrolled: !course.isEnrolled,
        enrolledCount: course.isEnrolled ? course.enrolledCount - 1 : course.enrolledCount + 1,
      });
      const res = await fetch(`/api/courses/${course.id}/enroll`, { method: "POST" });
      if (!res.ok) {
        onChanged(course);
        if (res.status === 401) window.location.href = "/login";
        return;
      }
      const { item } = await res.json();
      onChanged(item);
    });
  };

  return (
    <div className="module-illustration light rounded-2xl border bg-white/95 p-4 text-gray-900 shadow-sm" style={paint}>
      <div className="text-xs text-gray-500">{course.code} · {course.orgTag}</div>
      <h1 className="mt-1 text-2xl font-semibold text-gray-900">{course.title}</h1>
      <div className="mt-1 text-sm text-gray-600">Преподаватель: {course.teacherName}</div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm text-gray-600">Зачислено: {course.enrolledCount}</span>
        {restrictEnroll ? (
          <span className="text-xs text-gray-500">Запись доступна только студентам</span>
        ) : (
          <button
            onClick={toggle}
            disabled={isPending}
            className={`rounded-xl px-3 py-2 text-sm ${
              course.isEnrolled ? "bg-white text-gray-900 border" : "bg-gray-900 text-white"
            } disabled:opacity-60`}
          >
            {course.isEnrolled ? "Отписаться" : "Записаться"}
          </button>
        )}
      </div>
    </div>
  );
}

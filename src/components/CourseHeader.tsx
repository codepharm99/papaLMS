"use client";

import { useTransition } from "react";

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

  const toggle = () => {
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
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-xs text-gray-500">{course.code} · {course.orgTag}</div>
      <h1 className="mt-1 text-2xl font-semibold">{course.title}</h1>
      <div className="mt-1 text-sm text-gray-600">Преподаватель: {course.teacherName}</div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm text-gray-600">Зачислено: {course.enrolledCount}</span>
        <button
          onClick={toggle}
          disabled={isPending}
          className={`rounded-xl px-3 py-2 text-sm ${
            course.isEnrolled ? "bg-white text-gray-900 border" : "bg-gray-900 text-white"
          } disabled:opacity-60`}
        >
          {course.isEnrolled ? "Отписаться" : "Записаться"}
        </button>
      </div>
    </div>
  );
}
"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/components/user-context";

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
  const isStudent = user?.role === "STUDENT";
  const restrictEnroll = !!user && !isStudent;

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
    <div className="flex flex-col rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-2 text-xs text-gray-500">{data.code} · {data.orgTag}</div>
      <h3 className="mb-3 text-lg font-semibold">
        <Link href={`/course/${data.id}`} className="hover:underline">{data.title}</Link>
      </h3>
      <div className="mt-auto flex items-center justify-between">
        <span className="text-sm text-gray-600">Зачислено: {data.enrolledCount}</span>
        {restrictEnroll ? (
          <span className="text-xs text-gray-500">Запись доступна только студентам</span>
        ) : (
          <button
            onClick={toggle}
            disabled={isPending}
            className={`rounded-xl px-3 py-2 text-sm ${
              data.isEnrolled ? "bg-white text-gray-900 border" : "bg-gray-900 text-white"
            } disabled:opacity-60`}
          >
            {data.isEnrolled ? "Отписаться" : "Записаться"}
          </button>
        )}
      </div>
    </div>
  );
}

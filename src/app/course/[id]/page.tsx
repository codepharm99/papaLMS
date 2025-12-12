"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CourseHeader from "@/components/CourseHeader";
import Materials from "@/components/Materials";

type Course = {
  id: string;
  code: string;
  title: string;
  orgTag: string;
  teacherId: string;
  teacherName: string;
  enrolledCount: number;
  isEnrolled: boolean;
};

export default function CoursePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [tab, setTab] = useState<"overview" | "materials">("overview");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const r = await fetch(`/api/courses/${id}`);
      if (r.ok) {
        const d = await r.json();
        setCourse(d.item);
      }
    })();
  }, [id]);

  if (!course) return <div className="text-gray-500">Загрузка...</div>;

  const overviewPaint: CSSProperties = {
    "--module-accent-1": "258 76% 76%",
    "--module-accent-2": "235 74% 72%",
    "--module-accent-3": "212 72% 70%",
  };
  const pagePaint: CSSProperties = {
    "--aurora-accent-1": "223 92% 66%",
    "--aurora-accent-2": "260 82% 66%",
    "--aurora-accent-3": "308 76% 64%",
  };

  return (
    <section className="page-aurora space-y-4 rounded-3xl p-1" style={pagePaint}>
      <CourseHeader course={course} onChanged={setCourse} />

      <div className="flex gap-2">
        <button
          onClick={() => setTab("overview")}
          className={`rounded-xl px-3 py-2 text-sm ${tab === "overview" ? "bg-gray-900 text-white" : "border"}`}
        >
          Обзор
        </button>
        <button
          onClick={() => setTab("materials")}
          className={`rounded-xl px-3 py-2 text-sm ${tab === "materials" ? "bg-gray-900 text-white" : "border"}`}
        >
          Материалы
        </button>
      </div>

      {tab === "overview" && (
        <div
          className="module-illustration light rounded-2xl border bg-white/95 p-4 text-gray-600 shadow-sm"
          style={overviewPaint}
        >
          Здесь будет краткое описание курса и блок объявлений (добавим позже).
        </div>
      )}

      {tab === "materials" && <Materials courseId={course.id} teacherId={course.teacherId} />}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";

type Course = { id: string; title: string; code: string };
type Student = { id: string; name: string; username: string };

export default function TeacherMarksTool() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [week, setWeek] = useState(1);
  const [lectureScore, setLectureScore] = useState<number | "">("");
  const [practiceScore, setPracticeScore] = useState<number | "">("");
  const [individualScore, setIndividualScore] = useState<number | "">("");
  const [ratingScore, setRatingScore] = useState<number | "">("");
  const [midtermScore, setMidtermScore] = useState<number | "">("");
  const [examScore, setExamScore] = useState<number | "">("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    const loadCourses = async () => {
      const res = await fetch("/api/teacher/courses", { cache: "no-store" });
      if (!res.ok) {
        setError("Не удалось загрузить курсы");
        return;
      }
      const data = await res.json().catch(() => ({}));
      const items = Array.isArray(data?.items)
        ? data.items.map((c: any) => ({ id: String(c.id), title: c.title ?? "", code: c.code ?? "" }))
        : [];
      setCourses(items);
      if (items.length > 0) setSelectedCourse(items[0].id);
    };
    loadCourses();
  }, []);

  useEffect(() => {
    if (!selectedCourse) {
      setStudents([]);
      return;
    }
    const loadStudents = async () => {
      setStudentsLoading(true);
      const res = await fetch(`/api/teacher/courses/${selectedCourse}/students`, { cache: "no-store" });
      setStudentsLoading(false);
      if (!res.ok) {
        setError("Не удалось загрузить студентов курса");
        return;
      }
      const data = await res.json().catch(() => ({}));
      const items = Array.isArray(data?.items)
        ? data.items.map((s: any) => ({ id: String(s.id), name: s.name ?? "", username: s.username ?? "" }))
        : [];
      setStudents(items);
      setSelectedStudent(items[0]?.id ?? "");
    };
    loadStudents();
  }, [selectedCourse]);

  const canSubmit = useMemo(
    () => Boolean(selectedCourse && selectedStudent && Number.isInteger(week) && week >= 1 && week <= 14),
    [selectedCourse, selectedStudent, week]
  );

  const parseScore = (value: number | "" | null | undefined) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return Number.isFinite(value) ? Number(value) : undefined;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!canSubmit) {
      setError("Укажите курс, студента и неделю (1–14).");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/teacher/weekly-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: selectedCourse,
        studentId: selectedStudent,
        week,
        lectureScore: parseScore(lectureScore),
        practiceScore: parseScore(practiceScore),
        individualWorkScore: parseScore(individualScore),
        ratingScore: parseScore(ratingScore),
        midtermScore: parseScore(midtermScore),
        examScore: parseScore(examScore),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const code = typeof data?.error === "string" ? data.error : "";
      const message =
        code === "INVALID_WEEK"
          ? "Неделя должна быть от 1 до 14."
          : code === "NOT_ENROLLED"
            ? "Студент не записан на этот курс."
            : code === "COURSE_NOT_FOUND"
              ? "Курс не найден."
              : "Не удалось сохранить оценку.";
      setError(message);
      return;
    }
    setInfo("Оценка сохранена.");
  };

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: "Инструменты", href: "/teacher/tools" },
          { label: "Оценки" },
        ]}
      />
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500">Оценивание</div>
        <h1 className="text-2xl font-semibold">Выставить баллы</h1>
        <p className="text-sm text-gray-600">
          Выберите курс, студента и неделю, затем укажите баллы. Для мидтерма используйте неделю 7, для экзамена — неделю 14.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            Курс
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Студент
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              disabled={studentsLoading || students.length === 0}
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.username})
                </option>
              ))}
            </select>
            {studentsLoading && <div className="text-xs text-gray-500">Загружаем студентов…</div>}
            {!studentsLoading && students.length === 0 && (
              <div className="text-xs text-gray-500">На курс пока никто не записан.</div>
            )}
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <label className="block text-sm font-medium text-gray-700">
            Неделя (1–14)
            <input
              type="number"
              min={1}
              max={14}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={week}
              onChange={(e) => setWeek(Number(e.target.value) || 1)}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Лекция
            <input
              type="number"
              min={0}
              max={100}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={lectureScore}
              onChange={(e) => setLectureScore(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Практика
            <input
              type="number"
              min={0}
              max={100}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={practiceScore}
              onChange={(e) => setPracticeScore(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Инд. работа
            <input
              type="number"
              min={0}
              max={100}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={individualScore}
              onChange={(e) => setIndividualScore(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium text-gray-700">
            Рейтинг
            <input
              type="number"
              min={0}
              max={100}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={ratingScore}
              onChange={(e) => setRatingScore(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Мидтерм (7)
            <input
              type="number"
              min={0}
              max={100}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={midtermScore}
              onChange={(e) => setMidtermScore(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Экзамен (14)
            <input
              type="number"
              min={0}
              max={100}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={examScore}
              onChange={(e) => setExamScore(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Сохраняем..." : "Сохранить оценку"}
          </button>
          {info && <span className="text-sm text-green-700">{info}</span>}
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>
      </form>

      <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">
        Чтобы студенты видели баллы, они могут открыть страницу <Link href="/student/marks" className="text-blue-600 underline">«Оценки»</Link> в своём кабинете.
      </div>
    </div>
  );
}

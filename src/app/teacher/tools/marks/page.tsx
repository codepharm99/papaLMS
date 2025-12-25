"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";

type Course = { id: string; title: string; code: string };
type Student = { id: string; name: string; username: string };
type WeeklyScoreRow = {
  studentId: string;
  week: number;
  part: number;
  lectureScore: number;
  practiceScore: number;
  individualWorkScore: number;
  ratingScore?: number | null;
  midtermScore?: number | null;
  examScore?: number | null;
};
type ScoreDraft = {
  lectureScore: number | "";
  practiceScore: number | "";
  individualWorkScore: number | "";
  ratingScore: number | "";
  midtermScore: number | "";
  examScore: number | "";
};

const scoreKeys: Array<keyof ScoreDraft> = [
  "lectureScore",
  "practiceScore",
  "individualWorkScore",
  "ratingScore",
  "midtermScore",
  "examScore",
];

const createEmptyDraft = (): ScoreDraft => ({
  lectureScore: "",
  practiceScore: "",
  individualWorkScore: "",
  ratingScore: "",
  midtermScore: "",
  examScore: "",
});

const clampScore = (value: number | "" | null | undefined) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return null;
  return Math.min(100, Math.max(0, parsed));
};

const normalizeSavedDraft = (draft: ScoreDraft): ScoreDraft => ({
  lectureScore: clampScore(draft.lectureScore) ?? 0,
  practiceScore: clampScore(draft.practiceScore) ?? 0,
  individualWorkScore: clampScore(draft.individualWorkScore) ?? 0,
  ratingScore: clampScore(draft.ratingScore) ?? "",
  midtermScore: clampScore(draft.midtermScore) ?? "",
  examScore: clampScore(draft.examScore) ?? "",
});

const toDraft = (row: WeeklyScoreRow): ScoreDraft => ({
  lectureScore: row.lectureScore ?? "",
  practiceScore: row.practiceScore ?? "",
  individualWorkScore: row.individualWorkScore ?? "",
  ratingScore: row.ratingScore ?? "",
  midtermScore: row.midtermScore ?? "",
  examScore: row.examScore ?? "",
});

const parseScore = (value: number | "" | null | undefined) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default function TeacherMarksTool() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedPart, setSelectedPart] = useState(1);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>({});
  const [baseline, setBaseline] = useState<Record<string, ScoreDraft>>({});
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingScores, setLoadingScores] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const heroPaint: CSSProperties = {
    "--module-accent-1": "192 86% 64%",
    "--module-accent-2": "214 84% 62%",
    "--module-accent-3": "236 80% 64%",
  };
  const panelPaint: CSSProperties = {
    "--module-accent-1": "206 82% 78%",
    "--module-accent-2": "228 76% 74%",
    "--module-accent-3": "254 72% 70%",
  };
  const pagePaint: CSSProperties = {
    "--aurora-accent-1": "223 92% 66%",
    "--aurora-accent-2": "260 82% 66%",
    "--aurora-accent-3": "308 76% 64%",
  };

  useEffect(() => {
    const loadCourses = async () => {
      setLoadingCourses(true);
      const res = await fetch("/api/teacher/courses", { cache: "no-store" });
      setLoadingCourses(false);
      if (!res.ok) {
        setError("Не удалось загрузить курсы");
        return;
      }
      const data = await res.json().catch(() => ({}));
      const items = Array.isArray(data?.items)
        ? data.items.map((c: any) => ({ id: String(c.id), title: c.title ?? "", code: c.code ?? "" }))
        : [];
      setCourses(items);
      setSelectedCourse(items[0]?.id ?? "");
    };
    loadCourses();
  }, []);

  useEffect(() => {
    if (!selectedCourse) {
      setStudents([]);
      return;
    }
    const loadStudents = async () => {
      setLoadingStudents(true);
      const res = await fetch(`/api/teacher/courses/${selectedCourse}/students`, { cache: "no-store" });
      setLoadingStudents(false);
      if (!res.ok) {
        setError("Не удалось загрузить студентов курса");
        return;
      }
      const data = await res.json().catch(() => ({}));
      const items = Array.isArray(data?.items)
        ? data.items.map((s: any) => ({ id: String(s.id), name: s.name ?? "", username: s.username ?? "" }))
        : [];
      setStudents(items);
    };
    loadStudents();
  }, [selectedCourse]);

  useEffect(() => {
    setSelectedPart(selectedWeek <= 7 ? 1 : 2);
  }, [selectedWeek]);

  useEffect(() => {
    if (!selectedCourse) {
      setBaseline({});
      setDrafts({});
      return;
    }
    const loadScores = async () => {
      setLoadingScores(true);
      setError(null);
      setInfo(null);
      try {
        const res = await fetch(
          `/api/teacher/weekly-scores?courseId=${encodeURIComponent(selectedCourse)}&week=${selectedWeek}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          setError("Не удалось загрузить оценки");
          setBaseline({});
          setDrafts({});
          return;
        }
        const data = await res.json().catch(() => ({}));
        const items = Array.isArray(data?.items) ? (data.items as WeeklyScoreRow[]) : [];
        const nextBaseline: Record<string, ScoreDraft> = {};
        items.forEach(item => {
          nextBaseline[item.studentId] = toDraft(item);
        });
        setBaseline(nextBaseline);
        setDrafts(nextBaseline);
      } finally {
        setLoadingScores(false);
      }
    };
    loadScores();
  }, [selectedCourse, selectedWeek]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(student => {
      const name = student.name.toLowerCase();
      const username = student.username.toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [students, search]);

  const existingIds = useMemo(() => new Set(Object.keys(baseline)), [baseline]);

  const getDraft = (studentId: string) => drafts[studentId] ?? createEmptyDraft();
  const getBaseline = (studentId: string) => baseline[studentId] ?? createEmptyDraft();

  const isDirty = (studentId: string) => {
    const draft = getDraft(studentId);
    const base = getBaseline(studentId);
    return scoreKeys.some(key => (draft[key] ?? "") !== (base[key] ?? ""));
  };

  const hasAnyValue = (draft: ScoreDraft) =>
    scoreKeys.some(key => draft[key] !== "" && draft[key] !== null && draft[key] !== undefined);

  const handleScoreChange = (studentId: string, key: keyof ScoreDraft, value: number | "") => {
    setDrafts(prev => {
      const next = { ...(prev[studentId] ?? createEmptyDraft()) };
      next[key] = value;
      return { ...prev, [studentId]: next };
    });
  };

  const saveScores = async (studentId: string, draft: ScoreDraft) => {
    const res = await fetch("/api/teacher/weekly-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: selectedCourse,
        studentId,
        week: selectedWeek,
        part: selectedPart,
        lectureScore: parseScore(draft.lectureScore),
        practiceScore: parseScore(draft.practiceScore),
        individualWorkScore: parseScore(draft.individualWorkScore),
        ratingScore: parseScore(draft.ratingScore),
        midtermScore: parseScore(draft.midtermScore),
        examScore: parseScore(draft.examScore),
      }),
    });
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
      return { ok: false, message };
    }
    return { ok: true, message: "" };
  };

  const saveRow = async (studentId: string) => {
    const draft = getDraft(studentId);
    if (!selectedCourse) {
      setError("Сначала выберите курс.");
      return;
    }
    if (!hasAnyValue(draft) && !existingIds.has(studentId)) {
      setError("Нет данных для сохранения.");
      return;
    }
    setSavingRows(prev => ({ ...prev, [studentId]: true }));
    setError(null);
    setInfo(null);
    const result = await saveScores(studentId, draft);
    setSavingRows(prev => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const normalized = normalizeSavedDraft(draft);
    setBaseline(prev => ({ ...prev, [studentId]: normalized }));
    setDrafts(prev => ({ ...prev, [studentId]: normalized }));
    setInfo("Оценка сохранена.");
  };

  const saveAll = async () => {
    const idsToSave = filteredStudents
      .map(student => student.id)
      .filter(studentId => {
        const draft = getDraft(studentId);
        return isDirty(studentId) && (hasAnyValue(draft) || existingIds.has(studentId));
      });
    if (idsToSave.length === 0) {
      setInfo("Нет изменений для сохранения.");
      setError(null);
      return;
    }
    setSavingAll(true);
    setError(null);
    setInfo(null);
    let success = 0;
    let failed = 0;
    for (const studentId of idsToSave) {
      const result = await saveScores(studentId, getDraft(studentId));
      if (!result.ok) {
        failed += 1;
        continue;
      }
      const normalized = normalizeSavedDraft(getDraft(studentId));
      setBaseline(prev => ({ ...prev, [studentId]: normalized }));
      setDrafts(prev => ({ ...prev, [studentId]: normalized }));
      success += 1;
    }
    setSavingAll(false);
    if (failed > 0) {
      setError(`Не удалось сохранить строк: ${failed}.`);
    }
    if (success > 0) {
      setInfo(`Сохранено строк: ${success}.`);
    }
  };

  const weekOptions = Array.from({ length: 14 }, (_, index) => index + 1);
  const showEmptyStudents = !loadingStudents && students.length === 0;
  const showTable = students.length > 0 && !loadingStudents;

  return (
    <section className="page-aurora space-y-5 rounded-3xl p-1" style={pagePaint}>
      <Breadcrumbs
        items={[
          { label: "Инструменты", href: "/teacher/tools" },
          { label: "Оценки" },
        ]}
      />

      <div
        className="rounded-3xl bg-gradient-to-r from-indigo-700 via-blue-600 to-cyan-500 px-6 py-5 text-white shadow-lg"
        style={heroPaint}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-white/70">Оценивание</p>
        <h1 className="mt-2 text-2xl font-bold">Выставление баллов</h1>
        <p className="text-sm text-white/80">
          Выберите курс и неделю, затем заполните оценки прямо в таблице.
        </p>
      </div>

      <div className="rounded-2xl border bg-white/95 p-4 shadow-sm" style={panelPaint}>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm font-medium text-gray-700">
            Курс
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              disabled={loadingCourses}
            >
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
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
            >
              {weekOptions.map(week => (
                <option key={week} value={week}>
                  Неделя {week}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Часть
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-gray-600"
              value={`Часть ${selectedPart}`}
              readOnly
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Поиск студента
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Фамилия или логин"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>
            Студентов: <span className="font-semibold text-gray-700">{students.length}</span>
          </span>
          <span>
            Показано: <span className="font-semibold text-gray-700">{filteredStudents.length}</span>
          </span>
          <span>Мидтерм обычно на 7-й неделе, экзамен — на 14-й.</span>
          <button
            type="button"
            onClick={saveAll}
            disabled={savingAll || loadingScores || loadingStudents || filteredStudents.length === 0}
            className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {savingAll ? "Сохраняем..." : "Сохранить все"}
          </button>
        </div>
      </div>

      {loadingStudents && <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">Загружаем список студентов…</div>}
      {loadingScores && <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">Загружаем оценки…</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {info && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{info}</div>}

      {showEmptyStudents && (
        <div className="rounded-2xl border border-dashed bg-white p-6 text-sm text-gray-600">
          На курс пока никто не записан.
        </div>
      )}

      {showTable && (
        <div className="overflow-x-auto rounded-2xl border bg-white/95 shadow-sm">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left">Студент</th>
                <th className="px-3 py-3 text-left">Лекция</th>
                <th className="px-3 py-3 text-left">Практика</th>
                <th className="px-3 py-3 text-left">Инд. работа</th>
                <th className="px-3 py-3 text-left">Рейтинг</th>
                <th className="px-3 py-3 text-left">Мидтерм</th>
                <th className="px-3 py-3 text-left">Экзамен</th>
                <th className="px-3 py-3 text-left">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(student => {
                const draft = getDraft(student.id);
                const dirty = isDirty(student.id);
                const canSave = hasAnyValue(draft) || existingIds.has(student.id);
                const rowSaving = Boolean(savingRows[student.id]);
                return (
                  <tr
                    key={student.id}
                    className={dirty ? "bg-amber-50/60" : "hover:bg-slate-50/80"}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500">{student.username}</div>
                    </td>
                    {scoreKeys.map(key => (
                      <td key={key} className="px-3 py-3">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-24 rounded-lg border px-2 py-1 text-sm text-gray-900"
                          value={draft[key]}
                          onChange={(e) => handleScoreChange(student.id, key, e.target.value === "" ? "" : Number(e.target.value))}
                          disabled={rowSaving || savingAll}
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => saveRow(student.id)}
                        disabled={!canSave || !dirty || rowSaving || savingAll}
                        className="rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {rowSaving ? "Сохраняем..." : dirty ? "Сохранить" : "Готово"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border bg-white p-4 text-sm text-black">
        Чтобы студенты видели баллы, они могут открыть страницу{" "}
        <Link href="/student/marks" className="text-blue-600 underline">
          «Оценки»
        </Link>{" "}
        в своём кабинете.
      </div>
    </section>
  );
}

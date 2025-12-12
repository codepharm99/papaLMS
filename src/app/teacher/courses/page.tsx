"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/user-context";
import { useLanguage } from "@/components/language-context";

type TeacherCourse = {
  id: string;
  code: string;
  title: string;
  orgTag: string;
  description?: string | null;
  createdAt: number;
};

export default function TeacherCoursesPage() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const { language } = useLanguage();
  const tr = (ru: string, en: string) => (language === "ru" ? ru : en);
  const [items, setItems] = useState<TeacherCourse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [orgTag, setOrgTag] = useState("IUA");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const heroPaint: CSSProperties = {
    "--module-accent-1": "161 77% 62%",
    "--module-accent-2": "186 76% 60%",
    "--module-accent-3": "199 74% 64%",
  };
  const cardPaints: CSSProperties[] = [
    { "--module-accent-1": "168 74% 74%", "--module-accent-2": "186 76% 70%", "--module-accent-3": "201 74% 68%" },
    { "--module-accent-1": "204 84% 74%", "--module-accent-2": "225 82% 70%", "--module-accent-3": "245 74% 66%" },
    { "--module-accent-1": "256 78% 76%", "--module-accent-2": "279 74% 72%", "--module-accent-3": "301 70% 70%" },
  ];
  const pagePaint: CSSProperties = {
    "--aurora-accent-1": "223 92% 66%",
    "--aurora-accent-2": "260 82% 66%",
    "--aurora-accent-3": "308 76% 64%",
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/teacher/courses", { cache: "no-store" });
    setLoading(false);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.status === 403) {
      setError(tr("Доступ разрешён только преподавателям.", "Only teachers can access this section."));
      return;
    }
    if (!res.ok) {
      setError(tr("Не удалось загрузить курсы", "Failed to load courses"));
      return;
    }
    const data = await res.json();
    setItems(data.items);
  }, [router]);

  useEffect(() => {
    if (user?.role !== "TEACHER") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [user, load]);

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/teacher/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, code, orgTag, description }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? tr("Не удалось создать курс", "Failed to create course"));
      return;
    }
    const { item } = await res.json();
    setItems(prev => (prev ? [item, ...prev] : [item]));
    setTitle("");
    setCode("");
    setDescription("");
  }

  if (!user) {
    return <div className="text-gray-500">{tr("Нужно войти.", "You need to log in.")}</div>;
  }

  if (user.role !== "TEACHER") {
    return <div className="text-gray-500">{tr("Раздел доступен только преподавателям.", "Section available to teachers only.")}</div>;
  }

  return (
    <section className="page-aurora space-y-5 rounded-3xl p-1" style={pagePaint}>
      <div
        className="module-illustration rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-500 px-6 py-5 text-white shadow-lg"
        style={heroPaint}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-white/70">{tr("Панель преподавателя", "Teacher panel")}</p>
        <h1 className="mt-2 text-2xl font-bold">{tr("Мои курсы", "My courses")}</h1>
        <p className="text-sm text-white/80">
          {tr("Создавайте курсы и добавляйте материалы, чтобы студенты подключались.", "Create courses and add materials so students can join.")}
        </p>
      </div>

      <form onSubmit={createCourse} className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm text-gray-700">{tr("Название *", "Title *")}</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-700">{tr("Код курса *", "Course code *")}</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CS404"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-700">{tr("Орг. тег *", "Org tag *")}</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 uppercase"
              value={orgTag}
              onChange={(e) => setOrgTag(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-700">{tr("Описание", "Description")}</label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={submitting}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {submitting ? tr("Создаём...", "Creating...") : tr("Создать курс", "Create course")}
        </button>
      </form>

      {loading && <div className="text-sm text-gray-500">{tr("Загрузка списка...", "Loading list...")}</div>}

      {items && items.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-gray-500">{tr("У вас пока нет курсов.", "No courses yet.")}</div>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((course, idx) => (
            <div
              key={course.id}
              className="module-illustration light rounded-2xl border bg-white/95 p-4 text-gray-900 shadow-sm"
              style={cardPaints[idx % cardPaints.length]}
            >
              <div className="text-xs text-gray-500">{course.code} · {course.orgTag}</div>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">{course.title}</h3>
              {course.description && <p className="mt-2 text-sm text-gray-600">{course.description}</p>}
              <div className="mt-3 text-xs text-gray-400">{tr("Создан:", "Created:")} {new Date(course.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

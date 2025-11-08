"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/user-context";

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
  const [items, setItems] = useState<TeacherCourse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [orgTag, setOrgTag] = useState("IUA");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      setError("Доступ разрешён только преподавателям.");
      return;
    }
    if (!res.ok) {
      setError("Не удалось загрузить курсы");
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
      setError(data?.error ?? "Не удалось создать курс");
      return;
    }
    const { item } = await res.json();
    setItems(prev => (prev ? [item, ...prev] : [item]));
    setTitle("");
    setCode("");
    setDescription("");
  }

  if (!user) {
    return <div className="text-gray-500">Нужно войти.</div>;
  }

  if (user.role !== "TEACHER") {
    return <div className="text-gray-500">Раздел доступен только преподавателям.</div>;
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Мои курсы</h1>
        <p className="text-sm text-gray-500">Создавайте курсы и затем добавляйте материалы в карточке курса.</p>
      </div>

      <form onSubmit={createCourse} className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm text-gray-700">Название *</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-700">Код курса *</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CS404"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-700">Орг. тег *</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 uppercase"
              value={orgTag}
              onChange={(e) => setOrgTag(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-700">Описание</label>
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
          {submitting ? "Создаём..." : "Создать курс"}
        </button>
      </form>

      {loading && <div className="text-sm text-gray-500">Загрузка списка...</div>}

      {items && items.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-gray-500">У вас пока нет курсов.</div>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(course => (
            <div key={course.id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-500">{course.code} · {course.orgTag}</div>
              <h3 className="mt-1 text-lg font-semibold">{course.title}</h3>
              {course.description && <p className="mt-2 text-sm text-gray-600">{course.description}</p>}
              <div className="mt-3 text-xs text-gray-400">Создан: {new Date(course.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

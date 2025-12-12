"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";

type Person = { id: string; name: string; username: string; createdAt: number; count: number };

export default function AdminUsersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Person[] | null>(null);
  const [students, setStudents] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [teachersRes, studentsRes] = await Promise.all([
          fetch("/api/admin/teachers", { cache: "no-store" }),
          fetch("/api/admin/students", { cache: "no-store" }),
        ]);

        if (teachersRes.status === 401 || studentsRes.status === 401) {
          router.push("/login");
          return;
        }
        if (teachersRes.status === 403 || studentsRes.status === 403) {
          setError("Доступ запрещён. Нужны права администратора.");
          setLoading(false);
          return;
        }
        if (!teachersRes.ok || !studentsRes.ok) {
          setError("Не удалось загрузить данные.");
          setLoading(false);
          return;
        }

        const teachersData = (await teachersRes.json()) as { items?: Person[] };
        const studentsData = (await studentsRes.json()) as { items?: Person[] };
        setTeachers(Array.isArray(teachersData.items) ? teachersData.items : []);
        setStudents(Array.isArray(studentsData.items) ? studentsData.items : []);
      } catch (e) {
        console.error(e);
        setError("Ошибка загрузки данных.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  return (
    <section className="space-y-5">
      <Breadcrumbs
        items={[
          { label: "Администрирование" },
          { label: "Пользователи" },
        ]}
      />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Пользователи</h1>
        <p className="text-sm text-gray-600">
          Списки зарегистрированных преподавателей и студентов. Используйте инвайты, чтобы пригласить новых преподавателей.
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <div className="text-sm text-gray-500">Загрузка...</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Преподаватели</div>
              <div className="text-lg font-semibold">Всего: {teachers?.length ?? 0}</div>
            </div>
          </div>
          {teachers && teachers.length === 0 && <div className="text-sm text-gray-500">Преподавателей пока нет.</div>}
          {teachers && teachers.length > 0 && (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Имя</th>
                    <th className="px-3 py-2 font-medium">Логин</th>
                    <th className="px-3 py-2 font-medium">Курсов</th>
                    <th className="px-3 py-2 font-medium">Создан</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(t => (
                    <tr key={t.id} className="border-t">
                      <td className="px-3 py-2 font-medium text-gray-900">{t.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-700">{t.username}</td>
                      <td className="px-3 py-2 text-gray-700">{t.count}</td>
                      <td className="px-3 py-2 text-gray-600">{new Date(t.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Студенты</div>
              <div className="text-lg font-semibold">Всего: {students?.length ?? 0}</div>
            </div>
          </div>
          {students && students.length === 0 && <div className="text-sm text-gray-500">Студентов пока нет.</div>}
          {students && students.length > 0 && (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Имя</th>
                    <th className="px-3 py-2 font-medium">Логин</th>
                    <th className="px-3 py-2 font-medium">Записей</th>
                    <th className="px-3 py-2 font-medium">Создан</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-2 font-medium text-gray-900">{s.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-700">{s.username}</td>
                      <td className="px-3 py-2 text-gray-700">{s.count}</td>
                      <td className="px-3 py-2 text-gray-600">{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

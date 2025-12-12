"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type TestItem = { id: string; title: string; description?: string | null; publicCode?: string | null; publishedAt?: number | null; createdAt: number };

export default function TeacherTestsPage() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createPaint: CSSProperties = {
    "--module-accent-1": "215 82% 76%",
    "--module-accent-2": "190 82% 70%",
    "--module-accent-3": "161 74% 68%",
  };
  const listPaint: CSSProperties = {
    "--module-accent-1": "258 78% 76%",
    "--module-accent-2": "234 74% 74%",
    "--module-accent-3": "213 70% 70%",
  };
  const pagePaint: CSSProperties = {
    "--aurora-accent-1": "223 92% 66%",
    "--aurora-accent-2": "260 82% 66%",
    "--aurora-accent-3": "308 76% 64%",
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/teacher/tests", { cache: "no-store" });
        if (!res.ok) throw new Error("Не удалось загрузить тесты");
        const j: { data: TestItem[] } = await res.json();
        if (!cancelled) setTests(j.data ?? []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/teacher/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) throw new Error("Не удалось создать тест");
      const j: { item: TestItem } = await res.json();
      setTests(prev => [j.item, ...prev]);
      setTitle("");
      setDescription("");
      // Redirect to edit page
      window.location.href = `/teacher/tests/${j.item.id}/edit`;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка при создании");
    }
  };

  return (
    <div className="page-aurora space-y-4 rounded-3xl p-1" style={pagePaint}>
      <Breadcrumbs
        items={[
          { label: "Инструменты", href: "/teacher/tools" },
          { label: "Меню", href: "/teacher/tools" },
          { label: "Тестирование (прошлые тесты)" },
        ]}
      />

      <section
        className="module-illustration light rounded-xl border bg-white/95 p-4 shadow-sm"
        style={createPaint}
      >
        <h1 className="mb-3 text-lg font-medium">Создать тест</h1>
        <form onSubmit={handleCreate} className="grid gap-3 md:max-w-xl">
          <label className="grid gap-1">
            <span className="text-sm text-gray-700">Название</span>
            <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Напр. Контрольная №1" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-gray-700">Описание</span>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Необязательно" />
          </label>
          <div>
            <Button type="submit">Создать тест</Button>
          </div>
        </form>
      </section>

      <section
        className="module-illustration light rounded-xl border bg-white/95 p-4 shadow-sm"
        style={listPaint}
      >
        <h2 className="mb-3 text-lg font-medium">Прошлые тесты</h2>
        {loading ? (
          <div className="text-sm text-gray-600">Загрузка…</div>
        ) : tests.length === 0 ? (
          <div className="text-sm text-gray-600">Пока нет созданных тестов</div>
        ) : (
          <ul className="divide-y">
            {tests.map(t => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">{t.title}</div>
                  {t.description && <div className="text-sm text-gray-600">{t.description}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/teacher/tests/${t.id}/edit`} className="text-sm text-blue-600 hover:underline">
                    Редактировать
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </section>
    </div>
  );
}

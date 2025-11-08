"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = { id: string; test: { id: string; title: string }; dueAt?: number | null; status: string };

export default function StudentTestsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/student/tests", { cache: "no-store" });
        if (!r.ok) throw new Error("Не удалось загрузить назначения");
        const j: { data: Item[] } = await r.json();
        if (!cancelled) setItems(j.data ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Мои тесты</h1>
      {loading ? (
        <div className="text-sm text-gray-600">Загрузка…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-600">Назначенных тестов пока нет</div>
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {items.map(a => (
            <li key={a.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{a.test.title}</div>
                <div className="text-sm text-gray-600">
                  Статус: {a.status}
                  {a.dueAt ? ` · Срок: ${new Date(a.dueAt).toLocaleString()}` : ""}
                </div>
              </div>
              <div>
                <Link href={`/student/tests/${a.id}`} className="text-sm text-blue-600 hover:underline">
                  {a.status === "COMPLETED" ? "Открыть" : "Сдать"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


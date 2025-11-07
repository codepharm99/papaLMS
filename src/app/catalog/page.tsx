"use client";

import { useEffect, useMemo, useState } from "react";
import CourseCard, { CourseVM } from "@/components/CourseCard";

type Resp = { items: CourseVM[] };

export default function CatalogPage() {
  const [q, setQ] = useState("");
  const [mine, setMine] = useState(false);
  const [items, setItems] = useState<CourseVM[] | null>(null);
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (mine) p.set("mine", "1");
    return `/api/courses?${p.toString()}`;
  }, [q, mine]);

  async function load() {
    setLoading(true);
    const res = await fetch(query);
    setLoading(false);
    if (res.ok) {
      const data: Resp = await res.json();
      setItems(data.items);
    } else {
      setItems([]);
    }
  }

  useEffect(() => { load(); }, [query]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Каталог курсов!</h1>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по названию или коду..."
          className="w-full max-w-md rounded-xl border px-3 py-2 outline-none focus:ring"
        />
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          Мои курсы
        </label>
      </div>

      {loading && <div className="text-gray-500">Загрузка...</div>}

      {!loading && items && items.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-gray-500">Ничего не найдено.</div>
      )}

      {!loading && items && items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c, idx) => (
            <CourseCard
              key={c.id}
              data={c}
              onChanged={(next) =>
                setItems(prev => prev ? prev.map((x, i) => (i === idx ? next : x)) : prev)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
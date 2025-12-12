"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import CourseCard, { CourseVM } from "@/components/CourseCard";
import { useLanguage } from "@/components/language-context";

type Resp = { items: CourseVM[] };

export default function CatalogPage() {
  const [q, setQ] = useState("");
  const mine = false;
  const [items, setItems] = useState<CourseVM[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { language } = useLanguage();
  const tr = (ru: string, en: string) => (language === "ru" ? ru : en);
  const heroPaint: CSSProperties = {
    "--module-accent-1": "210 86% 72%",
    "--module-accent-2": "236 82% 70%",
    "--module-accent-3": "268 78% 68%",
  };
  const cardsPaint: CSSProperties = {
    "--module-accent-1": "194 82% 74%",
    "--module-accent-2": "221 80% 70%",
    "--module-accent-3": "248 76% 70%",
  };
  const pagePaint: CSSProperties = {
    "--aurora-accent-1": "223 92% 66%",
    "--aurora-accent-2": "260 82% 66%",
    "--aurora-accent-3": "308 76% 64%",
  };

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (mine) p.set("mine", "1");
    return `/api/courses?${p.toString()}`;
  }, [q, mine]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(query);
    setLoading(false);
    if (res.ok) {
      const data: Resp = await res.json();
      setItems(data.items);
    } else {
      setItems([]);
    }
  }, [query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <section className="page-aurora space-y-4 rounded-3xl p-1" style={pagePaint}>
      <div
        className="module-illustration rounded-3xl border bg-white/95 p-5 shadow-sm"
        style={heroPaint}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-500">{tr("Каталог", "Catalog")}</p>
            <h1 className="text-2xl font-semibold text-gray-900">{tr("Каталог курсов", "Course catalog")}</h1>
            <p className="text-sm text-gray-600">
              {tr("Подберите курс по названию или коду — предложения обновляются динамически.", "Find a course by title or code — the list updates dynamically.")}
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            {items ? `${items.length} ${tr("курсов", "courses")}` : tr("Загрузка", "Loading")}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr("Поиск по названию или коду...", "Search by title or code...")}
            className="w-full max-w-md rounded-xl border px-3 py-2 outline-none focus:ring"
          />
        </div>
      </div>

      {loading && <div className="text-gray-500">{tr("Загрузка...", "Loading...")}</div>}

      {!loading && items && items.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-gray-500">{tr("Ничего не найдено.", "Nothing found.")}</div>
      )}

      {!loading && items && items.length > 0 && (
        <div
          className="module-illustration light grid grid-cols-1 gap-4 rounded-3xl border bg-white/95 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
          style={cardsPaint}
        >
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

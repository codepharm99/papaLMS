"use client";

import { useEffect, useState } from "react";

type Material = { id: string; title: string; description?: string; url?: string; createdAt: number };
type Me = { id: string; name: string; role: "STUDENT" | "TEACHER" } | null;

export default function Materials({ courseId, teacherId }: { courseId: string; teacherId: string }) {
  const [items, setItems] = useState<Material[]>([]);
  const [me, setMe] = useState<Me>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const canAdd = me?.role === "TEACHER" && me.id === teacherId;

  async function load() {
    const r = await fetch(`/api/courses/${courseId}/materials`);
    if (r.ok) {
      const d = await r.json();
      setItems(d.items);
    }
  }

  useEffect(() => {
    load();
    (async () => {
      const r = await fetch("/api/auth/me");
      const d = await r.json();
      setMe(d.user);
    })();
  }, [courseId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/courses/${courseId}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, url, description }),
    });
    if (res.ok) {
      const { item } = await res.json();
      setItems(prev => [item, ...prev]);
      setOpen(false);
      setTitle("");
      setUrl("");
      setDescription("");
    } else {
      alert("Не удалось добавить материал");
    }
  }

  return (
    <div className="space-y-3">
      {canAdd && (
        <>
          {!open ? (
            <button onClick={() => setOpen(true)} className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white">
              Добавить материал
            </button>
          ) : (
            <form onSubmit={add} className="rounded-2xl border p-4 space-y-2">
              <input
                className="w-full rounded-xl border px-3 py-2"
                placeholder="Заголовок *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <input
                className="w-full rounded-xl border px-3 py-2"
                placeholder="Ссылка (опционально)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <textarea
                className="w-full rounded-xl border px-3 py-2"
                placeholder="Описание (опционально)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white">Сохранить</button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-3 py-2 text-sm">
                  Отмена
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-gray-500">Материалов пока нет.</div>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.id} className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{m.title}</h3>
                {m.url && (
                  <a href={m.url} target="_blank" className="text-sm text-blue-600 underline" rel="noreferrer">
                    Открыть
                  </a>
                )}
              </div>
              {m.description && <p className="mt-1 text-sm text-gray-600">{m.description}</p>}
              <div className="mt-2 text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
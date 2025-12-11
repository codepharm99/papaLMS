"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-context";

type Invite = {
  id: string;
  code: string;
  createdAt: number;
  createdBy: { id: string; name: string };
  usedAt?: number | null;
  usedBy?: { id: string; name: string } | null;
};

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const { language } = useLanguage();
  const tr = (ru: string, en: string) => (language === "ru" ? ru : en);
  const heroPaint: CSSProperties = {
    "--module-accent-1": "221 70% 62%",
    "--module-accent-2": "258 71% 62%",
    "--module-accent-3": "195 68% 60%",
  };
  const pagePaint: CSSProperties = {
    "--aurora-accent-1": "223 92% 66%",
    "--aurora-accent-2": "260 82% 66%",
    "--aurora-accent-3": "308 76% 64%",
  };
  const tablePaint: CSSProperties = {
    "--module-accent-1": "223 82% 76%",
    "--module-accent-2": "205 80% 72%",
    "--module-accent-3": "184 74% 70%",
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/teacher-invites", { cache: "no-store" });
    setLoading(false);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.status === 403) {
      setError(tr("Доступ запрещён. Нужны права администратора.", "Access denied. Admin rights required."));
      return;
    }
    if (!res.ok) {
      setError(tr("Не удалось получить список кодов", "Failed to fetch invite codes"));
      return;
    }
    const data = await res.json();
    setInvites(data.items);
  }, [router, tr]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const createInvite = async () => {
    setCreating(true);
    const res = await fetch("/api/admin/teacher-invites", { method: "POST" });
    setCreating(false);
    if (!res.ok) {
      setError(tr("Не удалось создать код", "Failed to create code"));
      return;
    }
    const { invite } = await res.json();
    setInvites(prev => (prev ? [invite, ...prev] : [invite]));
  };

  return (
    <section className="page-aurora space-y-5 rounded-3xl p-1" style={pagePaint}>
      <div
        className="module-illustration rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-800 to-indigo-600 px-6 py-5 text-white shadow-xl"
        style={heroPaint}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-white/70">{tr("Администрирование", "Administration")}</p>
        <h1 className="mt-2 text-2xl font-bold">{tr("Коды для преподавателей", "Teacher invite codes")}</h1>
        <p className="text-sm text-white/80">{tr("Сгенерируйте код и передайте преподавателю для регистрации.", "Generate a code and share it with a teacher to register.")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={createInvite}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow hover:bg-indigo-50 disabled:opacity-60"
          >
            {creating ? tr("Создаём...", "Creating...") : tr("Создать код", "Create code")}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <div className="text-sm text-gray-500">{tr("Загрузка...", "Loading...")}</div>}

      {invites && invites.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-gray-500">{tr("Кодов пока нет.", "No codes yet.")}</div>
      )}

      {invites && invites.length > 0 && (
        <div
          className="module-illustration light overflow-hidden rounded-2xl border bg-white/95 shadow-sm"
          style={tablePaint}
        >
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">{tr("Код", "Code")}</th>
                <th className="px-4 py-3 font-medium">{tr("Создан", "Created")}</th>
                <th className="px-4 py-3 font-medium">{tr("Статус", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {invites.map(invite => (
                <tr key={invite.id} className="border-t hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-mono text-sm">{invite.code}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(invite.createdAt).toLocaleString()}
                    <div className="text-xs text-gray-400">{tr("Админ", "Admin")}: {invite.createdBy.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    {invite.usedAt ? (
                      <div>
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">{tr("использован", "used")}</span>
                        <div className="text-xs text-gray-500">
                          {new Date(invite.usedAt).toLocaleString()} · {invite.usedBy?.name ?? "—"}
                        </div>
                      </div>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{tr("не использован", "not used")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

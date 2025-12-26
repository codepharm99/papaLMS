"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-context";

type Invite = {
  id: string;
  code: string;
  iin?: string | null;
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
  const [iin, setIin] = useState("");
  const [origin, setOrigin] = useState("");
  const router = useRouter();
  const { language } = useLanguage();
  const tr = useMemo(() => (ru: string, en: string) => (language === "ru" ? ru : en), [language]);
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
      setError(tr("Не удалось получить список ссылок", "Failed to fetch invite links"));
      return;
    }
    const data = await res.json();
    setInvites(data.items);
  }, [router, tr]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const createInvite = async () => {
    const trimmedIin = iin.trim();
    if (!trimmedIin) {
      setError(tr("Введите ИИН для приглашения.", "Enter IIN for the invite."));
      return;
    }
    setError(null);
    setCreating(true);
    const res = await fetch("/api/admin/teacher-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ iin: trimmedIin }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const code = typeof data?.error === "string" ? data.error : "";
      const message =
        code === "IIN_REQUIRED"
          ? tr("Нужно указать ИИН.", "IIN is required.")
          : code === "IIN_INVALID"
            ? tr("ИИН должен состоять из 12 цифр.", "IIN must be 12 digits.")
            : code === "IIN_EXISTS"
              ? tr("Для этого ИИН уже есть активная ссылка.", "An active invite already exists for this IIN.")
              : tr("Не удалось создать ссылку", "Failed to create invite link");
      setError(message);
      return;
    }
    const { invite } = await res.json();
    setInvites(prev => (prev ? [invite, ...prev] : [invite]));
    setIin("");
  };

  const copyLink = async (link: string) => {
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(link);
    } catch {
      setError(tr("Не удалось скопировать ссылку.", "Failed to copy the link."));
    }
  };

  return (
    <section className="page-aurora space-y-5 rounded-3xl p-1" style={pagePaint}>
      <div
        className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-800 to-indigo-600 px-6 py-5 text-white shadow-xl"
        style={heroPaint}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-white/70">{tr("Администрирование", "Administration")}</p>
        <h1 className="mt-2 text-2xl font-bold">{tr("Ссылки для преподавателей", "Teacher invite links")}</h1>
        <p className="text-sm text-white/80">{tr("Создайте ссылку по ИИН и отправьте преподавателю для регистрации.", "Create an invite link by IIN and send it to the teacher.")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={iin}
            onChange={(e) => setIin(e.target.value)}
            placeholder={tr("ИИН (12 цифр)", "IIN (12 digits)")}
            className="w-full max-w-xs rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/70 outline-none"
          />
          <button
            onClick={createInvite}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow hover:bg-indigo-50 disabled:opacity-60"
          >
            {creating ? tr("Создаём...", "Creating...") : tr("Создать ссылку", "Create link")}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <div className="text-sm text-gray-500">{tr("Загрузка...", "Loading...")}</div>}

      {invites && invites.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-gray-500">{tr("Ссылок пока нет.", "No links yet.")}</div>
      )}

      {invites && invites.length > 0 && (
        <div
          className="overflow-hidden rounded-2xl border bg-white/95 shadow-sm"
          style={tablePaint}
        >
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">{tr("ИИН", "IIN")}</th>
                <th className="px-4 py-3 font-medium">{tr("Ссылка", "Link")}</th>
                <th className="px-4 py-3 font-medium">{tr("Создан", "Created")}</th>
                <th className="px-4 py-3 font-medium">{tr("Статус", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {invites.map(invite => {
                const link = origin ? `${origin}/teacher/invite/${invite.code}` : "";
                return (
                  <tr key={invite.id} className="border-t hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-mono text-sm">{invite.iin ?? "—"}</td>
                    <td className="px-4 py-3">
                      {link ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={link}
                            className="max-w-[260px] truncate text-sm text-indigo-600 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {link}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyLink(link)}
                            className="rounded-full border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            {tr("Скопировать", "Copy")}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
      setError("Доступ запрещён. Нужны права администратора.");
      return;
    }
    if (!res.ok) {
      setError("Не удалось получить список кодов");
      return;
    }
    const data = await res.json();
    setInvites(data.items);
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const createInvite = async () => {
    setCreating(true);
    const res = await fetch("/api/admin/teacher-invites", { method: "POST" });
    setCreating(false);
    if (!res.ok) {
      setError("Не удалось создать код");
      return;
    }
    const { invite } = await res.json();
    setInvites(prev => (prev ? [invite, ...prev] : [invite]));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Коды для преподавателей</h1>
          <p className="text-sm text-gray-500">Сгенерируйте код и передайте преподавателю для регистрации.</p>
        </div>
        <button
          onClick={createInvite}
          disabled={creating}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {creating ? "Создаём..." : "Создать код"}
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading && <div className="text-sm text-gray-500">Загрузка...</div>}

      {invites && invites.length === 0 && (
        <div className="rounded-2xl border border-dashed p-6 text-gray-500">Кодов пока нет.</div>
      )}

      {invites && invites.length > 0 && (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Код</th>
                <th className="px-4 py-3 font-medium">Создан</th>
                <th className="px-4 py-3 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {invites.map(invite => (
                <tr key={invite.id} className="border-t">
                  <td className="px-4 py-3 font-mono text-sm">{invite.code}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(invite.createdAt).toLocaleString()}
                    <div className="text-xs text-gray-400">Админ: {invite.createdBy.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    {invite.usedAt ? (
                      <div>
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">использован</span>
                        <div className="text-xs text-gray-500">
                          {new Date(invite.usedAt).toLocaleString()} · {invite.usedBy?.name ?? "—"}
                        </div>
                      </div>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">не использован</span>
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

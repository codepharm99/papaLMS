"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/user-context";

type ProfileShape = {
  id?: number | string;
  userId?: string;
  fullName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  settings?: any;
  email?: string | null;
};

export default function ProfileModule() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileShape | null>(null);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [form, setForm] = useState({ fullName: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { user, refresh } = useCurrentUser();

  useEffect(() => {
    let mounted = true;
    // First check current auth state via /api/auth/me (some auth systems
    // may differ in which routes accept cookies). If authenticated, then
    // request /api/profile for the actual profile data.
    (async () => {
      try {
        // Prefer client-side user context to determine auth state.
        if (!user) {
          setUnauthenticated(true);
          setLoading(false);
          return;
        }

        // we are authenticated on client — fetch profile
        const res = await fetch("/api/profile");
        if (res.status === 401) {
          // treat as unauthenticated
          setUnauthenticated(true);
          setLoading(false);
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (data?.profile) {
          setProfile(data.profile);
          setForm({ fullName: data.profile.fullName ?? "", bio: data.profile.bio ?? "" });
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        if (mounted) setUnauthenticated(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: form.fullName, bio: form.bio }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Save failed");
      }
      const data = await res.json();
      setProfile(data.profile);
      alert("Профиль сохранён");
    } catch (err: any) {
      console.error("Save error:", err);
      alert(err?.message ?? "Ошибка при сохранении профиля");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading…</div>;
  if (unauthenticated)
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Мой профиль</h1>
        <p className="mb-4">Вы не авторизованы. Пожалуйста, войдите, чтобы посмотреть или редактировать профиль.</p>
        <div className="flex gap-2">
          <button onClick={() => router.push('/login')} className="px-4 py-2 rounded bg-blue-600 text-white">
            Войти
          </button>
        </div>
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Мой профиль</h1>

      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Полное имя</label>
          <input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="mt-1 block w-full border rounded p-2"
            placeholder="Иван Иванов"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">О себе</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={5}
            className="mt-1 block w-full border rounded p-2"
            placeholder="Короткая биография"
          />
        </div>

        <div className="flex items-center gap-2">
          <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white">
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <h2 className="text-lg font-medium">Текущие данные</h2>
        <p>
          <strong>Имя:</strong> {profile?.fullName ?? "—"}
        </p>
        <p>
          <strong>Bio:</strong> {profile?.bio ?? "—"}
        </p>
        <p>
          <strong>Avatar:</strong>{" "}
          {profile?.avatarUrl ? (
            <a href={profile.avatarUrl} target="_blank" rel="noreferrer">
              Открыть
            </a>
          ) : (
            "—"
          )}
        </p>
      </div>
    </div>
  );
}

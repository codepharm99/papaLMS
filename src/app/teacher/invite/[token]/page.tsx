"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/user-context";
import { useLanguage } from "@/components/language-context";

export default function TeacherInvitePage() {
  const params = useParams();
  const tokenParam = params?.token;
  const token = useMemo(() => {
    if (Array.isArray(tokenParam)) return tokenParam[0] ?? "";
    return typeof tokenParam === "string" ? tokenParam : "";
  }, [tokenParam]);
  const router = useRouter();
  const { refresh } = useCurrentUser();
  const { language } = useLanguage();
  const tr = (ru: string, en: string) => (language === "ru" ? ru : en);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [iin, setIin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError(tr("Ссылка приглашения недействительна.", "Invite link is invalid."));
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        username,
        password,
        role: "TEACHER",
        inviteToken: token,
        iin,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = typeof data?.error === "string" ? data.error : tr("Не удалось зарегистрироваться.", "Registration failed.");
      setError(message);
      return;
    }
    await res.json();
    await refresh();
    router.push("/teacher/courses");
  };

  return (
    <section className="mx-auto w-full max-w-lg space-y-6">
      <div className="rounded-3xl border bg-white/95 p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500">papaLMS</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {tr("Регистрация преподавателя", "Teacher registration")}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {tr("Заполните данные и подтвердите ИИН для доступа по приглашению.", "Fill in your details and confirm IIN to use the invite.")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border bg-white/95 p-6 shadow-sm">
        <div>
          <label className="text-sm font-medium text-gray-700">{tr("ФИО", "Full name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">{tr("Логин", "Username")}</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">{tr("Пароль", "Password")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">{tr("ИИН", "IIN")}</label>
          <input
            value={iin}
            onChange={(e) => setIin(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder={tr("12 цифр", "12 digits")}
            required
          />
        </div>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? tr("Регистрируем...", "Registering...") : tr("Зарегистрироваться", "Register")}
        </button>
      </form>
    </section>
  );
}

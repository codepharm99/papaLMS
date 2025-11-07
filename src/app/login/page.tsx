"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("student1");
  const [password, setPassword] = useState("1111");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setErr("Неверный логин или пароль");
      return;
    }
    const { user } = await res.json();
    router.push("/catalog");
  }

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-4 text-2xl font-semibold">Вход</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="block text-sm text-gray-700">Логин</label>
          <input
            className="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="student1 или teacher1"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm text-gray-700">Пароль</label>
          <input
            type="password"
            className="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="1111"
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-gray-900 px-3 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Входим..." : "Войти"}
        </button>

        <p className="text-xs text-gray-500">
          Демо-аккаунты: <b>student1/1111</b> и <b>teacher1/1111</b>.
        </p>
      </form>
    </div>
  );
}
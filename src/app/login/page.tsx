"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/user-context";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useCurrentUser();

  const [mode, setMode] = useState<Mode>("login");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [inviteCode, setInviteCode] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("login-pattern");
    return () => {
      root.classList.remove("login-pattern");
    };
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setLoginError(null);
    setRegError(null);
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: loginUsername, password: loginPassword }),
    });
    setLoginLoading(false);
    if (!res.ok) {
      setLoginError("Неверный логин или пароль");
      return;
    }
    await res.json();
    await refresh();
    router.push("/catalog");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: regUsername,
        password: regPassword,
        name: regName,
        role: regRole,
        inviteCode: regRole === "TEACHER" ? inviteCode : undefined,
      }),
    });
    setRegLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRegError(data?.error ?? "Не удалось зарегистрироваться");
      return;
    }
    await refresh();
    router.push("/catalog");
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => switchMode("login")}
          className={`rounded-xl px-4 py-2 text-sm ${
            mode === "login" ? "bg-gray-900 text-white" : "border bg-white text-gray-700"
          }`}
        >
          Вход
        </button>
        <button
          onClick={() => switchMode("register")}
          className={`rounded-xl px-4 py-2 text-sm ${
            mode === "register" ? "bg-gray-900 text-white" : "border bg-white text-gray-700"
          }`}
        >
          Регистрация
        </button>
      </div>

      {mode === "login" && (
        <form onSubmit={handleLogin} className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold">Вход</h1>
          <div className="space-y-1">
            <label className="block text-sm text-gray-700">Логин</label>
            <input
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="student1 / teacher1"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-gray-700">Пароль</label>
            <input
              type="password"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="1111"
            />
          </div>
          {loginError && <p className="text-sm text-red-600">{loginError}</p>}
          <button
            disabled={loginLoading}
            className="w-full rounded-xl bg-gray-900 px-3 py-2 text-white disabled:opacity-60"
          >
            {loginLoading ? "Входим..." : "Войти"}
          </button>
        </form>
      )}

      {mode === "register" && (
        <form onSubmit={handleRegister} className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold">Регистрация</h1>
          <div className="space-y-1">
            <label className="block text-sm text-gray-700">Как вас зовут?</label>
            <input
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Имя и фамилия"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-gray-700">Логин</label>
            <input
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
              placeholder="Например, student99"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-gray-700">Пароль</label>
            <input
              type="password"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-gray-700">Роль</label>
            <div className="flex gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="reg-role"
                  checked={regRole === "STUDENT"}
                  onChange={() => setRegRole("STUDENT")}
                />
                Студент
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="reg-role"
                  checked={regRole === "TEACHER"}
                  onChange={() => setRegRole("TEACHER")}
                />
                Преподаватель
              </label>
            </div>
          </div>
          {regRole === "TEACHER" && (
            <div className="space-y-1">
              <label className="block text-sm text-gray-700">Код приглашения преподавателя</label>
              <input
                className="w-full rounded-xl border px-3 py-2 uppercase outline-none focus:ring"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Например, ABCD1234"
                required
              />
              <p className="text-xs text-gray-500">Код выдаёт администратор системы.</p>
            </div>
          )}
          {regError && <p className="text-sm text-red-600">{regError}</p>}
          <button
            disabled={regLoading}
            className="w-full rounded-xl bg-gray-900 px-3 py-2 text-white disabled:opacity-60"
          >
            {regLoading ? "Регистрируем..." : "Создать аккаунт"}
          </button>
        </form>
      )}
    </div>
  );
}

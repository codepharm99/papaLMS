"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/user-context";
import FinisherLights from "@/components/FinisherLights";
import { useLanguage } from "@/components/language-context";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useCurrentUser();
  const { language, setLanguage } = useLanguage();
  const tr = useMemo(
    () => (ru: string, en: string) => (language === "ru" ? ru : en),
    [language]
  );

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
      setLoginError(tr("Неверный логин или пароль", "Incorrect username or password"));
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
      setRegError(data?.error ?? tr("Не удалось зарегистрироваться", "Registration failed"));
      return;
    }
    await refresh();
    router.push("/catalog");
  }

  return (
    <div className="relative z-10 mx-auto max-w-5xl py-10 px-4 sm:px-6 lg:px-8">
      <FinisherLights />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-indigo-100/60 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-8 text-white shadow-xl shadow-indigo-300/40">
          <div className="text-xs uppercase tracking-[0.3em] text-white/70">{tr("papaLMS", "papaLMS")}</div>
          <h1 className="mt-3 text-3xl font-bold leading-tight">{tr("Вход и регистрация", "Sign in / Sign up")}</h1>
          <p className="mt-2 text-sm text-white/85">{tr("Управляйте курсами, тестами и профилем в одном месте.", "Manage courses, tests, and your profile in one place.")}</p>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="font-semibold">{tr("Доступ для студентов", "Student access")}</div>
              <p className="text-white/80">{tr("Смотрите курсы, проходите тесты и отслеживайте прогресс.", "View courses, take tests, and track progress.")}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <div className="font-semibold">{tr("Доступ для преподавателей", "Teacher access")}</div>
              <p className="text-white/80">{tr("Создавайте курсы, назначайте тесты и общайтесь со студентами.", "Create courses, assign tests, and interact with students.")}</p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3 text-sm">
            <span className="text-white/70">{tr("Язык интерфейса", "Interface language")}:</span>
            <div className="flex gap-2">
              {(["ru", "en"] as const).map((lng) => (
                <button
                  key={lng}
                  onClick={() => setLanguage(lng)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur ${
                    language === lng ? "border-white bg-white/20 text-white" : "border-white/40 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={() => switchMode("login")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                mode === "login" ? "bg-gray-900 text-white shadow-md" : "border bg-white text-gray-700"
              }`}
            >
              {tr("Вход", "Sign in")}
            </button>
            <button
              onClick={() => switchMode("register")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                mode === "register" ? "bg-gray-900 text-white shadow-md" : "border bg-white text-gray-700"
              }`}
            >
              {tr("Регистрация", "Sign up")}
            </button>
          </div>

          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{tr("Логин", "Username")}</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="student1 / teacher1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{tr("Пароль", "Password")}</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••"
                />
              </div>
              {loginError && <p className="text-sm text-red-600">{loginError}</p>}
              <button
                disabled={loginLoading}
                className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-white shadow hover:bg-indigo-700 disabled:opacity-60"
              >
                {loginLoading ? tr("Входим...", "Signing in...") : tr("Войти", "Sign in")}
              </button>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{tr("Как вас зовут?", "Your name")}</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={tr("Имя и фамилия", "First and last name")}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{tr("Логин", "Username")}</label>
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder={tr("Например, student99", "For example, student99")}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{tr("Пароль", "Password")}</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{tr("Роль", "Role")}</label>
                <div className="mt-1 flex gap-3 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="reg-role"
                      checked={regRole === "STUDENT"}
                      onChange={() => setRegRole("STUDENT")}
                    />
                    {tr("Студент", "Student")}
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="reg-role"
                      checked={regRole === "TEACHER"}
                      onChange={() => setRegRole("TEACHER")}
                    />
                    {tr("Преподаватель", "Teacher")}
                  </label>
                </div>
              </div>
              {regRole === "TEACHER" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">{tr("Код приглашения преподавателя", "Teacher invite code")}</label>
                  <input
                    className="mt-1 w-full rounded-xl border px-3 py-2 uppercase outline-none focus:ring"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="ABCD1234"
                    required
                  />
                  <p className="text-xs text-gray-500">{tr("Код выдаёт администратор системы.", "The admin provides the code.")}</p>
                </div>
              )}
              {regError && <p className="text-sm text-red-600">{regError}</p>}
              <button
                disabled={regLoading}
                className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-white shadow hover:bg-indigo-700 disabled:opacity-60"
              >
                {regLoading ? tr("Регистрируем...", "Registering...") : tr("Создать аккаунт", "Create account")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

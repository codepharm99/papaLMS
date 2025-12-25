"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/user-context";
import { useLanguage } from "@/components/language-context";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useCurrentUser();
  const { language, setLanguage } = useLanguage();
  const tr = useMemo(
    () => (ru: string, en: string) => (language === "ru" ? ru : en),
    [language]
  );

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("login-full");
    return () => {
      document.body.classList.remove("login-full");
    };
  }, []);

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

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto grid min-h-screen max-w-5xl items-center px-4 py-14 sm:px-8">
        <div className="rounded-3xl border border-gray-200 p-8 lg:p-12">
          <div className="grid items-center gap-10 md:grid-cols-[1.05fr,0.95fr]">
            <div className="space-y-5">
              <div className="text-xs uppercase tracking-[0.35em] text-gray-500">papaLMS</div>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{tr("Вход", "Sign in")}</h1>
              <p className="max-w-xl text-base text-gray-600">
                {tr("Авторизуйтесь, чтобы получить доступ к курсам, тестам и управлению профилем.", "Log in to access courses, tests, and profile management.")}
              </p>
              <div className="grid gap-3 text-sm text-gray-700">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full accent-blue" />
                  <span>{tr("Быстрый доступ к курсам", "Fast access to courses")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full accent-green" />
                  <span>{tr("Тесты и прогресс в одном месте", "Tests and progress in one place")}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["ru", "en"] as const).map((lng) => (
                  <button
                    key={lng}
                    onClick={() => setLanguage(lng)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      language === lng ? "border-blue-600 text-blue-600" : "border-gray-300 text-gray-600 hover:border-blue-600 hover:text-blue-600"
                    }`}
                  >
                    {lng.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5 rounded-2xl border border-gray-200 p-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{tr("Логин", "Username")}</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="student1 / teacher1"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{tr("Пароль", "Password")}</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••"
                />
              </div>
              {loginError && <p className="text-sm text-blue-600">{loginError}</p>}
              <button
                disabled={loginLoading}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {loginLoading ? tr("Входим...", "Signing in...") : tr("Войти", "Sign in")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

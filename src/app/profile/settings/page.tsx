"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Monitor, Bell, BellOff, Globe2, RotateCcw } from "lucide-react";
import { useLanguage } from "@/components/language-context";

const THEME_KEY = "lms-theme";
const NOTIFY_KEY = "lms-notify";
const themes = [
  { value: "auto", label: { ru: "Авто", en: "Auto" }, icon: Monitor },
  { value: "light", label: { ru: "Светлая", en: "Light" }, icon: Sun },
  { value: "dark", label: { ru: "Тёмная", en: "Dark" }, icon: Moon },
];

function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ProfileSettings() {
  const [theme, setTheme] = useState<string>("auto");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(false);
  const { language, setLanguage } = useLanguage();
  const t = useMemo(() => translations[language], [language]);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) || "auto";
    setTheme(saved);
    const savedNotify = localStorage.getItem(NOTIFY_KEY);
    if (savedNotify) {
      try {
        const parsed = JSON.parse(savedNotify);
        setNotifyEmail(Boolean(parsed.email));
        setNotifyPush(Boolean(parsed.push));
      } catch (e) {
        // ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    let applied = theme;
    if (theme === "auto") applied = getSystemTheme();
    if (applied === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(NOTIFY_KEY, JSON.stringify({ email: notifyEmail, push: notifyPush }));
  }, [notifyEmail, notifyPush]);

  useEffect(() => {
    // language persistence handled in LanguageProvider
  }, [language]);

  const resetAll = () => {
    setTheme("auto");
    setNotifyEmail(true);
    setNotifyPush(false);
    setLanguage("ru");
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-sm text-gray-500">{t.subtitle}</p>
        </div>
        <button
          onClick={resetAll}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <RotateCcw className="h-4 w-4" />
          {t.reset}
        </button>
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <label className="block text-sm font-medium mb-3 text-gray-800 dark:text-gray-200">{t.theme.title}</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              className={`relative flex items-center gap-2 rounded-lg border px-4 py-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/60 ${
                theme === value
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              tabIndex={0}
            >
              <Icon className="h-5 w-5" />
              {label[language]}
              {theme === value && (
                <motion.span
                  layoutId="theme-active"
                  className="absolute inset-0 rounded-lg ring-2 ring-primary/60 pointer-events-none"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
        <p className="text-gray-500 text-xs mt-3">{t.theme.hint}</p>
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-indigo-500" />
          <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">{t.language.title}</label>
        </div>
        <p className="text-xs text-gray-500 mb-3">{t.language.hint}</p>
        <div className="flex gap-2">
          {[
            { value: "ru", label: t.language.ru },
            { value: "en", label: t.language.en },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLanguage(opt.value as "ru" | "en")}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                language === opt.value
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-500">
          {t.language.active}: <span className="font-semibold text-gray-700 dark:text-gray-200">{language === "ru" ? t.language.ru : t.language.en}</span>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-indigo-500" />
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.notifications.title}</div>
            <p className="text-xs text-gray-500">{t.notifications.hint}</p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 cursor-pointer transition hover:border-indigo-200 dark:hover:border-indigo-500/50">
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.notifications.emailTitle}</div>
              <p className="text-xs text-gray-500">{t.notifications.emailDesc}</p>
            </div>
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
              className="h-5 w-5 accent-indigo-600"
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 cursor-pointer transition hover:border-indigo-200 dark:hover:border-indigo-500/50">
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.notifications.pushTitle}</div>
              <p className="text-xs text-gray-500">{t.notifications.pushDesc}</p>
            </div>
            <input
              type="checkbox"
              checked={notifyPush}
              onChange={(e) => setNotifyPush(e.target.checked)}
              className="h-5 w-5 accent-indigo-600"
            />
          </label>
          {!notifyEmail && !notifyPush && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <BellOff className="h-4 w-4" />
              {t.notifications.warning}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const translations: Record<
  "ru" | "en",
  {
    title: string;
    subtitle: string;
    reset: string;
    theme: { title: string; hint: string };
    language: { title: string; hint: string; ru: string; en: string; active: string };
    notifications: {
      title: string;
      hint: string;
      emailTitle: string;
      emailDesc: string;
      pushTitle: string;
      pushDesc: string;
      warning: string;
    };
  }
> = {
  ru: {
    title: "Настройки",
    subtitle: "Подберите тему, язык и уведомления под себя.",
    reset: "Сбросить",
    theme: {
      title: "Тема интерфейса",
      hint: "Выбранная тема сохранится для этого браузера. «Авто» подстраивается под систему.",
    },
    language: {
      title: "Язык интерфейса",
      hint: "Сохраняется в браузере; влияет на будущие сеансы.",
      ru: "Русский",
      en: "English",
      active: "Активный язык",
    },
    notifications: {
      title: "Уведомления",
      hint: "Локальные предпочтения. Сервисные уведомления могут приходить независимо.",
      emailTitle: "Письма на email",
      emailDesc: "Напоминания о занятиях и новые сообщения.",
      pushTitle: "Пуш-уведомления",
      pushDesc: "Быстрые всплывающие уведомления в браузере.",
      warning: "Вы отключили все уведомления — можно пропустить важные события.",
    },
  },
  en: {
    title: "Settings",
    subtitle: "Adjust theme, language, and notifications.",
    reset: "Reset",
    theme: {
      title: "Interface theme",
      hint: "The chosen theme is saved in this browser. “Auto” follows system preference.",
    },
    language: {
      title: "Interface language",
      hint: "Stored in your browser; affects future sessions.",
      ru: "Русский",
      en: "English",
      active: "Active language",
    },
    notifications: {
      title: "Notifications",
      hint: "Local preferences. Service messages may arrive regardless.",
      emailTitle: "Email updates",
      emailDesc: "Class reminders and new messages.",
      pushTitle: "Push notifications",
      pushDesc: "Quick browser pop-up alerts.",
      warning: "All notifications are off — you might miss important updates.",
    },
  },
};

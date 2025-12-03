"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";

const THEME_KEY = "lms-theme";
const themes = [
  { value: "auto", label: "Авто", icon: Monitor },
  { value: "light", label: "Светлая", icon: Sun },
  { value: "dark", label: "Тёмная", icon: Moon },
];

function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ProfileSettings() {
  const [theme, setTheme] = useState<string>("auto");

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) || "auto";
    setTheme(saved);
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

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Настройки</h1>
      <div className="mb-8">
        <label className="block text-sm font-medium mb-3">Тема интерфейса</label>
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
              {label}
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
        <p className="text-gray-500 text-xs mt-3">
          <span className="hidden sm:inline">Выбранная тема сохранится для этого браузера. </span>
          <span>«Авто» — подстраивается под системные настройки.</span>
        </p>
      </div>
    </div>
  );
}

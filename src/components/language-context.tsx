"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Language = "ru" | "en";

type LanguageContextShape = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextShape | undefined>(undefined);

export const LANG_KEY = "lms-lang";

const detectSystemLanguage = (): Language => {
  if (typeof window === "undefined") return "ru";
  const browser = (navigator.language || navigator.languages?.[0] || "ru").toLowerCase();
  return browser.startsWith("en") ? "en" : "ru";
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ru");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = (localStorage.getItem(LANG_KEY) as Language | null) || null;
    setLanguageState(stored ?? detectSystemLanguage());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.setAttribute("lang", language);
    localStorage.setItem(LANG_KEY, language);
  }, [language]);

  const setLanguage = (lang: Language) => setLanguageState(lang);

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

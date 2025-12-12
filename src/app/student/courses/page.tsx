"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-context";

export default function StudentCoursesPage() {
  const { language } = useLanguage();
  const tr = (ru: string, en: string) => (language === "ru" ? ru : en);
  const heroPaint: CSSProperties = {
    "--module-accent-1": "224 92% 68%",
    "--module-accent-2": "281 82% 68%",
    "--module-accent-3": "325 78% 66%",
  };
  const emptyPaint: CSSProperties = {
    "--module-accent-1": "205 80% 78%",
    "--module-accent-2": "192 76% 72%",
    "--module-accent-3": "178 70% 70%",
  };
  const pagePaint: CSSProperties = {
    "--aurora-accent-1": "223 92% 66%",
    "--aurora-accent-2": "260 82% 66%",
    "--aurora-accent-3": "308 76% 64%",
  };
  return (
    <section className="page-aurora space-y-5 rounded-3xl p-1" style={pagePaint}>
      <div
        className="module-illustration rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-500 px-6 py-5 text-white shadow-lg"
        style={heroPaint}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-white/70">{tr("Лента студента", "Student feed")}</p>
        <h1 className="mt-2 text-2xl font-bold">{tr("Мои курсы", "My courses")}</h1>
        <p className="text-sm text-white/80">
          {tr("Следите за записанными курсами и подключайтесь к новым.", "Track your enrolled courses and join new ones.")}
        </p>
      </div>
      <div
        className="module-illustration light rounded-2xl border border-dashed bg-white/95 p-6 shadow-sm"
        style={emptyPaint}
      >
        <p className="font-medium text-gray-900">{tr("Пока нет записанных курсов.", "No enrolled courses yet.")}</p>
        <p className="mt-1 text-sm text-gray-600">
          {tr("Загляните в каталог, чтобы выбрать и записаться на подходящие курсы.", "Browse the catalog to pick and join courses.")}
        </p>
        <Link
          href="/catalog"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {tr("Открыть каталог курсов", "Open course catalog")}
        </Link>
      </div>
    </section>
  );
}

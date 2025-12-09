"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-context";

export default function StudentCoursesPage() {
  const { language } = useLanguage();
  const tr = (ru: string, en: string) => (language === "ru" ? ru : en);
  return (
    <section className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-500 px-6 py-5 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.25em] text-white/70">{tr("Лента студента", "Student feed")}</p>
        <h1 className="mt-2 text-2xl font-bold">{tr("Мои курсы", "My courses")}</h1>
        <p className="text-sm text-white/80">
          {tr("Следите за записанными курсами и подключайтесь к новым.", "Track your enrolled courses and join new ones.")}
        </p>
      </div>
      <div className="rounded-2xl border border-dashed bg-white p-6 shadow-sm">
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

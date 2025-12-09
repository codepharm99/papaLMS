"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-context";

export default function TeacherToolsPage() {
  const { language } = useLanguage();
  const tr = (ru: string, en: string) => (language === "ru" ? ru : en);
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 px-6 py-5 text-white shadow-xl">
        <p className="text-xs uppercase tracking-[0.3em] text-white/70">{tr("Инструменты преподавателя", "Teacher tools")}</p>
        <h1 className="mt-2 text-2xl font-bold">{tr("Быстрый доступ к сервисам", "Quick access to tools")}</h1>
        <p className="text-sm text-white/80">
          {tr("Управляйте презентациями и тестами в одном месте.", "Manage presentations and tests in one place.")}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/teacher/tools/presentations"
          className="group block overflow-hidden rounded-2xl border border-indigo-100 bg-white p-5 shadow-lg shadow-indigo-100/50 transition-transform hover:-translate-y-1"
        >
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-indigo-600">
            <span>{tr("Презентации", "Presentations")}</span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">beta</span>
          </div>
          <div className="text-base font-semibold text-gray-900">{tr("Генератор показов", "Slide generator")}</div>
          <p className="mt-2 text-sm text-gray-600">
            {tr("Создавайте слайды и открывайте показ во весь экран для студентов.", "Create slides and present full-screen to students.")}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-indigo-600 group-hover:underline">
            {tr("Открыть генератор", "Open generator")} →
          </div>
        </Link>
        <Link
          href="/teacher/tests"
          className="group block overflow-hidden rounded-2xl border border-indigo-100 bg-white p-5 shadow-lg shadow-indigo-100/50 transition-transform hover:-translate-y-1"
        >
          <div className="mb-1 text-xs uppercase tracking-wide text-indigo-600">{tr("Тестирование", "Testing")}</div>
          <div className="text-base font-semibold text-gray-900">{tr("Создание и прошедшие тесты", "Create and past tests")}</div>
          <div className="mt-3 inline-flex items-center text-sm text-indigo-600 group-hover:underline">
            {tr("Открыть", "Open")} →
          </div>
        </Link>
      </div>
    </div>
  );
}

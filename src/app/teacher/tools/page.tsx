"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-context";

export default function TeacherToolsPage() {
  const { language } = useLanguage();
  const tr = (ru: string, en: string) => (language === "ru" ? ru : en);
  const heroPaint: CSSProperties = {
    "--module-accent-1": "252 88% 66%",
    "--module-accent-2": "297 74% 64%",
    "--module-accent-3": "330 76% 64%",
  };
  const pagePaint: CSSProperties = {
    "--aurora-accent-1": "223 92% 66%",
    "--aurora-accent-2": "260 82% 66%",
    "--aurora-accent-3": "308 76% 64%",
  };
  return (
    <div className="page-aurora space-y-6 rounded-3xl p-1" style={pagePaint}>
      <div
        className="module-illustration rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 px-6 py-5 text-white shadow-xl"
        style={heroPaint}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-white/70">{tr("Инструменты преподавателя", "Teacher tools")}</p>
        <h1 className="mt-2 text-2xl font-bold">{tr("Быстрый доступ к сервисам", "Quick access to tools")}</h1>
        <p className="text-sm text-white/80">
          {tr("Управляйте презентациями и тестами в одном месте.", "Manage presentations and tests in one place.")}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/teacher/tools/ai"
          className="module-illustration light group block overflow-hidden rounded-2xl border border-indigo-100 bg-white/95 p-5 shadow-lg shadow-indigo-100/50 transition-transform hover:-translate-y-1"
          style={{
            "--module-accent-1": "214 86% 76%",
            "--module-accent-2": "245 80% 74%",
            "--module-accent-3": "276 76% 70%",
          } as CSSProperties}
        >
          <div className="mb-1 text-xs uppercase tracking-wide text-indigo-600">AI-помощник</div>
          <div className="text-base font-semibold text-gray-900">Чат для тестов и оценок</div>
          <p className="mt-2 text-sm text-black">
            Описывайте задачи в свободной форме — помощник создаст тесты или обновит оценки студентов ваших курсов.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-indigo-600 group-hover:underline">
            Открыть чат →
          </div>
        </Link>
        <Link
          href="/teacher/tools/presentations"
          className="module-illustration light group block overflow-hidden rounded-2xl border border-indigo-100 bg-white/95 p-5 shadow-lg shadow-indigo-100/50 transition-transform hover:-translate-y-1"
          style={{
            "--module-accent-1": "244 86% 76%",
            "--module-accent-2": "280 78% 74%",
            "--module-accent-3": "320 76% 70%",
          } as CSSProperties}
        >
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-indigo-600">
            <span>{tr("Презентации", "Presentations")}</span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">beta</span>
          </div>
          <div className="text-base font-semibold text-gray-900">{tr("Генератор показов", "Slide generator")}</div>
          <p className="mt-2 text-sm text-black">
            {tr("Создавайте слайды и открывайте показ во весь экран для студентов.", "Create slides and present full-screen to students.")}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-indigo-600 group-hover:underline">
            {tr("Открыть генератор", "Open generator")} →
          </div>
        </Link>
        <Link
          href="/teacher/tests"
          className="module-illustration light group block overflow-hidden rounded-2xl border border-indigo-100 bg-white/95 p-5 shadow-lg shadow-indigo-100/50 transition-transform hover:-translate-y-1"
          style={{
            "--module-accent-1": "205 82% 76%",
            "--module-accent-2": "190 76% 70%",
            "--module-accent-3": "175 74% 68%",
          } as CSSProperties}
        >
          <div className="mb-1 text-xs uppercase tracking-wide text-indigo-600">{tr("Тестирование", "Testing")}</div>
          <div className="text-base font-semibold text-gray-900">{tr("Создание и прошедшие тесты", "Create and past tests")}</div>
          <div className="mt-3 inline-flex items-center text-sm text-indigo-600 group-hover:underline">
            {tr("Открыть", "Open")} →
          </div>
        </Link>
        <Link
          href="/teacher/tools/analytics"
          className="group block rounded-xl border bg-white p-5 text-gray-900 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Аналитика</div>
          <div className="text-base font-medium text-gray-900">Тесты и студенты</div>
          <p className="mt-2 text-sm text-black">
            Сводка по созданным тестам, назначениям студентам и активности по публичным ссылкам.
          </p>
          <div className="mt-3 inline-flex items-center text-sm text-blue-600 group-hover:underline">
            Смотреть дашборд →
          </div>
        </Link>
        <Link
          href="/teacher/tools/marks"
          className="group block rounded-xl border bg-white p-5 text-gray-900 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Оценивание</div>
          <div className="text-base font-medium text-gray-900">Выставление баллов</div>
          <p className="mt-2 text-sm text-black">
            Выберите курс, студента и неделю, чтобы сохранить баллы за лекцию, практику, инд.работу, рейтинг, мидтерм или экзамен.
          </p>
          <div className="mt-3 inline-flex items-center text-sm text-blue-600 group-hover:underline">
            Открыть →
          </div>
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

export default function TeacherToolsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Инструменты преподавателя</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/teacher/tools/presentations"
          className="group block rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Презентации</div>
          <div className="text-base font-medium">Генератор показов</div>
          <p className="mt-2 text-sm text-gray-600">
            Создавайте слайды с текстом и фотографиями, открывайте показ в отдельном окне во весь экран.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 group-hover:underline">
            Открыть генератор →
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">beta</span>
          </div>
        </Link>
        <Link
          href="/teacher/tests"
          className="group block rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Тестирование</div>
          <div className="text-base font-medium">Создание тестов и прошлые тесты</div>
          <div className="mt-3 inline-flex items-center text-sm text-blue-600 group-hover:underline">
            Открыть →
          </div>
        </Link>
        <Link
          href="/teacher/tools/analytics"
          className="group block rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Аналитика</div>
          <div className="text-base font-medium">Тесты и студенты</div>
          <p className="mt-2 text-sm text-gray-600">
            Сводка по созданным тестам, назначениям студентам и активности по публичным ссылкам.
          </p>
          <div className="mt-3 inline-flex items-center text-sm text-blue-600 group-hover:underline">
            Смотреть дашборд →
          </div>
        </Link>
      </div>
    </div>
  );
}

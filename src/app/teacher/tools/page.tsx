"use client";

import Link from "next/link";

export default function TeacherToolsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Инструменты преподавателя</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/teacher/tests"
          className="group block rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">Тестирование</div>
          <div className="text-base font-medium">Создание и прошедшие тесты</div>
          <div className="mt-3 inline-flex items-center text-sm text-blue-600 group-hover:underline">
            Открыть →
          </div>
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function StudentCoursesPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Мои курсы</h1>
      <div className="rounded-2xl border border-dashed bg-white p-6">
        <p className="font-medium text-gray-900">Пока нет записанных курсов.</p>
        <p className="mt-1 text-sm text-gray-600">
          Загляните в каталог, чтобы выбрать и записаться на подходящие курсы.
        </p>
        <Link
          href="/catalog"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Открыть каталог курсов
        </Link>
      </div>
    </section>
  );
}

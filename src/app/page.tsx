import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="bg-white text-gray-900 dark:bg-black dark:text-white">
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at top, rgba(99,102,241,.35), transparent 45%), radial-gradient(circle at 20% 20%, rgba(236,72,153,.25), transparent 40%), radial-gradient(circle at 80% 0%, rgba(59,130,246,.25), transparent 50%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/90 to-white dark:from-black/80 dark:via-black/90 dark:to-black" aria-hidden="true" />

        <section className="relative z-10 flex min-h-screen w-full flex-col justify-center gap-14 p-0">
          <div className="grid gap-10 lg:grid-cols-[3fr,2fr] lg:items-center">
            <div className="space-y-6 text-center lg:text-left">
              <p className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:border-white/20 dark:text-gray-300">
                Новая академическая платформа
              </p>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
              LMS, которая понимает расписание, курсы и реальную нагрузку
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Управляйте очными и дистанционными курсами, проверяйте работы, следите за прогрессом студентов и делитесь материалами в одном адаптивном пространстве.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/login" aria-label="Войти в систему" className="w-full sm:w-auto">
                <span className="inline-flex w-full items-center justify-center rounded-xl bg-black px-8 py-3 text-lg font-medium text-white transition hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100">
                  Войти в платформу
                </span>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 text-base font-medium text-gray-900 underline-offset-4 hover:underline dark:text-white"
              >
                Посмотреть возможности →
              </a>
            </div>
            <div className="grid gap-6 rounded-2xl border border-gray-100 bg-white/80 p-6 text-left shadow-lg backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white sm:grid-cols-3">
              {[
                { label: "Активных курсов", value: "120+" },
                { label: "Студентов онлайн", value: "4 500" },
                { label: "Средний рейтинг", value: "4.9/5" },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-3xl font-semibold">{item.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white/80 p-6 shadow-2xl shadow-black/5 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-300">Панель преподавателя</p>
            <div className="mt-4 space-y-4">
              {[
                {
                  title: "Назначение заданий",
                  description: "Назначайте тесты и проекты по группам, автоматически выдавая дедлайны и напоминания.",
                },
                {
                  title: "Аналитика прогресса",
                  description: "Отслеживайте вовлеченность, посещаемость и KPI по каждому курсу в реальном времени.",
                },
                {
                  title: "Тестирование",
                  description: "Редактор вопросов, автопроверка и индивидуальная обратная связь для студентов.",
                },
                {
                  title: "Материалы и уведомления",
                  description: "Библиотека лекций, файлов и быстрые анонсы для потоков и малых групп.",
                },
              ].map((feature, idx) => (
                <div key={feature.title} className="flex items-start gap-4 rounded-2xl bg-gray-50/80 p-4 dark:bg-white/5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
                    0{idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{feature.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>

          {/* Features */}
          <section id="features" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[{
            title: "Интеллектуальные тесты",
            description: "Создавайте задания за минуты, отслеживайте попытки и мгновенно получайте статистику по вопросам.",
          },
          {
            title: "Личная карьера студента",
            description: "Подборка материалов, KPI, GPA и рекомендации на основе текущего прогресса.",
          },
          {
            title: "Уведомления и расписания",
            description: "Синхронизация с календарями, напоминания о дедлайнах и автоматические объявления для групп.",
          }].map(card => (
            <article key={card.title} className="rounded-2xl border border-gray-100 bg-white/90 p-6 shadow-lg shadow-black/5 backdrop-blur dark:border-white/10 dark:bg-white/5">
              <h3 className="text-xl font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{card.description}</p>
            </article>
          ))}
        </section>

        {/* Highlight */}
        <section className="rounded-3xl border border-dashed border-gray-200 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-8 text-center text-gray-900 dark:border-white/10 dark:text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-gray-300">доверяют университеты</p>
          <p className="mt-4 text-2xl font-semibold">“LMS помогла нашим преподавателям сократить время на проверки на 40% и увеличила вовлеченность студентов”</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">— декан факультета информационных технологий</p>
        </section>
        </section>
      </section>
    </main>
  );
}

import Image from "next/image";

const mambetyFaces = [
  { src: "/mambety/mambety-1.jpg", alt: "Мамбеты разработчики 1", motion: "mambet-float-1" },
  { src: "/mambety/mambety-2.jpg", alt: "Мамбеты разработчики 2", motion: "mambet-float-2" },
  { src: "/mambety/mambety-3.jpg", alt: "Мамбеты разработчики 3", motion: "mambet-float-3" },
  { src: "/mambety/mambety-4.jpg", alt: "Мамбеты разработчики 4", motion: "mambet-float-4" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-transparent px-6 py-16 text-center text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <p className="text-xs uppercase tracking-[0.35em] text-purple-200">papaLMS</p>
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
          Образовательная платформа, которая работает в ритме преподавателей и студентов
        </h1>
        <p className="text-lg text-slate-300">
          Расписания, курсы и коммуникация в одной темной среде с динамическим фоном и плавными переходами.
        </p>
        <p className="text-sm text-slate-400">
          Войти, регистрироваться и продолжать работать — остальное заботится сама платформа.
        </p>
        <div className="mt-10 space-y-6">
          <p className="text-xs uppercase tracking-[0.35em] text-purple-200/80">
            мамбеты (разработчики)
          </p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {mambetyFaces.map((face) => (
              <div
                key={face.src}
                className={`relative mx-auto flex h-32 w-32 items-center justify-center rounded-[32%] bg-white/5 p-1 shadow-[0_20px_40px_rgba(17,20,50,0.55)] ring-1 ring-white/10 ${face.motion}`}
              >
                <div
                  className="absolute inset-2 rounded-[36%] bg-purple-500/15 blur-xl"
                  aria-hidden="true"
                />
                <Image
                  src={face.src}
                  alt={face.alt}
                  width={160}
                  height={160}
                  className="relative h-full w-full rounded-[30%] object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

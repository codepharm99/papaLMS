"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useCurrentUser } from "@/components/user-context";

type SlideDraft = { id: string; text: string; imageDataUrl?: string };
type Presentation = { id: string; title: string; slides: SlideDraft[]; createdAt: number };

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

export default function PresentationsTool() {
  const { user } = useCurrentUser();

  const [presentationTitle, setPresentationTitle] = useState("Новая презентация");
  const [slides, setSlides] = useState<SlideDraft[]>([{ id: makeId(), text: "" }]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [liveSlides, setLiveSlides] = useState<SlideDraft[]>([]);
  const [livePresentation, setLivePresentation] = useState<Presentation | null>(null);
  const [liveIndex, setLiveIndex] = useState(0);
  const [shareBase] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const liveSlide = liveSlides[liveIndex] || null;
  const liveHasImage = Boolean(liveSlide?.imageDataUrl);
  const liveHasText = Boolean(liveSlide?.text);
  const liveImageLeft = liveIndex % 2 === 0; // чередуем слева/справа

  const updateSlideText = (id: string, text: string) => {
    setSlides(prev => prev.map(s => (s.id === id ? { ...s, text } : s)));
  };

  const updateSlideFile = async (id: string, file: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setSlides(prev => prev.map(s => (s.id === id ? { ...s, imageDataUrl: dataUrl } : s)));
    } catch {
      alert("Не удалось загрузить изображение");
    }
  };

  const addSlide = () => setSlides(prev => [...prev, { id: makeId(), text: "" }]);

  const removeSlide = (id: string) => {
    setSlides(prev => {
      if (prev.length === 1) return [{ id: makeId(), text: "" }];
      return prev.filter(s => s.id !== id);
    });
  };

  const resetPresentationDraft = () => {
    setPresentationTitle("Новая презентация");
    setSlides([{ id: makeId(), text: "" }]);
  };

  const savePresentation = () => {
    const safeTitle = presentationTitle.trim() || "Без названия";
    const preparedSlides = slides
      .map(s => ({ ...s, text: s.text.trim() }))
      .filter(s => s.text || s.imageDataUrl);
    if (preparedSlides.length === 0) {
      alert("Добавьте хотя бы один слайд с текстом или изображением");
      return;
    }
    const created: Presentation = { id: makeId(), title: safeTitle, slides: preparedSlides, createdAt: Date.now() };
    setPresentations(prev => [created, ...prev]);
    resetPresentationDraft();
  };

  const startPresentation = (p: Presentation) => {
    const slidesToShow = p.slides.filter(s => s.text || s.imageDataUrl);
    if (slidesToShow.length === 0) {
      alert("В презентации нет слайдов для показа");
      return;
    }
    setLiveSlides(slidesToShow);
    setLivePresentation({ ...p, slides: slidesToShow });
    setLiveIndex(0);
  };

  const stopPresentation = () => {
    setLivePresentation(null);
    setLiveSlides([]);
    setLiveIndex(0);
  };

  const nextSlide = () => {
    setLiveIndex(prev => {
      if (liveSlides.length === 0) return 0;
      return (prev + 1) % liveSlides.length;
    });
  };

  const prevSlide = () => {
    setLiveIndex(prev => {
      if (liveSlides.length === 0) return 0;
      return (prev - 1 + liveSlides.length) % liveSlides.length;
    });
  };

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };

  useEffect(() => {
    if (!livePresentation || liveSlides.length === 0) return;
    const total = liveSlides.length;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setLiveIndex(prev => (prev + 1) % total);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setLiveIndex(prev => (prev - 1 + total) % total);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        stopPresentation();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [livePresentation, liveSlides.length]);

  const buildShareUrl = (p: Presentation) => {
    if (!shareBase) return "";
    const payload = {
      title: p.title,
      slides: p.slides.map(s => ({ text: s.text, imageDataUrl: s.imageDataUrl })),
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(payload)));
    // payload кладём в hash, чтобы не ходить на сервер и не упираться в лимиты query
    return `${shareBase}/presentations/view#payload=${encoded}`;
  };

  const copyLink = async (p: Presentation) => {
    const url = buildShareUrl(p);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId(prev => (prev === p.id ? null : prev)), 2000);
    } catch {
      alert("Не удалось скопировать ссылку");
    }
  };

  if (!user) {
    return <div className="text-gray-500">Нужно войти.</div>;
  }

  if (user.role !== "TEACHER") {
    return <div className="text-gray-500">Доступ только для преподавателей.</div>;
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: "Инструменты", href: "/teacher/tools" },
          { label: "Презентации" },
        ]}
      />
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-gray-500">Инструменты преподавателя</div>
        <h1 className="text-2xl font-semibold">Генератор презентаций</h1>
        <p className="text-sm text-gray-600">
          Черновики хранятся только в этом браузере. Для показа нажмите «Показать студентам» — откроется полноэкранный режим без всплывающих окон.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-5 space-y-3 shadow-sm">
        <input
          className="w-full rounded-xl border px-3 py-2"
          placeholder="Название презентации"
          value={presentationTitle}
          onChange={(e) => setPresentationTitle(e.target.value)}
        />

        <div className="space-y-3">
          {slides.map((slide, idx) => (
            <div key={slide.id} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500">Слайд {idx + 1}</div>
                <button
                  type="button"
                  onClick={() => removeSlide(slide.id)}
                  className="text-xs text-red-500 underline disabled:opacity-50"
                  disabled={slides.length === 1}
                >
                  Удалить
                </button>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                Изображение (опционально)
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-sm"
                  onChange={(e) => updateSlideFile(slide.id, e.target.files?.[0] ?? null)}
                />
              </label>
              {slide.imageDataUrl && (
                <Image
                  src={slide.imageDataUrl}
                  alt=""
                  width={800}
                  height={480}
                  unoptimized
                  className="max-h-48 w-full rounded-lg object-contain border"
                />
              )}

              <label className="block text-sm font-medium text-gray-700">
                Текст для слайда
                <textarea
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="Краткий тезис, подписи к фото или список"
                  value={slide.text}
                  onChange={(e) => updateSlideText(slide.id, e.target.value)}
                />
              </label>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addSlide}
            className="rounded-xl border px-3 py-2 text-sm hover:border-gray-400"
          >
            Добавить слайд
          </button>
          <button
            type="button"
            onClick={resetPresentationDraft}
            className="rounded-xl border px-3 py-2 text-sm hover:border-gray-400"
          >
            Очистить черновик
          </button>
          <button
            type="button"
            onClick={savePresentation}
            className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white"
          >
            Создать черновик
          </button>
          <div className="text-xs text-gray-500">Для показа используйте кнопку ниже — он откроется в этом окне с возможностью полноэкранного режима.</div>
        </div>
      </div>

      {presentations.length > 0 && (
        <div className="rounded-2xl border bg-white p-4 space-y-2 shadow-sm">
          <div className="text-sm font-semibold">Черновики презентаций</div>
          <div className="text-xs text-gray-500">Локально в браузере (исчезнут после перезагрузки).</div>
          <ul className="space-y-2">
            {presentations.map(p => (
              <li key={p.id} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-gray-500">
                      Слайдов: {p.slides.length} · {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startPresentation(p)}
                      className="rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white"
                    >
                      Показать студентам
                    </button>
                    {shareBase ? (
                      <>
                        <a
                          href={buildShareUrl(p)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border px-3 py-2 text-sm hover:border-gray-400"
                        >
                          Открыть ссылку
                        </a>
                        <button
                          type="button"
                          onClick={() => copyLink(p)}
                          className="rounded-xl border px-3 py-2 text-sm hover:border-gray-400"
                        >
                          {copiedId === p.id ? "Ссылка скопирована" : "Скопировать ссылку"}
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">Ссылка появится после загрузки страницы</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPresentations(prev => prev.filter(x => x.id !== p.id))}
                      className="rounded-xl border px-3 py-2 text-sm hover:border-gray-400"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {livePresentation && liveSlides.length > 0 && (
        <div className="fixed inset-0 z-50 bg-white text-gray-900">
          <div className="mx-auto flex h-full max-w-5xl flex-col gap-4 px-4 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs uppercase tracking-wide text-gray-600">
                  Показ для студентов
                </div>
                <div className="text-xl font-semibold">{livePresentation.title}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {liveIndex + 1} / {liveSlides.length}
                </span>
                <button
                  type="button"
                  onClick={requestFullscreen}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:border-gray-500"
                >
                  Во весь экран
                </button>
                <button
                  type="button"
                  onClick={stopPresentation}
                  className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Закрыть
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-xl">
              <div
                className={`flex h-full flex-col gap-6 p-6 md:gap-10 ${
                  liveHasImage && liveHasText ? "md:flex-row" : "md:flex-col"
                } items-stretch justify-start`}>
                {liveHasImage && (
                  <div
                    className={`flex w-full items-center justify-center md:w-1/2 ${
                      liveHasText ? (liveImageLeft ? "order-1" : "order-2") : ""
                    }`}>
                    <Image
                      src={liveSlide?.imageDataUrl || ""}
                      alt=""
                      width={1400}
                      height={900}
                      unoptimized
                      className="max-h-[70vh] w-full rounded-xl object-contain border border-gray-200 bg-white"
                    />
                  </div>
                )}
                {liveHasText && (
                  <div
                    className={`flex w-full md:w-1/2 ${
                      liveHasImage ? (liveImageLeft ? "order-2" : "order-1") : ""
                    }`}>
                    <div
                      className="w-full max-w-3xl whitespace-pre-line text-left text-base leading-relaxed text-gray-900 md:text-lg"
                    >
                      {liveSlide?.text}
                    </div>
                  </div>
                )}
                {!liveHasImage && !liveHasText && (
                  <div className="text-center text-gray-500">Слайд пустой</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={prevSlide}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm hover:border-gray-500"
              >
                ← Назад
              </button>
              <div className="text-xs text-gray-500">Пробел/→ — далее, ← — назад, Esc — выйти</div>
              <button
                type="button"
                onClick={nextSlide}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Далее →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

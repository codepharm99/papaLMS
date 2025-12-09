"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useCurrentUser } from "@/components/user-context";
import { useLanguage } from "@/components/language-context";

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
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

export default function PresentationsTool() {
  const { user } = useCurrentUser();
  const { language } = useLanguage();
  const tr = (ru: string, en: string) => (language === "ru" ? ru : en);

  const [presentationTitle, setPresentationTitle] = useState(tr("Новая презентация", "New presentation"));
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
  const liveVariant = liveIndex % 2; // 0: img left, 1: img right
  const liveIsColumn = false;
  const liveImageFirst = liveVariant === 0;

  const updateSlideText = (id: string, text: string) => {
    setSlides(prev => prev.map(s => (s.id === id ? { ...s, text } : s)));
  };

  const updateSlideFile = async (id: string, file: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setSlides(prev => prev.map(s => (s.id === id ? { ...s, imageDataUrl: dataUrl } : s)));
    } catch {
      alert(tr("Не удалось загрузить изображение", "Failed to load image"));
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
    setPresentationTitle(tr("Новая презентация", "New presentation"));
    setSlides([{ id: makeId(), text: "" }]);
  };

  const savePresentation = () => {
    const safeTitle = presentationTitle.trim() || tr("Без названия", "Untitled");
    const preparedSlides = slides
      .map(s => ({ ...s, text: s.text.trim() }))
      .filter(s => s.text || s.imageDataUrl);
    if (preparedSlides.length === 0) {
      alert(tr("Добавьте хотя бы один слайд с текстом или изображением", "Add at least one slide with text or image"));
      return;
    }
    const created: Presentation = { id: makeId(), title: safeTitle, slides: preparedSlides, createdAt: Date.now() };
    setPresentations(prev => [created, ...prev]);
    resetPresentationDraft();
  };

  const startPresentation = (p: Presentation) => {
    const slidesToShow = p.slides.filter(s => s.text || s.imageDataUrl);
    if (slidesToShow.length === 0) {
      alert(tr("В презентации нет слайдов для показа", "Presentation has no slides to show"));
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
      alert(tr("Не удалось скопировать ссылку", "Failed to copy link"));
    }
  };

  if (!user) {
    return <div className="text-gray-500">{tr("Нужно войти.", "You need to log in.")}</div>;
  }

  if (user.role !== "TEACHER") {
    return <div className="text-gray-500">{tr("Доступ только для преподавателей.", "Teachers only.")}</div>;
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: tr("Инструменты", "Tools"), href: "/teacher/tools" },
          { label: tr("Презентации", "Presentations") },
        ]}
      />
      <div className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-600 p-6 text-white shadow-xl shadow-indigo-200/50">
        <div className="text-xs uppercase tracking-[0.3em] text-white/70">{tr("Инструменты преподавателя", "Teacher tools")}</div>
        <h1 className="mt-2 text-2xl font-bold">{tr("Генератор презентаций", "Presentation generator")}</h1>
        <p className="text-sm text-white/85">
          {tr("Черновики хранятся только в этом браузере. Для показа нажмите «Показать студентам» — откроется полноэкранный режим без всплывающих окон.", "Drafts live only in this browser. Use “Present to students” for fullscreen without pop-ups.")}
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-5 space-y-3 shadow-sm">
        <input
          className="w-full rounded-xl border px-3 py-2"
          placeholder={tr("Название презентации", "Presentation title")}
          value={presentationTitle}
          onChange={(e) => setPresentationTitle(e.target.value)}
        />

        <div className="space-y-3">
          {slides.map((slide, idx) => (
            <div key={slide.id} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500">{tr("Слайд", "Slide")} {idx + 1}</div>
                <button
                  type="button"
                  onClick={() => removeSlide(slide.id)}
                  className="text-xs text-red-500 underline disabled:opacity-50"
                  disabled={slides.length === 1}
                >
                  {tr("Удалить", "Delete")}
                </button>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                {tr("Изображение (опционально)", "Image (optional)")}
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
                {tr("Текст для слайда", "Slide text")}
                <textarea
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder={tr("Краткий тезис, подписи к фото или список", "Short bullet, captions, or a list")}
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
            {tr("Добавить слайд", "Add slide")}
          </button>
          <button
            type="button"
            onClick={resetPresentationDraft}
            className="rounded-xl border px-3 py-2 text-sm hover:border-gray-400"
          >
            {tr("Очистить черновик", "Clear draft")}
          </button>
          <button
            type="button"
            onClick={savePresentation}
            className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {tr("Создать черновик", "Save draft")}
          </button>
          <div className="text-xs text-gray-500">
            {tr("Для показа используйте кнопку ниже — он откроется в этом окне с возможностью полноэкранного режима.", "Use the button below to present in this window with fullscreen.")}
          </div>
        </div>
      </div>

      {presentations.length > 0 && (
        <div className="rounded-2xl border bg-white p-4 space-y-2 shadow-sm">
          <div className="text-sm font-semibold">{tr("Черновики презентаций", "Presentation drafts")}</div>
          <div className="text-xs text-gray-500">{tr("Локально в браузере (исчезнут после перезагрузки).", "Stored locally in this browser (lost after reload).")}</div>
          <ul className="space-y-2">
            {presentations.map(p => (
              <li key={p.id} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-gray-500">
                      {tr("Слайдов", "Slides")}: {p.slides.length} · {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startPresentation(p)}
                      className="rounded-xl bg-green-600 px-3 py-2 text-sm font-medium text-white"
                    >
                      {tr("Показать студентам", "Present to students")}
                    </button>
                    {shareBase ? (
                      <>
                        <a
                          href={buildShareUrl(p)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border px-3 py-2 text-sm hover:border-gray-400"
                        >
                          {tr("Открыть ссылку", "Open link")}
                        </a>
                        <button
                          type="button"
                          onClick={() => copyLink(p)}
                          className="rounded-xl border px-3 py-2 text-sm hover:border-gray-400"
                        >
                          {copiedId === p.id ? tr("Ссылка скопирована", "Link copied") : tr("Скопировать ссылку", "Copy link")}
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">{tr("Ссылка появится после загрузки страницы", "Link appears after page load")}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPresentations(prev => prev.filter(x => x.id !== p.id))}
                      className="rounded-xl border px-3 py-2 text-sm hover:border-gray-400"
                    >
                      {tr("Удалить", "Delete")}
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
                  {tr("Показ для студентов", "Student view")}
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
                  {tr("Во весь экран", "Fullscreen")}
                </button>
                <button
                  type="button"
                  onClick={stopPresentation}
                  className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  {tr("Закрыть", "Close")}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-xl">
              <div
                className={`flex h-full flex-col gap-6 p-6 md:gap-10 ${
                  liveHasImage && liveHasText
                    ? liveImageFirst
                      ? "md:flex-row"
                      : "md:flex-row-reverse"
                    : "md:flex-col"
                } items-stretch justify-start`}>
                {liveHasImage && (
                  <div
                    className={`flex w-full items-center justify-center md:w-1/2 ${
                      liveHasText ? (liveImageFirst ? "order-1" : liveIsColumn ? "order-1" : "order-2") : ""
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
                      liveHasImage ? (liveImageFirst ? (liveIsColumn ? "order-2" : "order-1") : "order-1") : ""
                    }`}>
                    <div
                      className="w-full max-w-3xl whitespace-pre-line text-left text-base leading-relaxed text-gray-900 md:text-lg"
                    >
                      {liveSlide?.text}
                    </div>
                  </div>
                )}
                {!liveHasImage && !liveHasText && (
                  <div className="text-center text-gray-500">{tr("Слайд пустой", "Slide is empty")}</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={prevSlide}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm hover:border-gray-500"
              >
                ← {tr("Назад", "Back")}
              </button>
              <div className="text-xs text-gray-500">
                {tr("Пробел/→ — далее, ← — назад, Esc — выйти", "Space/→ next, ← back, Esc to exit")}
              </div>
              <button
                type="button"
                onClick={nextSlide}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
              >
                {tr("Далее", "Next")} →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

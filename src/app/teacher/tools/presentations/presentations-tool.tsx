"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useCurrentUser } from "@/components/user-context";

type SlideDraft = {
  id: string;
  heading: string;
  details?: string;
  imageDataUrl?: string;
  imageAuthorName?: string;
  imageAuthorUrl?: string;
};
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
  const [slides, setSlides] = useState<SlideDraft[]>([{ id: makeId(), heading: "", details: "" }]);
  const [aiTopic, setAiTopic] = useState("");
  const [aiSlidesCount, setAiSlidesCount] = useState(6);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiInfo, setAiInfo] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [liveSlides, setLiveSlides] = useState<SlideDraft[]>([]);
  const [livePresentation, setLivePresentation] = useState<Presentation | null>(null);
  const [liveIndex, setLiveIndex] = useState(0);
  const [shareBase] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const liveSlide = liveSlides[liveIndex] || null;
  const liveHasImage = Boolean(liveSlide?.imageDataUrl);
  const pickHeading = (s: SlideDraft | any) =>
    typeof s?.heading === "string" && s.heading.trim()
      ? s.heading.trim()
      : typeof s?.text === "string"
        ? s.text.trim()
        : "";
  const pickDetails = (s: SlideDraft | any) => (typeof s?.details === "string" ? s.details.trim() : "");
  const liveHasText = Boolean(pickHeading(liveSlide) || pickDetails(liveSlide));
  const liveHeading = pickHeading(liveSlide);
  const liveDetails = pickDetails(liveSlide);
  const liveImageLeft = liveIndex % 2 === 0; // чередуем слева/справа

  const updateSlideHeading = (id: string, heading: string) => {
    setSlides(prev => prev.map(s => (s.id === id ? { ...s, heading } : s)));
  };

  const updateSlideDetails = (id: string, details: string) => {
    setSlides(prev => prev.map(s => (s.id === id ? { ...s, details } : s)));
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

  const addSlide = () => setSlides(prev => [...prev, { id: makeId(), heading: "", details: "" }]);

  const removeSlide = (id: string) => {
    setSlides(prev => {
      if (prev.length === 1) return [{ id: makeId(), heading: "", details: "" }];
      return prev.filter(s => s.id !== id);
    });
  };

  const resetPresentationDraft = () => {
    setPresentationTitle("Новая презентация");
    setSlides([{ id: makeId(), heading: "", details: "" }]);
  };

  const generateWithAI = async () => {
    const topic = aiTopic.trim() || presentationTitle.trim();
    const requestedSlides = Math.min(Math.max(Number(aiSlidesCount) || 0, 3), 12);

    if (!topic) {
      setAiError("Введите тему или запрос для генерации.");
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiInfo(null);
    setDetailsError(null);

    try {
      const res = await fetch("/api/teacher/presentations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, slides: requestedSlides }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const code = typeof data?.error === "string" ? data.error : "Не удалось получить ответ от ИИ";
        const message =
          code === "NO_TOPIC"
            ? "Введите тему для генерации."
            : code === "FORBIDDEN"
              ? "Доступ запрещён."
              : code === "TIMEOUT"
                ? "Сервер ИИ не ответил вовремя. Попробуйте ещё раз."
                : "Не удалось получить ответ от ИИ.";
        throw new Error(message);
      }

      const normalizedSlides: SlideDraft[] = Array.isArray(data?.slides)
        ? data.slides
            .map(
              (s: {
                heading?: string | null;
                text?: string | null;
                details?: string | null;
                imageDataUrl?: string | null;
                imageAuthorName?: string | null;
                imageAuthorUrl?: string | null;
              }) => {
                const headingRaw = typeof s?.heading === "string" ? s.heading : typeof s?.text === "string" ? s.text : "";
                const heading = headingRaw.trim();
                if (!heading) return null;
                const details = typeof s?.details === "string" ? s.details.trim() : "";
                const imageDataUrl =
                  typeof s?.imageDataUrl === "string" && s.imageDataUrl.trim() ? s.imageDataUrl.trim() : undefined;
                const imageAuthorName =
                  typeof s?.imageAuthorName === "string" && s.imageAuthorName.trim() ? s.imageAuthorName.trim() : undefined;
                const imageAuthorUrl =
                  typeof s?.imageAuthorUrl === "string" && s.imageAuthorUrl.trim() ? s.imageAuthorUrl.trim() : undefined;
                return { id: makeId(), heading, details, imageDataUrl, imageAuthorName, imageAuthorUrl };
              }
            )
            .filter(Boolean) as SlideDraft[]
        : [];

      if (normalizedSlides.length === 0) {
        throw new Error("Модель вернула пустой ответ. Попробуйте уточнить запрос.");
      }

      setPresentationTitle(typeof data?.title === "string" && data.title.trim() ? data.title.trim() : topic);
      setSlides(normalizedSlides);
      setAiModel(typeof data?.model === "string" ? data.model : null);
      setAiInfo(`Черновик обновлён: ${normalizedSlides.length} слайдов${data?.model ? ` (модель ${data.model})` : ""}.`);
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : "Не удалось сгенерировать презентацию.");
    } finally {
      setAiLoading(false);
    }
  };

  const generateDetailsForSlide = async (id: string) => {
    const slide = slides.find(s => s.id === id);
    if (!slide) return;
    const heading = pickHeading(slide);
    const topic = aiTopic.trim() || presentationTitle.trim() || "Презентация";

    if (!heading) {
      setDetailsError("Сначала укажите заголовок слайда.");
      return;
    }

    setDetailsError(null);
    setDetailsLoadingId(id);
    try {
      const res = await fetch("/api/teacher/presentations/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, heading }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof data?.error === "string" ? data.error : "Не удалось получить ответ от ИИ";
        const message =
          code === "NO_PROMPT_TEMPLATE"
            ? "Не найден шаблон промпта для детализации."
            : code === "NO_DATA"
              ? "Укажите заголовок и тему презентации."
              : code === "TIMEOUT"
                ? "Сервер ИИ не ответил вовремя. Попробуйте ещё раз."
                : "Не удалось сгенерировать подробности.";
        throw new Error(message);
      }
      const details = typeof data?.details === "string" ? data.details.trim() : "";
      if (!details) throw new Error("Модель вернула пустой ответ.");
      setSlides(prev => prev.map(s => (s.id === id ? { ...s, details } : s)));
      setAiModel(typeof data?.model === "string" ? data.model : aiModel);
    } catch (e: unknown) {
      setDetailsError(e instanceof Error ? e.message : "Не удалось сгенерировать подробности.");
    } finally {
      setDetailsLoadingId(null);
    }
  };

  const deletePresentation = async (id: string) => {
    try {
      const res = await fetch(`/api/teacher/presentations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === "string" ? data.error : "Не удалось удалить презентацию");
      }
      setPresentations(prev => prev.filter(p => p.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Не удалось удалить презентацию");
    }
  };

  const loadSaved = async () => {
    setSavedLoading(true);
    setSavedError(null);
    try {
      const res = await fetch("/api/teacher/presentations", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Не удалось загрузить презентации");
      }
      const items: Presentation[] = Array.isArray(data?.items)
        ? data.items.map((p: any) => ({
            id: String(p.id),
            title: typeof p.title === "string" ? p.title : "Без названия",
            createdAt: Number(p.createdAt) || Date.now(),
            slides: Array.isArray(p.slides)
              ? p.slides.map((s: any) => ({
                  id: makeId(),
                  heading: pickHeading(s),
                  details: pickDetails(s),
                  imageDataUrl: typeof s?.imageDataUrl === "string" ? s.imageDataUrl : undefined,
                  imageAuthorName: typeof s?.imageAuthorName === "string" ? s.imageAuthorName : undefined,
                  imageAuthorUrl: typeof s?.imageAuthorUrl === "string" ? s.imageAuthorUrl : undefined,
                }))
              : [],
          }))
        : [];
      setPresentations(items);
    } catch (e: unknown) {
      setSavedError(e instanceof Error ? e.message : "Ошибка загрузки презентаций");
    } finally {
      setSavedLoading(false);
    }
  };

  useEffect(() => {
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePresentation = async () => {
    const safeTitle = presentationTitle.trim() || "Без названия";
    const preparedSlides = slides
      .map(s => ({
        ...s,
        heading: pickHeading(s),
        details: pickDetails(s),
      }))
      .filter(s => s.heading || s.details || s.imageDataUrl);
    if (preparedSlides.length === 0) {
      alert("Добавьте хотя бы один слайд с заголовком, текстом или изображением");
      return;
    }
    try {
      const res = await fetch("/api/teacher/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: safeTitle, slides: preparedSlides }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Не удалось сохранить презентацию");
      }
      const item = data?.item;
      const created: Presentation = {
        id: String(item?.id || makeId()),
        title: typeof item?.title === "string" ? item.title : safeTitle,
        createdAt: Number(item?.createdAt) || Date.now(),
        slides: Array.isArray(item?.slides)
          ? item.slides.map((s: any) => ({
              id: makeId(),
              heading: pickHeading(s),
              details: pickDetails(s),
              imageDataUrl: typeof s?.imageDataUrl === "string" ? s.imageDataUrl : undefined,
              imageAuthorName: typeof s?.imageAuthorName === "string" ? s.imageAuthorName : undefined,
              imageAuthorUrl: typeof s?.imageAuthorUrl === "string" ? s.imageAuthorUrl : undefined,
            }))
          : preparedSlides.map(s => ({ ...s, id: makeId() })),
      };
      setPresentations(prev => [created, ...prev]);
      resetPresentationDraft();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Не удалось сохранить презентацию");
    }
  };

  const startPresentation = (p: Presentation) => {
    const slidesToShow = p.slides.filter(s => pickHeading(s) || pickDetails(s) || s.imageDataUrl);
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
      slides: p.slides.map(s => ({
        heading: pickHeading(s),
        details: pickDetails(s),
        imageDataUrl: s.imageDataUrl,
        imageAuthorName: s.imageAuthorName,
        imageAuthorUrl: s.imageAuthorUrl,
      })),
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
          Черновики сохраняются на сервере и привязаны к учётке преподавателя. Для показа нажмите «Показать студентам» — откроется полноэкранный режим без всплывающих окон.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-5 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-gray-500">ИИ на сервере Ollama</div>
            <div className="text-lg font-semibold">Сгенерировать черновик презентации</div>
            <p className="text-sm text-gray-600">
              Укажите тему или запрос, и мы заменим текущий черновик слайдами с сервера ИИ. После генерации можно редактировать текст и добавлять изображения.
            </p>
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {aiModel ? `Модель: ${aiModel}` : "Используется сервер Ollama"}
          </div>
        </div>

        <label className="block text-sm font-medium text-gray-700">
          Тема / запрос
          <textarea
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="Например: Введение в квантовые вычисления для студентов 3 курса"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            rows={3}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-700">
            Кол-во слайдов
            <input
              type="number"
              min={3}
              max={12}
              className="ml-2 w-20 rounded-lg border px-2 py-1 text-sm"
              value={aiSlidesCount}
              onChange={(e) => setAiSlidesCount(Number(e.target.value) || 0)}
            />
          </label>
          <button
            type="button"
            onClick={generateWithAI}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {aiLoading && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
            )}
            {aiLoading ? "Запрашиваем..." : "Сгенерировать слайды"}
          </button>
          <div className="text-xs text-gray-500">Текущий черновик будет заменён новым ответом ИИ.</div>
        </div>

        {aiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{aiError}</div>
        )}
        {aiInfo && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{aiInfo}</div>
        )}
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
                <div className="space-y-1">
                  <Image
                    src={slide.imageDataUrl}
                    alt=""
                    width={800}
                    height={480}
                    unoptimized
                    className="max-h-48 w-full rounded-lg object-contain border"
                  />
                  {(slide.imageAuthorName || slide.imageAuthorUrl) && (
                    <div className="text-[11px] text-gray-500">
                      Фото {slide.imageAuthorUrl ? (
                        <a className="underline" href={slide.imageAuthorUrl} target="_blank" rel="noreferrer">
                          {slide.imageAuthorName || "на Pexels"}
                        </a>
                      ) : (
                        slide.imageAuthorName || "Pexels"
                      )}
                    </div>
                  )}
                </div>
              )}

              <label className="block text-sm font-medium text-gray-700">
                Заголовок
                <input
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="Коротко: о чём слайд"
                  value={pickHeading(slide)}
                  onChange={(e) => updateSlideHeading(slide.id, e.target.value)}
                />
              </label>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Подробности
                  <textarea
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="Основные тезисы, 2–4 предложения или маркированный список"
                    value={pickDetails(slide)}
                    onChange={(e) => updateSlideDetails(slide.id, e.target.value)}
                    rows={4}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => generateDetailsForSlide(slide.id)}
                    disabled={detailsLoadingId === slide.id}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs hover:border-gray-400 disabled:opacity-60"
                  >
                    {detailsLoadingId === slide.id && (
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-gray-700" />
                    )}
                    {detailsLoadingId === slide.id ? "Генерация..." : "Сгенерировать подробности"}
                  </button>
                  {detailsError && <span className="text-xs text-red-600">{detailsError}</span>}
                </div>
              </div>
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

      <div className="rounded-2xl border bg-white p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Сохранённые презентации</div>
            <div className="text-xs text-gray-500">Хранятся на сервере для этого преподавателя.</div>
          </div>
          {savedLoading && <div className="text-xs text-gray-500">Загрузка…</div>}
        </div>
        {savedError && <div className="text-xs text-red-600">{savedError}</div>}
        {presentations.length === 0 && !savedLoading ? (
          <div className="text-sm text-gray-600">Пока нет сохранённых презентаций.</div>
        ) : (
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
                      onClick={() => deletePresentation(p.id)}
                      className="rounded-xl border px-3 py-2 text-sm hover:border-gray-400"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {livePresentation && liveSlides.length > 0 && (
        <div className="fixed inset-0 z-50 bg-white text-gray-900">
          <div className="mx-auto flex h-full max-w-6xl flex-col gap-4 px-4 py-6">
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
                    className={`flex w-full items-center justify-center md:w-5/12 ${
                      liveHasText ? (liveImageLeft ? "order-1" : "order-2") : ""
                    }`}>
                    <div className="w-full space-y-2">
                      <Image
                        src={liveSlide?.imageDataUrl || ""}
                        alt=""
                        width={1400}
                        height={900}
                        unoptimized
                        className="max-h-[70vh] w-full rounded-xl object-contain border border-gray-200 bg-white"
                      />
                      {(liveSlide?.imageAuthorName || liveSlide?.imageAuthorUrl) && (
                        <div className="text-xs text-gray-500">
                          Фото{" "}
                          {liveSlide?.imageAuthorUrl ? (
                            <a
                              href={liveSlide.imageAuthorUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              {liveSlide.imageAuthorName || "на Pexels"}
                            </a>
                          ) : (
                            liveSlide?.imageAuthorName || "Pexels"
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {liveHasText && (
                  <div
                    className={`flex w-full md:w-7/12 ${
                      liveHasImage ? (liveImageLeft ? "order-2" : "order-1") : ""
                    }`}>
                    <div className="w-full max-w-3xl text-left text-base leading-relaxed text-gray-900 md:text-lg">
                      {liveHeading && <div className="mb-2 text-xl font-semibold md:text-2xl">{liveHeading}</div>}
                      {liveDetails && (
                        <div className="whitespace-pre-line text-gray-900">
                          {liveDetails}
                        </div>
                      )}
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

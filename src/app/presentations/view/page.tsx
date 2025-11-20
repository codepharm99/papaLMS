"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Slide = { text: string; imageDataUrl?: string };
type Payload = { title: string; slides: Slide[] };

function decodePayload(raw: string): Payload {
  const json = decodeURIComponent(atob(raw));
  return JSON.parse(json);
}

function PresentationViewer({ payloadParam }: { payloadParam: string | null }) {
  const [index, setIndex] = useState(0);

  const { data, error } = useMemo(() => {
    if (!payloadParam) return { data: null, error: "Ссылка не содержит данных презентации." };
    try {
      const decoded = decodePayload(payloadParam);
      if (!decoded?.slides || decoded.slides.length === 0) {
        return { data: null, error: "В ссылке нет слайдов для показа." };
      }
      return { data: decoded as Payload, error: null };
    } catch {
      return { data: null, error: "Не удалось открыть презентацию (повреждённые данные)." };
    }
  }, [payloadParam]);

  useEffect(() => {
    if (!data) return;
    const total = data.slides.length;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setIndex(prev => (prev + 1) % total);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex(prev => (prev - 1 + total) % total);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        window.history.back();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [data]);

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-4 py-10">
        <div className="text-lg font-semibold text-gray-900">Показ презентации</div>
        <div className="rounded-xl border bg-white p-4 text-red-600">{error}</div>
        <Link href="/teacher/tools/presentations" className="text-sm text-blue-600 hover:underline">
          Вернуться к генератору
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10 text-gray-500">
        Загрузка презентации...
      </main>
    );
  }

  const safeIndex = Math.min(index, Math.max(0, data.slides.length - 1));
  const current = data.slides[safeIndex] || {};
  const hasImage = Boolean(current.imageDataUrl);
  const hasText = Boolean(current.text);
  const layoutVariant = safeIndex % 2; // 0: img left, 1: img right
  const isColumn = false;
  const imageFirst = layoutVariant === 0;

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-white text-gray-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-4 md:px-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs uppercase tracking-wide text-gray-600">
            Показ для студентов
          </div>
          <h1 className="text-xl font-semibold">{data.title || "Презентация"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {safeIndex + 1} / {data.slides.length}
          </span>
          <button
            type="button"
            onClick={requestFullscreen}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:border-gray-500"
          >
            Во весь экран
          </button>
          <Link
            href="/teacher/tools/presentations"
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
          >
            Выйти
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pb-6 md:px-8">
        <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-xl">
          <div
            className={`flex h-full flex-col gap-6 p-6 md:gap-10 ${
              hasImage && hasText ? (imageFirst ? "md:flex-row" : "md:flex-row-reverse") : "md:flex-col"
            } items-stretch justify-start`}
          >
            {hasImage && (
              <div
                className={`flex w-full items-center justify-center md:w-1/2 ${
                  hasText ? (imageFirst ? "order-1" : isColumn ? "order-1" : "order-2") : ""
                }`}
              >
                <Image
                  src={current.imageDataUrl || ""}
                  alt=""
                  width={1400}
                  height={900}
                  unoptimized
                  className="max-h-[70vh] w-full rounded-xl object-contain border border-gray-200 bg-white"
                />
              </div>
            )}
            {hasText && (
              <div
                className={`flex w-full md:w-1/2 ${
                  hasImage ? (imageFirst ? (isColumn ? "order-2" : "order-1") : "order-1") : ""
                }`}
              >
                <div className="w-full max-w-3xl whitespace-pre-line text-left text-base leading-relaxed text-gray-900 md:text-lg">
                  {current.text}
                </div>
              </div>
            )}
            {!hasImage && !hasText && (
              <div className="text-center text-gray-500">Слайд пустой</div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex(prev => (prev - 1 + data.slides.length) % data.slides.length)}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm hover:border-gray-500"
          >
            ← Назад
          </button>
          <div className="text-xs text-gray-500">Пробел/→ — далее, ← — назад, Esc — выйти</div>
          <button
            type="button"
            onClick={() => setIndex(prev => (prev + 1) % data.slides.length)}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Далее →
          </button>
        </div>
      </section>
    </main>
  );
}

export default function PresentationViewPage() {
  const params = useSearchParams();
  const [payloadParam, setPayloadParam] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = params.get("payload");
    const fromHash = (() => {
      if (typeof window === "undefined") return null;
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
      if (!hash) return null;
      return new URLSearchParams(hash).get("payload");
    })();
    setPayloadParam(fromHash || fromQuery);
  }, [params]);

  return <PresentationViewer key={payloadParam ?? "empty"} payloadParam={payloadParam} />;
}

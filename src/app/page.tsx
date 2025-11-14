"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Простая анимация «плавные огни»
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const lights = Array.from({ length: 25 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 120 + Math.random() * 120,
      dx: -0.3 + Math.random() * 0.6,
      dy: -0.3 + Math.random() * 0.6,
      color: `hsla(${Math.random() * 360}, 70%, 60%, .25)`
    }));

    function draw() {
      ctx.clearRect(0, 0, w, h);

      lights.forEach((p) => {
        ctx.beginPath();
        const grad = ctx.createRadialGradient(p.x, p.y, p.r * 0.2, p.x, p.y, p.r);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > w) p.dx *= -1;
        if (p.y < 0 || p.y > h) p.dy *= -1;
      });

      requestAnimationFrame(draw);
    }

    draw();

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <main
      className="
        relative w-full h-screen overflow-hidden 
        flex items-center justify-center 
        bg-white dark:bg-black
        text-center"
    >
      {/* Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />

      {/* Content */}
      <section className="relative z-10 max-w-2xl px-6">
        <h1
          className="
            text-4xl md:text-6xl font-semibold 
            text-gray-900 dark:text-white 
            tracking-tight"
        >
          Учись. Преподавай. Развивайся.
        </h1>

        <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-300">
          Простая LMS для студентов и преподавателей
        </p>

        <Link href="/login" aria-label="Войти в систему">
          <button
            className="
              mt-8 px-8 py-3 rounded-xl 
              bg-black dark:bg-white 
              text-white dark:text-black 
              text-lg font-medium 
              hover:opacity-80 transition"
          >
            Войти
          </button>
        </Link>
      </section>
    </main>
  );
}

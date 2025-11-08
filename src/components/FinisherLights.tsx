"use client";

import { useEffect, useRef } from "react";

type Light = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  color: string;
};

export default function FinisherLights() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("finisher-active");

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;

    // Sizing with device pixel ratio for crispness
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    // Lights settings
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const COUNT = prefersReduced ? 0 : 15;
    const lights: Light[] = [];
    const colors = ["#c0d5e7", "#ffffff"]; // matches globals.css c1/c2

    for (let i = 0; i < COUNT; i++) {
      const r = 120 + Math.random() * 220; // radius in px (CSS pixels)
      lights.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r,
        vx: (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1),
        vy: (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1),
        color: colors[i % colors.length],
      });
    }

    ctx.globalCompositeOperation = "lighter"; // additive blending for soft lights

    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(33, t - last);
      last = t;

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of lights) {
        // move
        p.x += p.vx * dt * 0.04;
        p.y += p.vy * dt * 0.04;
        // bounce softly at overscan bounds
        const margin = 100;
        if (p.x < -margin || p.x > w + margin) p.vx *= -1;
        if (p.y < -margin || p.y > h + margin) p.vy *= -1;

        // draw radial gradient
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, p.color + "cc");
        grad.addColorStop(1, p.color + "00");
        ctx.fillStyle = grad as unknown as string;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    if (!prefersReduced) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      // Draw one static frame for reduced motion
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (const p of lights) {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grad.addColorStop(0, p.color + "cc");
        grad.addColorStop(1, p.color + "00");
        ctx.fillStyle = grad as unknown as string;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    window.addEventListener("resize", fit);
    return () => {
      html.classList.remove("finisher-active");
      window.removeEventListener("resize", fit);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <canvas ref={canvasRef} />
    </div>
  );
}

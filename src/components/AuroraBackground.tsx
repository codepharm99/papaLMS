"use client";

import { usePathname } from "next/navigation";

import Aurora from "./Aurora";
import "./AuroraBackground.css";

const COLOR_STOPS = ["#2b33ff", "#7b5dff", "#2a0f65"];

export default function AuroraBackground() {
  const pathname = usePathname();
  if (!pathname || pathname.startsWith("/login")) {
    return null;
  }

  return (
    <div className="aurora-backdrop" aria-hidden="true">
      <div className="aurora-sheen" />
      <Aurora colorStops={COLOR_STOPS} blend={0.65} amplitude={1.05} speed={0.75} />
    </div>
  );
}

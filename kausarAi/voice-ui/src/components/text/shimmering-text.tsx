"use client";

import React from "react";
import "./shimmering-text.css";

interface ShimmeringTextProps {
  text: string;
  duration?: number;
  wave?: boolean;
  shimmeringColor?: string;
  className?: string;
}

export function ShimmeringText({
  text,
  duration = 2,
  wave = true,
  shimmeringColor = "hsl(var(--primary))",
  className = "",
}: ShimmeringTextProps) {
  const style = {
    backgroundImage: `linear-gradient(90deg, transparent, ${shimmeringColor}, transparent)`,
    animationDuration: `${duration}s`,
  } as React.CSSProperties;

  return (
    <span
      className={`shimmering-text ${wave ? "wave" : ""} ${className}`}
      style={style}
      aria-live="polite"
    >
      {text}
    </span>
  );
}

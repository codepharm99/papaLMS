"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type Transition = {
  duration?: number;
  ease?: string | number[];
};

type RotatingTextProps = {
  text: string[];
  duration?: number;
  transition?: Transition;
  className?: string;
};

export function RotatingText({
  text,
  duration = 3000,
  transition = { duration: 0.5, ease: "easeInOut" },
  className = "",
}: RotatingTextProps) {
  const items = useMemo(() => text.filter(Boolean), [text]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, duration);
    return () => clearInterval(id);
  }, [items, duration]);

  const variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={items[index] ?? "rotating-text"}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
          className="block"
        >
          {items[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

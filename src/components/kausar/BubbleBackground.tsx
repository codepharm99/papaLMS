"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
} from "framer-motion";
import { useEffect } from "react";

type BubbleColors = {
  first: string;
  second: string;
  third: string;
  fourth: string;
  fifth: string;
  sixth: string;
};

interface BubbleBackgroundProps extends React.ComponentProps<"div"> {
  interactive?: boolean;
  transition?: SpringOptions;
  colors?: Partial<BubbleColors>;
}

const defaultColors: BubbleColors = {
  first: "18,113,255",
  second: "221,74,255",
  third: "0,220,255",
  fourth: "200,50,50",
  fifth: "180,180,50",
  sixth: "140,100,255",
};

export function BubbleBackground({
  interactive = false,
  transition = { stiffness: 100, damping: 20 },
  colors,
  className = "",
  ...props
}: BubbleBackgroundProps) {
  const palette = { ...defaultColors, ...colors };

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, transition);
  const springY = useSpring(mouseY, transition);
  const offsetX = useTransform(springX, (value) => value / 25);
  const offsetY = useTransform(springY, (value) => value / 25);

  useEffect(() => {
    if (!interactive) return;

    const handleMove = (event: MouseEvent) => {
      mouseX.set(event.clientX - window.innerWidth / 2);
      mouseY.set(event.clientY - window.innerHeight / 2);
    };

    const handleLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseleave", handleLeave);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
    };
  }, [interactive, mouseX, mouseY]);

  const sharedMotionStyle = interactive ? { x: offsetX, y: offsetY } : undefined;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
      {...props}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.1),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.1),transparent_35%)]" />

      <motion.div
        className="absolute left-[-10%] top-[-10%] h-[50vw] w-[50vw] rounded-full mix-blend-screen blur-3xl"
        style={{
          background: `radial-gradient(circle at 30% 30%, rgba(${palette.first},0.6), rgba(${palette.second},0.15))`,
          ...sharedMotionStyle,
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.65, 0.85, 0.65], rotate: [0, 12, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute right-[-16%] top-[-20%] h-[45vw] w-[45vw] rounded-full mix-blend-screen blur-3xl"
        style={{
          background: `radial-gradient(circle at 70% 40%, rgba(${palette.third},0.5), rgba(${palette.first},0.18))`,
          ...sharedMotionStyle,
        }}
        animate={{ scale: [1, 1.12, 0.96, 1], opacity: [0.55, 0.8, 0.6, 0.55], rotate: [0, -10, 6, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />

      <motion.div
        className="absolute left-[-20%] bottom-[-18%] h-[48vw] w-[48vw] rounded-full mix-blend-screen blur-3xl"
        style={{
          background: `radial-gradient(circle at 40% 50%, rgba(${palette.fourth},0.35), rgba(${palette.sixth},0.15))`,
          ...sharedMotionStyle,
        }}
        animate={{ scale: [0.92, 1.08, 0.94], opacity: [0.5, 0.75, 0.55], rotate: [0, 14, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />

      <motion.div
        className="absolute right-[-8%] bottom-[-12%] h-[42vw] w-[42vw] rounded-full mix-blend-screen blur-3xl"
        style={{
          background: `radial-gradient(circle at 60% 60%, rgba(${palette.fifth},0.4), rgba(${palette.third},0.12))`,
          ...sharedMotionStyle,
        }}
        animate={{ scale: [1, 1.08, 1.12, 1], opacity: [0.45, 0.65, 0.55, 0.45], rotate: [0, -14, 8, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />

      <motion.div
        className="absolute left-[20%] top-[25%] h-[22vw] w-[22vw] rounded-full mix-blend-screen blur-2xl"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(${palette.second},0.45), rgba(${palette.fifth},0.15))`,
          ...sharedMotionStyle,
        }}
        animate={{ scale: [1, 1.14, 0.96, 1], opacity: [0.4, 0.6, 0.45, 0.4], rotate: [0, 18, -12, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute right-[18%] bottom-[22%] h-[20vw] w-[20vw] rounded-full mix-blend-screen blur-2xl"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(${palette.sixth},0.5), rgba(${palette.first},0.2))`,
          ...sharedMotionStyle,
        }}
        animate={{ scale: [0.95, 1.15, 1], opacity: [0.35, 0.6, 0.45], rotate: [0, -18, 10, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
    </div>
  );
}

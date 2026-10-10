"use client";

import React, { useEffect, useRef } from "react";

export interface ScrambledTextProps {
  radius?: number;
  duration?: number;
  speed?: number;
  scrambleChars?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const DEFAULT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:";

const ScrambledText: React.FC<ScrambledTextProps> = ({
  radius = 100,
  duration = 1.2,
  scrambleChars = DEFAULT_CHARS,
  className = "",
  style = {},
  children,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const p = root.querySelector("p");
    if (!p) return;

    const originalText = p.textContent || "";
    const charElements = originalText.split("").map((ch) => {
      const span = document.createElement("span");
      span.textContent = ch;
      span.className = "inline-block will-change-transform";
      span.dataset.char = ch;
      return span;
    });

    p.innerHTML = "";
    charElements.forEach((span) => p.appendChild(span));

    const handlePointerMove = (e: PointerEvent) => {
      charElements.forEach((span) => {
        const targetChar = span.dataset.char || "";
        if (targetChar === " ") return;

        const rect = span.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const dist = Math.hypot(dx, dy);

        if (dist < radius) {
          const randomChar =
            scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
          span.textContent = randomChar;

          setTimeout(() => {
            span.textContent = targetChar;
          }, (duration * 1000 * (1 - dist / radius)) / 2);
        }
      });
    };

    root.addEventListener("pointermove", handlePointerMove);

    return () => {
      root.removeEventListener("pointermove", handlePointerMove);
      p.textContent = originalText;
    };
  }, [radius, duration, scrambleChars]);

  return (
    <div
      ref={rootRef}
      className={`m-[7vw] max-w-[800px] font-mono text-[clamp(14px,4vw,32px)] text-white ${className}`}
      style={style}
    >
      <p>{children}</p>
    </div>
  );
};

export default ScrambledText;

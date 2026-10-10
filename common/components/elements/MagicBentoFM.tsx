"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export interface BentoCardProps {
  color?: string;
  title?: string;
  description?: string;
  label?: string;
  children: React.ReactNode;
  textAutoHide?: boolean;
  disableAnimations?: boolean;
}

export interface BentoProps {
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
  items: BentoCardProps[];
}

export const BentoCardFM: React.FC<BentoCardProps & { enableTilt?: boolean; glowColor?: string }> = ({
  title,
  description,
  children,
  enableTilt = true,
  glowColor = "132, 0, 255",
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [7, -7]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-7, 7]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXPos = e.clientX - rect.left;
    const mouseYPos = e.clientY - rect.top;
    x.set(mouseXPos / width - 0.5);
    y.set(mouseYPos / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: enableTilt ? rotateX : 0,
        rotateY: enableTilt ? rotateY : 0,
        transformStyle: "preserve-3d",
      }}
      className="group relative rounded-2xl border border-neutral-200/80 bg-neutral-900/40 p-6 transition-colors duration-300 hover:border-neutral-700/80 dark:border-neutral-800"
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at 50% 50%, rgba(${glowColor}, 0.15), transparent 80%)`,
        }}
      />
      {title && <h3 className="mb-2 text-lg font-semibold text-neutral-100">{title}</h3>}
      {description && <p className="mb-4 text-sm text-neutral-400">{description}</p>}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

const MagicBentoFM: React.FC<BentoProps> = ({ items, enableTilt = true, glowColor = "132, 0, 255" }) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item, idx) => (
        <BentoCardFM key={idx} {...item} enableTilt={enableTilt} glowColor={glowColor} />
      ))}
    </div>
  );
};

export default MagicBentoFM;

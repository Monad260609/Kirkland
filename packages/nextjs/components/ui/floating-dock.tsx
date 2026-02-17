"use client";

import React, { useRef } from "react";
import { AnimatePresence, MotionValue, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "~~/utils/cn";

export type DockItem = {
  title: string;
  icon: React.ReactNode;
  onClick?: () => void;
};

export function FloatingDock({ items, className }: { items: DockItem[]; className?: string }) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={e => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "flex h-20 gap-4 items-end rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 pb-3",
        className,
      )}
    >
      {items.map(item => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
    </motion.div>
  );
}

function IconContainer({
  mouseX,
  title,
  icon,
  onClick,
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, val => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [50, 90, 50]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [50, 90, 50]);
  const widthIconTransform = useTransform(distance, [-150, 0, 150], [24, 44, 24]);
  const heightIconTransform = useTransform(distance, [-150, 0, 150], [24, 44, 24]);

  const width = useSpring(widthTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  const height = useSpring(heightTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  const widthIcon = useSpring(widthIconTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  const heightIcon = useSpring(heightIconTransform, { mass: 0.1, stiffness: 150, damping: 12 });

  const [hovered, setHovered] = React.useState(false);

  return (
    <button onClick={onClick} className="focus:outline-none cursor-target">
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="aspect-square rounded-full bg-white/10 border border-white/15 backdrop-blur-sm flex items-center justify-center relative"
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 6, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 4, x: "-50%" }}
              className="px-3 py-1 whitespace-pre rounded-md bg-neutral-900/90 border border-white/10 text-white text-xs font-medium absolute left-1/2 -top-10 w-fit"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div style={{ width: widthIcon, height: heightIcon }} className="flex items-center justify-center">
          {icon}
        </motion.div>
      </motion.div>
    </button>
  );
}

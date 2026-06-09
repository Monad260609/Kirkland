"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "~~/utils/cn";

export const HoverEffect = ({
  items,
  className,
}: {
  items: {
    title: string;
    description: string;
    icon?: React.ReactNode;
    children?: React.ReactNode;
  }[];
  className?: string;
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    // flex + justify-center keeps an incomplete last row centered, unlike a
    // plain 3-col grid that leaves it hanging left.
    <div className={cn("flex flex-wrap justify-center py-10", className)}>
      {items.map((item, idx) => (
        <div
          key={item?.title}
          className="relative group block p-2 w-full md:w-1/2 lg:w-1/3"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-slate-800/[0.8] block rounded-3xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <Card>
            <div className="flex items-center gap-3 mb-3">
              {item.icon && <span className="text-white/80">{item.icon}</span>}
              <CardTitle>{item.title}</CardTitle>
            </div>
            <CardDescription className="flex-grow">{item.description}</CardDescription>
            {item.children && <div className="mt-4">{item.children}</div>}
          </Card>
        </div>
      ))}
    </div>
  );
};

export const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  return (
    <div
      className={cn(
        "rounded-2xl h-full w-full p-6 bg-white/10 border border-white/15 backdrop-blur-md relative z-20 transition-all duration-200 group-hover:border-white/30",
        className,
      )}
    >
      {/* flex column so controls align to the bottom across equal-height cards */}
      <div className="relative z-50 flex flex-col h-full">{children}</div>
    </div>
  );
};

export const CardTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  return <h4 className={cn("text-white font-bold text-lg tracking-wide", className)}>{children}</h4>;
};

export const CardDescription = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  return <p className={cn("text-white/60 text-sm leading-relaxed", className)}>{children}</p>;
};

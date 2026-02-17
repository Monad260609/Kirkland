"use client";

import React, { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "~~/utils/cn";

type ButtonState = "idle" | "loading" | "success";

interface StatefulButtonProps {
  onClick?: () => void | Promise<void>;
  children: React.ReactNode;
  loadingText?: string;
  successText?: string;
  className?: string;
  disabled?: boolean;
}

export function StatefulButton({
  onClick,
  children,
  loadingText = "Connecting…",
  successText = "Connected ✓",
  className,
}: StatefulButtonProps) {
  const [state, setState] = useState<ButtonState>("idle");

  const handleClick = useCallback(async () => {
    if (state !== "idle" || !onClick) return;
    setState("loading");
    try {
      await onClick();
      setState("success");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  }, [onClick, state]);

  return (
    <motion.button
      onClick={handleClick}
      disabled={state !== "idle"}
      whileHover={state === "idle" ? { scale: 1.02 } : undefined}
      whileTap={state === "idle" ? { scale: 0.98 } : undefined}
      className={cn(
        "relative cursor-target overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold transition-all",
        "bg-white/10 border border-white/15 backdrop-blur-md text-white",
        "hover:bg-white/15 disabled:cursor-not-allowed",
        state === "loading" && "bg-white/5 border-white/10",
        state === "success" && "bg-green-500/20 border-green-400/30",
        className,
      )}
    >
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.span
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2"
          >
            {children}
          </motion.span>
        )}
        {state === "loading" && (
          <motion.span
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2"
          >
            <Spinner />
            {loadingText}
          </motion.span>
        )}
        {state === "success" && (
          <motion.span
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2 text-green-300"
          >
            {successText}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "~~/utils/cn";

interface TerminalLine {
  text: string;
  type: "command" | "output" | "success" | "error" | "info";
  delay?: number;
}

interface TerminalProps {
  lines: TerminalLine[];
  title?: string;
  className?: string;
  typingSpeed?: number;
}

export function Terminal({ lines, title = "kirkland-cli", className, typingSpeed = 30 }: TerminalProps) {
  const [displayedLines, setDisplayedLines] = useState<{ text: string; type: string; typing: boolean }[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);

  useEffect(() => {
    if (currentLineIndex >= lines.length) return;

    const line = lines[currentLineIndex];
    const delay = line.delay ?? 0;

    if (currentCharIndex === 0 && delay > 0) {
      const timer = setTimeout(() => {
        setDisplayedLines(prev => [...prev, { text: "", type: line.type, typing: true }]);
        setCurrentCharIndex(1);
      }, delay);
      return () => clearTimeout(timer);
    }

    if (currentCharIndex === 0) {
      setDisplayedLines(prev => [...prev, { text: "", type: line.type, typing: true }]);
      setCurrentCharIndex(1);
      return;
    }

    if (currentCharIndex <= line.text.length) {
      const speed = line.type === "command" ? typingSpeed : 5;
      const timer = setTimeout(() => {
        setDisplayedLines(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            text: line.text.slice(0, currentCharIndex),
            type: line.type,
            typing: currentCharIndex < line.text.length,
          };
          return updated;
        });
        setCurrentCharIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    }

    // Line complete, move to next
    const timer = setTimeout(() => {
      setDisplayedLines(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], typing: false };
        return updated;
      });
      setCurrentLineIndex(prev => prev + 1);
      setCurrentCharIndex(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [currentLineIndex, currentCharIndex, lines, typingSpeed]);

  const getLineColor = (type: string) => {
    switch (type) {
      case "command":
        return "text-white";
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "info":
        return "text-purple-400";
      default:
        return "text-white/80";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={cn(
        "w-full max-w-2xl rounded-2xl overflow-hidden border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl",
        className,
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-white/70 text-xs ml-2 font-mono">{title}</span>
      </div>

      {/* Terminal body */}
      <div className="p-4 font-mono text-sm space-y-1 min-h-[280px]">
        {displayedLines.map((line, idx) => (
          <div key={idx} className={cn("flex items-start gap-0", getLineColor(line.type))}>
            {line.type === "command" && <span className="text-purple-400 mr-2 select-none">$</span>}
            {line.type !== "command" && <span className="mr-4 select-none" />}
            <span>
              {line.text}
              {line.typing && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="inline-block w-2 h-4 bg-white/80 ml-0.5 align-middle"
                />
              )}
            </span>
          </div>
        ))}

        {/* Cursor at end */}
        {currentLineIndex >= lines.length && (
          <div className="flex items-center gap-0">
            <span className="text-purple-400 mr-2 select-none">$</span>
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-2 h-4 bg-white/80"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

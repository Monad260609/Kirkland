"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconCoin, IconExternalLink, IconShieldCheck } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { getCallHistory } from "~~/utils/gateway/callHistory";
import type { CallEntry } from "~~/utils/gateway/callHistory";

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function MyCalls() {
  const [history, setHistory] = useState<CallEntry[]>([]);

  useEffect(() => {
    const load = () => setHistory(getCallHistory());
    load();
    window.addEventListener("x402_history_update", load);
    return () => window.removeEventListener("x402_history_update", load);
  }, []);

  if (history.length === 0) return null;

  return (
    <div className="w-full max-w-5xl mx-auto mt-12">
      <h2 className="text-white/80 font-bold text-sm tracking-wide uppercase mb-4">Your Recent Calls</h2>
      <div className="space-y-2">
        {history.slice(0, 10).map((entry, idx) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.25 }}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5"
          >
            {entry.cached ? (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <IconCheck className="h-3 w-3" />
                CACHED
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                <IconCoin className="h-3 w-3" />
                SEEDED
              </span>
            )}
            <span className="text-white text-sm font-medium truncate max-w-[14rem]">{entry.query}</span>
            {entry.agentVerified && entry.agentId && (
              <span
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono"
                title={entry.agentId}
              >
                <IconShieldCheck className="h-3 w-3" />
                agent
              </span>
            )}
            <span className="text-white/40 text-xs">{timeAgo(entry.timestamp)}</span>
            <span className="ml-auto text-white/60 text-xs font-mono">{entry.cost}</span>
            {entry.explorerUrl && (
              <a
                href={entry.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 transition-colors"
                aria-label="View transaction on Monad Explorer"
              >
                <IconExternalLink className="h-4 w-4" />
              </a>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

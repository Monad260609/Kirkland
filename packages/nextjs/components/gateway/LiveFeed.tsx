"use client";

import { useEffect, useRef, useState } from "react";
import { IconBolt, IconDatabase, IconShieldCheck } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

interface FeedEvent {
  type: "query" | "cache_hit";
  query: string;
  user: string;
  cost: string;
  cached: boolean;
  source?: string;
  agentId?: string;
  agentVerified?: boolean;
  timestamp: number;
}

const MAX_EVENTS = 8;

export function LiveFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/events");
    sourceRef.current = source;

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = e => {
      try {
        const event = JSON.parse(e.data) as FeedEvent;
        setEvents(prev => [event, ...prev].slice(0, MAX_EVENTS));
      } catch {
        // malformed frame — skip
      }
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto mt-12">
      <div className="flex items-center gap-2 mb-4">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-white/30"}`} />
        <h2 className="text-white/80 font-bold text-sm tracking-wide uppercase">Live Activity</h2>
        <span className="text-white/40 text-xs">{connected ? "streaming" : "connecting…"}</span>
      </div>

      {events.length === 0 ? (
        <p className="text-white/40 text-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
          Waiting for queries — every paid request on the gateway shows up here in real time.
        </p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {events.map(event => (
              <motion.div
                key={event.timestamp + event.query}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5"
              >
                {event.cached ? (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <IconDatabase className="h-3 w-3" />
                    HIT
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    <IconBolt className="h-3 w-3" />
                    SEED
                  </span>
                )}
                <span className="text-white text-sm font-medium truncate max-w-[14rem]">{event.query}</span>
                <span className="text-white/50 text-xs font-mono">{event.user}</span>
                {event.agentVerified && event.agentId && (
                  <span
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono"
                    title={event.agentId}
                  >
                    <IconShieldCheck className="h-3 w-3" />
                    agent
                  </span>
                )}
                <span className="ml-auto text-white/60 text-xs font-mono">{event.cost}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

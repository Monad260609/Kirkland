"use client";

import React from "react";
import {
  IconBrain,
  IconCheck,
  IconCloud,
  IconCurrencyBitcoin,
  IconCurrencyEthereum,
  IconDatabase,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";

interface CallEntry {
  id: string;
  query: string;
  result: string;
  cached: boolean;
  cost: string;
  timestamp: number;
  icon: React.ReactNode;
}

// Mock data — will be replaced with real on-chain data
const MOCK_CALLS: CallEntry[] = [
  {
    id: "0x7f3a…c1d2",
    query: "ETH price",
    result: "$2,847.32",
    cached: false,
    cost: "$0.01",
    timestamp: Date.now() - 120000,
    icon: <IconCurrencyEthereum className="h-4 w-4" />,
  },
  {
    id: "0x9e2c…f5b6",
    query: "ETH price",
    result: "$2,847.32",
    cached: true,
    cost: "$0.0001",
    timestamp: Date.now() - 90000,
    icon: <IconCurrencyEthereum className="h-4 w-4" />,
  },
  {
    id: "0x4b1d…a8e3",
    query: "BTC price",
    result: "$67,234.18",
    cached: false,
    cost: "$0.01",
    timestamp: Date.now() - 60000,
    icon: <IconCurrencyBitcoin className="h-4 w-4" />,
  },
  {
    id: "0x2f8a…d4c1",
    query: "Denver weather",
    result: "12°C — Sunny",
    cached: false,
    cost: "$0.01",
    timestamp: Date.now() - 30000,
    icon: <IconCloud className="h-4 w-4" />,
  },
  {
    id: "0x6c3e…b2a7",
    query: "explain DeFi",
    result: "Decentralized Finance is…",
    cached: true,
    cost: "$0.0001",
    timestamp: Date.now() - 10000,
    icon: <IconBrain className="h-4 w-4" />,
  },
];

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function MyCallContent() {
  const { isConnected, address } = useAccount();

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-2xl mx-auto text-center py-12"
      >
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
          <IconDatabase className="h-8 w-8 text-white/40" />
        </div>
        <h3 className="text-white/70 text-xl font-medium mb-2">Connect your wallet</h3>
        <p className="text-white/40 text-base">
          Connect your wallet to see your previous API calls and their on-chain status.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-5 px-3 py-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md">
        <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-white/80 text-base font-mono">
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </span>
        <span className="text-white/40 text-base">·</span>
        <span className="text-white/60 text-base">{MOCK_CALLS.length} calls</span>
      </div>

      <div className="grid gap-3">
        {MOCK_CALLS.map((call, idx) => (
          <motion.div
            key={call.id + idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md hover:bg-white/15 transition-all cursor-target"
          >
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white">
              {call.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-lg">{call.query}</span>
                {call.cached ? (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                    <IconCheck className="h-3.5 w-3.5" />
                    CACHED
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">FRESH</span>
                )}
              </div>
              <p className="text-white/60 text-base mt-0.5 truncate font-mono">{call.result}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-white/80 text-base font-mono">{call.cost}</div>
              <div className="text-white/40 text-sm">{timeAgo(call.timestamp)}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

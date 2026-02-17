"use client";

import React from "react";
import {
  IconBrain,
  IconChartLine,
  IconCloud,
  IconCurrencyBitcoin,
  IconCurrencyDollar,
  IconCurrencyEthereum,
  IconNews,
  IconWorld,
} from "@tabler/icons-react";
import { motion } from "framer-motion";

interface ApiEntry {
  name: string;
  description: string;
  refreshRate: string;
  icon: React.ReactNode;
  category: string;
}

const MOCK_APIS: ApiEntry[] = [
  {
    name: "BTC / USD",
    description: "Bitcoin price feed from CoinGecko",
    refreshRate: "~0.1s",
    icon: <IconCurrencyBitcoin className="h-5 w-5" />,
    category: "Crypto",
  },
  {
    name: "ETH / USD",
    description: "Ethereum price feed from CoinGecko",
    refreshRate: "~0.1s",
    icon: <IconCurrencyEthereum className="h-5 w-5" />,
    category: "Crypto",
  },
  {
    name: "SOL / USD",
    description: "Solana price feed from CoinGecko",
    refreshRate: "~0.5s",
    icon: <IconCurrencyDollar className="h-5 w-5" />,
    category: "Crypto",
  },
  {
    name: "Stock S&P 500",
    description: "S&P 500 index tracking",
    refreshRate: "~1s",
    icon: <IconChartLine className="h-5 w-5" />,
    category: "Stocks",
  },
  {
    name: "EUR / USD",
    description: "Euro to Dollar exchange rate",
    refreshRate: "~0.5s",
    icon: <IconCurrencyDollar className="h-5 w-5" />,
    category: "Forex",
  },
  {
    name: "Weather API",
    description: "Real-time weather data via wttr.in",
    refreshRate: "~30s",
    icon: <IconCloud className="h-5 w-5" />,
    category: "Data",
  },
  {
    name: "AI / LLM",
    description: "Groq Llama 3.3 70B inference",
    refreshRate: "~2s",
    icon: <IconBrain className="h-5 w-5" />,
    category: "AI",
  },
  {
    name: "GBP / USD",
    description: "British Pound to Dollar rate",
    refreshRate: "~0.5s",
    icon: <IconCurrencyDollar className="h-5 w-5" />,
    category: "Forex",
  },
  {
    name: "World News",
    description: "Breaking news headlines aggregator",
    refreshRate: "~60s",
    icon: <IconNews className="h-5 w-5" />,
    category: "Data",
  },
  {
    name: "Gas Tracker",
    description: "Monad network gas price tracker",
    refreshRate: "~1s",
    icon: <IconWorld className="h-5 w-5" />,
    category: "Crypto",
  },
];

export function MarketContent() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="grid gap-3">
        {MOCK_APIS.map((api, idx) => (
          <motion.div
            key={api.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all group cursor-target"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white/80 group-hover:text-white transition-colors">
              {api.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">{api.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 uppercase tracking-wider">
                  {api.category}
                </span>
              </div>
              <p className="text-white/40 text-xs mt-0.5 truncate">{api.description}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-white/60 text-xs">refresh</div>
              <div className="text-white font-mono text-sm">{api.refreshRate}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

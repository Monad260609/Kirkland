"use client";

import React from "react";
import { IconCurrencyEthereum } from "@tabler/icons-react";
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
    name: "ETH / USD",
    description: "Ethereum price feed from CoinGecko",
    refreshRate: "~0.1s",
    icon: <IconCurrencyEthereum className="h-5 w-5" />,
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
            className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md hover:bg-white/15 transition-all group cursor-target"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 text-white group-hover:text-white transition-colors">
              {api.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-lg">{api.name}</span>
                <span className="text-sm px-2 py-0.5 rounded-full bg-white/10 text-white/60 uppercase tracking-wider">
                  {api.category}
                </span>
              </div>
              <p className="text-white/60 text-base mt-0.5 truncate">{api.description}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-white/70 text-base">refresh</div>
              <div className="text-white font-mono text-lg">{api.refreshRate}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

"use client";

import React from "react";
import { IconArrowRight, IconBolt, IconCash, IconDatabase, IconRefresh } from "@tabler/icons-react";
import { motion } from "framer-motion";

const STEPS = [
  {
    icon: <IconBolt className="h-6 w-6" />,
    title: "x402 Payment Protocol",
    description:
      "Every API call goes through the x402 payment protocol. Your agent pays with crypto — no API keys, no subscriptions, no accounts needed. Just a wallet.",
  },
  {
    icon: <IconDatabase className="h-6 w-6" />,
    title: "On-Chain Data Cache",
    description:
      "When you query for data (crypto price, weather, AI response), the result is stored on-chain in our DataCache smart contract on Monad. Every piece of data has a TTL (time-to-live).",
  },
  {
    icon: <IconCash className="h-6 w-6" />,
    title: "Freshness Has a Price",
    description:
      'First requester pays the full price ($0.01) — they "seed" the cache. Subsequent requesters read from on-chain for almost free ($0.0001). You pay for freshness, not for data.',
  },
  {
    icon: <IconRefresh className="h-6 w-6" />,
    title: "Auto-Refresh Cycle",
    description:
      "After the TTL expires (60s), the data is marked stale. The next requester pays the seed price again, refreshing the cache for everyone. It's a self-sustaining data CDN.",
  },
];

const FLOW_STEPS = [
  { label: "Agent queries", sub: '"ETH price"' },
  { label: "Cache check", sub: "on-chain" },
  { label: "MISS → Fetch API", sub: "pay $0.01" },
  { label: "Store on-chain", sub: "seed cache" },
  { label: "HIT → Read cache", sub: "pay $0.0001" },
];

export function HowItWorksContent() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Flow diagram */}
      <div className="flex items-center justify-center gap-1 md:gap-2 mb-8 flex-wrap">
        {FLOW_STEPS.map((step, idx) => (
          <React.Fragment key={step.label}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              className="flex flex-col items-center px-4 py-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md"
            >
              <span className="text-white text-base font-semibold">{step.label}</span>
              <span className="text-white/60 text-sm font-mono">{step.sub}</span>
            </motion.div>
            {idx < FLOW_STEPS.length - 1 && <IconArrowRight className="h-4 w-4 text-white/20 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Detailed steps */}
      <div className="grid gap-4">
        {STEPS.map((step, idx) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + idx * 0.08, duration: 0.3 }}
            className="flex gap-4 px-6 py-5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 text-white shrink-0">
              {step.icon}
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg mb-1">{step.title}</h3>
              <p className="text-white/60 text-base leading-relaxed">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 text-center"
      >
        <p className="text-white/50 text-base">
          Built on <span className="text-white/70 font-medium">Monad Testnet</span> · Powered by{" "}
          <span className="text-white/70 font-medium">x402 Protocol</span> ·{" "}
          <span className="text-white/70 font-medium">thirdweb</span> Server Wallets
        </p>
      </motion.div>
    </motion.div>
  );
}

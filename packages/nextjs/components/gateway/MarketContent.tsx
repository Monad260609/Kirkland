"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IconChevronDown, IconCloud, IconCoin, IconWorld } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { HoverEffect } from "~~/components/ui/card-hover-effect";

/* ── data ── */

interface CategoryData {
  title: string;
  description: string;
  icon: React.ReactNode;
  options: string[];
  catKey: string;
}

const CATEGORIES: CategoryData[] = [
  {
    title: "Crypto Prices (CoinGecko)",
    description: "Real-time token prices via CoinGecko API",
    icon: <IconCoin className="h-6 w-6" />,
    options: ["eth", "btc", "sol", "matic", "avax", "dot", "ada", "mon"],
    catKey: "crypto",
  },
  {
    title: "Weather (wttr.in)",
    description: "Weather data for any city worldwide",
    icon: <IconCloud className="h-6 w-6" />,
    options: ["Denver weather", "weather in Paris", "Tokyo forecast", "London forecast", "New York weather"],
    catKey: "weather",
  },
  {
    title: "Country Info (REST Countries)",
    description: "Country data: population, area, capital…",
    icon: <IconWorld className="h-6 w-6" />,
    options: ["France info", "Japan country", "Brazil population", "USA details", "Germany info"],
    catKey: "countries",
  },
];

/* ── dropdown ── */

function MetricDropdown({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={selected}
        onChange={e => onSelect(e.target.value)}
        className="w-full appearance-none px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-sm hover:bg-white/15 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/30 pr-8"
        style={{ WebkitAppearance: "none" }}
      >
        {options.map(opt => (
          <option key={opt} value={opt} className="bg-neutral-900 text-white">
            {opt}
          </option>
        ))}
      </select>
      <IconChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
    </div>
  );
}

/* ── main ── */

export function MarketContent() {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<number, string>>(
    Object.fromEntries(CATEGORIES.map((cat, i) => [i, cat.options[0]])),
  );

  const hoverItems = CATEGORIES.map((cat, i) => ({
    title: cat.title,
    description: cat.description,
    icon: cat.icon,
    children: (
      <div className="space-y-3">
        <MetricDropdown
          options={cat.options}
          selected={selections[i]}
          onSelect={v => setSelections(prev => ({ ...prev, [i]: v }))}
        />
        <button
          onClick={() =>
            router.push(`/market/result?cat=${encodeURIComponent(cat.catKey)}&q=${encodeURIComponent(selections[i])}`)
          }
          className="w-full px-4 py-2.5 rounded-xl bg-white/15 border border-white/20 text-white text-sm font-semibold hover:bg-white/25 hover:border-white/30 active:scale-[0.98] transition-all"
        >
          Request API →
        </button>
      </div>
    ),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-5xl mx-auto"
    >
      <HoverEffect items={hoverItems} />
    </motion.div>
  );
}

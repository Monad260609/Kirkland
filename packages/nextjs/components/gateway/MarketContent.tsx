"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowsExchange, IconChevronDown, IconCloud, IconCoin, IconSparkles, IconWorld } from "@tabler/icons-react";
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
    options: ["New York weather", "Paris weather", "Tokyo weather", "London weather", "Miami weather"],
    catKey: "weather",
  },
  {
    title: "Uniswap Quotes (Ethereum)",
    description: "On-chain V3 pool quotes via QuoterV2, cached on Monad",
    icon: <IconArrowsExchange className="h-6 w-6" />,
    options: [
      "quote 1 eth to usdc",
      "quote 1 eth to dai",
      "quote 1 wbtc to usdc",
      "quote 100 usdc to eth",
      "quote 1 link to eth",
    ],
    catKey: "swap",
  },
];

const AI_SUGGESTIONS = ["what is the speed of light", "who invented bitcoin", "when was new york founded"];

const COUNTRIES = ["France", "Japan", "Brazil", "USA", "Germany", "South Korea"];
const COUNTRY_INFOS = ["All info", "Population", "Capital", "Currency", "Region"];

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
        className="w-full appearance-none px-3 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-base hover:bg-white/15 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/30 pr-8"
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

/* ── Country picker: country + desired info as two selects ── */

function CountryPicker() {
  const router = useRouter();
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [info, setInfo] = useState(COUNTRY_INFOS[0]);

  const request = () => {
    // "France info" / "France population" — both resolve to the country
    // intent; the full payload always comes from REST Countries and the
    // focus param only drives which field the result page highlights.
    const infoWord = info === "All info" ? "info" : info.toLowerCase();
    const q = `${country} ${infoWord}`;
    const focus = info === "All info" ? "all" : info.toLowerCase();
    router.push(`/market/result?cat=countries&q=${encodeURIComponent(q)}&focus=${encodeURIComponent(focus)}`);
  };

  return (
    <div className="space-y-3">
      <MetricDropdown options={COUNTRIES} selected={country} onSelect={setCountry} />
      <MetricDropdown options={COUNTRY_INFOS} selected={info} onSelect={setInfo} />
      <button
        onClick={request}
        className="w-full px-4 py-2.5 rounded-xl bg-white/15 border border-white/20 text-white text-base font-semibold hover:bg-white/25 hover:border-white/30 active:scale-[0.98] transition-all"
      >
        Request API →
      </button>
    </div>
  );
}

/* ── AI chat input (free-form, replaces the dropdown for the AI card) ── */

function AIChatInput() {
  const router = useRouter();
  const [question, setQuestion] = useState("");

  const ask = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/market/result?cat=ai&q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={e => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask anything…"
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-base placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
        />
        <button
          type="submit"
          disabled={!question.trim()}
          className="px-4 py-2.5 rounded-xl bg-white/15 border border-white/20 text-white text-base font-semibold hover:bg-white/25 hover:border-white/30 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Ask →
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {AI_SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => ask(s)}
            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/15 hover:text-white transition-all"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── main ── */

export function MarketContent() {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<number, string>>(
    Object.fromEntries(CATEGORIES.map((cat, i) => [i, cat.options[0]])),
  );

  const categoryItems = CATEGORIES.map((cat, i) => ({
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
          className="w-full px-4 py-2.5 rounded-xl bg-white/15 border border-white/20 text-white text-base font-semibold hover:bg-white/25 hover:border-white/30 active:scale-[0.98] transition-all"
        >
          Request API →
        </button>
      </div>
    ),
  }));

  // Row 1: the three classic data feeds · Row 2 (centered): swap + AI
  const hoverItems = [
    categoryItems[0], // crypto
    categoryItems[1], // weather
    {
      title: "Country Info (REST Countries)",
      description: "Pick a country and the info you need",
      icon: <IconWorld className="h-6 w-6" />,
      children: <CountryPicker />,
    },
    categoryItems[2], // uniswap
    {
      title: "Ask AI (Groq)",
      description: "Llama 3.3 70B answers, cached on Monad like any data",
      icon: <IconSparkles className="h-6 w-6" />,
      children: <AIChatInput />,
    },
  ];

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

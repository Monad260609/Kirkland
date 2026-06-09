"use client";

import { IconCode, IconTerminal2 } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { Terminal } from "~~/components/ui/terminal";

const TERMINAL_LINES = [
  { text: 'cachemarket query "price of ETH"', type: "command" as const, delay: 500 },
  { text: "Checking on-chain cache...", type: "info" as const, delay: 200 },
  { text: "Cache miss — fetching from CoinGecko...", type: "error" as const, delay: 600 },
  { text: "Stored on-chain (tx: 0xab3f...c821)", type: "success" as const, delay: 400 },
  { text: "ETH: $1,648.23 — Cost: 0.001 MON (seeder)", type: "output" as const, delay: 100 },
  { text: "", type: "output" as const, delay: 800 },
  { text: 'cachemarket query "price of ETH"', type: "command" as const, delay: 400 },
  { text: "Checking on-chain cache...", type: "info" as const, delay: 200 },
  { text: "Cache hit!", type: "success" as const, delay: 300 },
  { text: "ETH: $1,648.23 — Cost: 0.0001 MON (10x cheaper)", type: "output" as const, delay: 100 },
];

export function DevToolsContent() {
  return (
    <div className="flex flex-col items-center w-full">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <h1 className="font-[family-name:var(--font-vt323)] text-5xl md:text-7xl text-white tracking-wider mb-4">
          Dev Tools
        </h1>
        <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto">
          CLI tool and SDK for querying on-chain cached data, seeding the cache, and integrating Cachemarket into your
          application.
        </p>
      </motion.div>

      {/* CLI Terminal */}
      <section className="flex flex-col items-center w-full mb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-center gap-2 mb-6"
        >
          <IconTerminal2 className="h-5 w-5 text-purple-400" />
          <h2 className="text-white font-bold text-xl">CLI Tool</h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-white/70 text-sm text-center max-w-lg mb-6"
        >
          Query any data source directly from your terminal. The CLI handles caching, payments, and on-chain storage
          automatically.
        </motion.p>

        <Terminal lines={TERMINAL_LINES} title="cachemarket-cli" />
      </section>

      {/* SDK */}
      <section className="flex flex-col items-center w-full mb-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 mb-2"
        >
          <IconCode className="h-5 w-5 text-purple-400" />
          <h2 className="text-white font-bold text-xl">SDK</h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-white/70 text-sm text-center max-w-lg mb-6"
        >
          Integrate Cachemarket into any application. Query cached data, seed the cache, and manage your on-chain data —
          all from a simple SDK.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full max-w-2xl rounded-2xl overflow-hidden border border-white/10 bg-black/60 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-white/40 text-xs ml-2 font-mono">app.ts</span>
          </div>

          <pre className="p-4 font-mono text-sm overflow-x-auto">
            <code>
              <span className="text-purple-400">import</span>
              <span className="text-white">{" { CacheMarket } "}</span>
              <span className="text-purple-400">from</span>
              <span className="text-green-400"> &quot;@cachemarket/sdk&quot;</span>
              {"\n\n"}
              <span className="text-purple-400">const</span>
              <span className="text-white"> client = </span>
              <span className="text-purple-400">new</span>
              <span className="text-blue-400"> CacheMarket</span>
              <span className="text-white">{"({"}</span>
              {"\n"}
              <span className="text-white">{"  network: "}</span>
              <span className="text-green-400">&quot;monad&quot;</span>
              <span className="text-white">,</span>
              {"\n"}
              <span className="text-white">{"  wallet: "}</span>
              <span className="text-green-400">&quot;0x...&quot;</span>
              {"\n"}
              <span className="text-white">{"})"}</span>
              {"\n\n"}
              <span className="text-white/50">{"// Query with automatic caching"}</span>
              {"\n"}
              <span className="text-purple-400">const</span>
              <span className="text-white"> result = </span>
              <span className="text-purple-400">await</span>
              <span className="text-white"> client.</span>
              <span className="text-blue-400">query</span>
              <span className="text-white">(</span>
              <span className="text-green-400">&quot;price of ETH&quot;</span>
              <span className="text-white">)</span>
              {"\n\n"}
              <span className="text-white">console.</span>
              <span className="text-blue-400">log</span>
              <span className="text-white">(result.data) </span>
              <span className="text-white/50">{"// $1,648.23"}</span>
              {"\n"}
              <span className="text-white">console.</span>
              <span className="text-blue-400">log</span>
              <span className="text-white">(result.cached) </span>
              <span className="text-white/50">{"// true"}</span>
              {"\n"}
              <span className="text-white">console.</span>
              <span className="text-blue-400">log</span>
              <span className="text-white">(result.cost) </span>
              <span className="text-white/50">{"// 0.0001 MON"}</span>
            </code>
          </pre>
        </motion.div>
      </section>
    </div>
  );
}

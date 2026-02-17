"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { IconArrowRight, IconBolt, IconCode, IconTerminal2 } from "@tabler/icons-react";
import { motion } from "framer-motion";
import type { NextPage } from "next";
import { Terminal } from "~~/components/ui/terminal";

/* ─── Terminal demo lines ─── */
const TERMINAL_LINES = [
  { text: 'cachemarket query "price of ETH"', type: "command" as const, delay: 500 },
  { text: "Checking on-chain cache...", type: "info" as const, delay: 200 },
  { text: "Cache miss — fetching from CoinGecko...", type: "error" as const, delay: 600 },
  { text: "Stored on-chain (tx: 0xab3f...c821)", type: "success" as const, delay: 400 },
  { text: "ETH: $3,847.21 — Cost: $0.01 (seeder)", type: "output" as const, delay: 100 },
  { text: "", type: "output" as const, delay: 800 },
  { text: 'cachemarket query "price of ETH"', type: "command" as const, delay: 400 },
  { text: "Checking on-chain cache...", type: "info" as const, delay: 200 },
  { text: "Cache hit!", type: "success" as const, delay: 300 },
  { text: "ETH: $3,847.21 — Cost: $0.0001 (100x cheaper)", type: "output" as const, delay: 100 },
];

/* ─── Stats component ─── */
function LiveStats() {
  const [stats, setStats] = useState({ seeds: 0, hits: 0, queries: 0 });

  useEffect(() => {
    fetch("/api/stats")
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {});
  }, []);

  const items = [
    { label: "Total Seeds", value: stats.seeds },
    { label: "Cache Hits", value: stats.hits },
    { label: "Total Queries", value: stats.queries },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 w-full max-w-2xl mx-auto">
      {items.map((item, idx) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 + idx * 0.1, duration: 0.4 }}
          className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 text-center"
        >
          <div className="text-2xl md:text-3xl font-bold text-white">{item.value}</div>
          <div className="text-white/70 text-xs mt-1">{item.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Main Landing ─── */
const Home: NextPage = () => {
  return (
    <>
      <ShaderGradientCanvas
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <ShaderGradient
          type="plane"
          animate="on"
          uSpeed={0.3}
          uStrength={1.5}
          uDensity={1.5}
          uFrequency={0}
          uAmplitude={0}
          color1="#606080"
          color2="#8d7dca"
          color3="#212121"
          positionX={0}
          positionY={0}
          positionZ={0}
          rotationX={50}
          rotationY={0}
          rotationZ={-60}
          cDistance={2.8}
          cPolarAngle={80}
          cAzimuthAngle={180}
          cameraZoom={9.1}
          brightness={1}
          envPreset="city"
          grain="on"
          grainBlending={0}
          lightType="3d"
          reflection={0.1}
        />
      </ShaderGradientCanvas>

      <div className="relative z-10 flex flex-col grow px-6 md:px-12 pt-16 pb-16 overflow-y-auto scrollbar-hide">
        {/* ─── Hero Section ─── */}
        <section className="flex flex-col items-center text-center mb-20">
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-[family-name:var(--font-vt323)] text-6xl md:text-8xl text-white tracking-wider mb-4"
          >
            Cachemarket
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-white/90 text-lg md:text-xl max-w-2xl mb-3"
          >
            Cache once, read forever — on-chain.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-white/70 text-sm md:text-base max-w-xl mb-8"
          >
            An on-chain data caching protocol on Monad. The first requester seeds the cache, everyone else reads for
            100x less. No API keys. No subscriptions. Just a wallet.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex gap-4"
          >
            <Link
              href="/dashboard"
              className="cursor-target flex items-center gap-2 px-6 py-3 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-200 hover:bg-purple-500/30 backdrop-blur-sm transition-all font-medium"
            >
              <IconBolt className="h-5 w-5" />
              Launch App
            </Link>
            <Link
              href="/how-it-works"
              className="cursor-target flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/90 hover:bg-white/10 backdrop-blur-sm transition-all font-medium"
            >
              Learn More
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </section>

        {/* ─── CLI Terminal Demo ─── */}
        <section className="flex flex-col items-center mb-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex items-center gap-2 mb-6"
          >
            <IconTerminal2 className="h-5 w-5 text-purple-400" />
            <h2 className="text-white font-bold text-xl">CLI Tool</h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="text-white/70 text-sm text-center max-w-lg mb-6"
          >
            Query any data source directly from your terminal. The CLI handles caching, payments, and on-chain storage
            automatically.
          </motion.p>

          <Terminal lines={TERMINAL_LINES} title="cachemarket-cli" />
        </section>

        {/* ─── SDK Section ─── */}
        <section className="flex flex-col items-center mb-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="flex items-center gap-2 mb-2"
          >
            <IconCode className="h-5 w-5 text-purple-400" />
            <h2 className="text-white font-bold text-xl">SDK</h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05 }}
            className="text-white/70 text-sm text-center max-w-lg mb-6"
          >
            Integrate Cachemarket into any application. Query cached data, seed the cache, and manage your on-chain data
            — all from a simple SDK.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
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
                <span className="text-white/50">{"// $3,847.21"}</span>
                {"\n"}
                <span className="text-white">console.</span>
                <span className="text-blue-400">log</span>
                <span className="text-white">(result.cached) </span>
                <span className="text-white/50">{"// true"}</span>
                {"\n"}
                <span className="text-white">console.</span>
                <span className="text-blue-400">log</span>
                <span className="text-white">(result.cost) </span>
                <span className="text-white/50">{"// $0.0001"}</span>
              </code>
            </pre>
          </motion.div>
        </section>

        {/* ─── Live Stats ─── */}
        <section className="flex flex-col items-center mb-16">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.15 }}
            className="text-white font-bold text-xl mb-6"
          >
            Live On-Chain Stats
          </motion.h2>
          <LiveStats />
        </section>

        {/* ─── Footer ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="text-center"
        >
          <p className="text-white/60 text-sm">
            Built on <span className="text-white/80 font-medium">Monad Testnet</span> · Powered by{" "}
            <span className="text-white/80 font-medium">x402 Protocol</span>
          </p>
        </motion.div>
      </div>
    </>
  );
};

export default Home;

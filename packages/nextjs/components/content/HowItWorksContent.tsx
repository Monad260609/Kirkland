"use client";

import { motion } from "framer-motion";

function FlowDiagram() {
  return (
    <div className="w-full max-w-4xl mx-auto mb-24">
      <h2 className="text-2xl text-white font-bold mb-10 text-center">Architecture</h2>
      <svg viewBox="0 0 900 420" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        <rect
          x="20"
          y="160"
          width="150"
          height="80"
          rx="16"
          fill="#7c3aed"
          fillOpacity="0.25"
          stroke="#7c3aed"
          strokeOpacity="0.7"
          strokeWidth="1.5"
        />
        <text x="95" y="195" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" fontFamily="monospace">
          User / Agent
        </text>
        <text x="95" y="218" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="11" fontFamily="monospace">
          query + wallet
        </text>

        <rect
          x="280"
          y="160"
          width="150"
          height="80"
          rx="16"
          fill="#3b82f6"
          fillOpacity="0.25"
          stroke="#3b82f6"
          strokeOpacity="0.7"
          strokeWidth="1.5"
        />
        <text x="355" y="195" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" fontFamily="monospace">
          x402 Gateway
        </text>
        <text x="355" y="218" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="11" fontFamily="monospace">
          intent detection
        </text>

        <rect
          x="540"
          y="160"
          width="160"
          height="80"
          rx="16"
          fill="#22c55e"
          fillOpacity="0.25"
          stroke="#22c55e"
          strokeOpacity="0.7"
          strokeWidth="1.5"
        />
        <text x="620" y="195" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" fontFamily="monospace">
          DataCache
        </text>
        <text x="620" y="218" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="11" fontFamily="monospace">
          Monad contract
        </text>

        <rect
          x="540"
          y="20"
          width="160"
          height="70"
          rx="16"
          fill="#f59e0b"
          fillOpacity="0.25"
          stroke="#f59e0b"
          strokeOpacity="0.7"
          strokeWidth="1.5"
        />
        <text x="620" y="52" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="monospace">
          External APIs
        </text>
        <text x="620" y="72" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="11" fontFamily="monospace">
          CoinGecko · wttr.in
        </text>

        <rect
          x="280"
          y="330"
          width="150"
          height="70"
          rx="16"
          fill="#7c3aed"
          fillOpacity="0.25"
          stroke="#7c3aed"
          strokeOpacity="0.7"
          strokeWidth="1.5"
        />
        <text x="355" y="362" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="monospace">
          Response
        </text>
        <text x="355" y="382" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="11" fontFamily="monospace">
          data + tx hash
        </text>

        <line
          x1="170"
          y1="200"
          x2="275"
          y2="200"
          stroke="white"
          strokeOpacity="0.6"
          strokeWidth="1.5"
          markerEnd="url(#arrow)"
        />
        <text x="222" y="192" textAnchor="middle" fill="white" fillOpacity="0.8" fontSize="10" fontFamily="monospace">
          POST /query
        </text>

        <line
          x1="430"
          y1="200"
          x2="535"
          y2="200"
          stroke="white"
          strokeOpacity="0.6"
          strokeWidth="1.5"
          markerEnd="url(#arrow)"
        />
        <text x="482" y="192" textAnchor="middle" fill="white" fillOpacity="0.8" fontSize="10" fontFamily="monospace">
          checkCache()
        </text>

        <line
          x1="380"
          y1="160"
          x2="540"
          y2="70"
          stroke="#ef4444"
          strokeOpacity="0.7"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          markerEnd="url(#arrowRed)"
        />
        <text x="440" y="100" textAnchor="middle" fill="#ef4444" fillOpacity="0.9" fontSize="10" fontFamily="monospace">
          MISS → fetch
        </text>

        <line
          x1="620"
          y1="90"
          x2="620"
          y2="155"
          stroke="#22c55e"
          strokeOpacity="0.7"
          strokeWidth="1.5"
          markerEnd="url(#arrowGreen)"
        />
        <text x="660" y="130" textAnchor="start" fill="#22c55e" fillOpacity="0.9" fontSize="10" fontFamily="monospace">
          storeResult()
        </text>

        <line
          x1="540"
          y1="220"
          x2="430"
          y2="340"
          stroke="#22c55e"
          strokeOpacity="0.7"
          strokeWidth="1.5"
          markerEnd="url(#arrowGreen)"
        />
        <text x="510" y="290" textAnchor="middle" fill="#22c55e" fillOpacity="0.9" fontSize="10" fontFamily="monospace">
          HIT → cached data
        </text>

        <line
          x1="355"
          y1="240"
          x2="355"
          y2="325"
          stroke="white"
          strokeOpacity="0.6"
          strokeWidth="1.5"
          markerEnd="url(#arrow)"
        />

        <line
          x1="280"
          y1="365"
          x2="95"
          y2="245"
          stroke="white"
          strokeOpacity="0.6"
          strokeWidth="1.5"
          markerEnd="url(#arrow)"
        />

        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" fill="white" fillOpacity="0.7" />
          </marker>
          <marker id="arrowRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" fill="#ef4444" fillOpacity="0.85" />
          </marker>
          <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" fill="#22c55e" fillOpacity="0.85" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

function LifecycleDiagram() {
  return (
    <div className="w-full max-w-3xl mx-auto mb-24">
      <h2 className="text-2xl text-white font-bold mb-10 text-center">Cache Lifecycle</h2>
      <svg viewBox="0 0 700 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        <circle
          cx="120"
          cy="132"
          r="20"
          fill="#7c3aed"
          fillOpacity="0.35"
          stroke="#7c3aed"
          strokeOpacity="0.8"
          strokeWidth="1.5"
        />
        <text x="120" y="137" textAnchor="middle" fill="#a78bfa" fontSize="14" fontWeight="700">
          1
        </text>
        <text x="120" y="90" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">
          Seed
        </text>
        <text x="120" y="108" textAnchor="middle" fill="white" fillOpacity="0.6" fontSize="10">
          $0.01
        </text>
        <text x="120" y="175" textAnchor="middle" fill="white" fillOpacity="0.8" fontSize="10" fontFamily="monospace">
          fetch + store
        </text>

        <rect
          x="180"
          y="120"
          width="200"
          height="24"
          rx="12"
          fill="#22c55e"
          fillOpacity="0.2"
          stroke="#22c55e"
          strokeOpacity="0.5"
          strokeWidth="1"
        />
        <text x="280" y="136" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="600">
          CACHE ACTIVE — 60s TTL
        </text>
        <text x="280" y="210" textAnchor="middle" fill="white" fillOpacity="0.8" fontSize="10" fontFamily="monospace">
          reads @ $0.0001 each
        </text>

        <circle
          cx="430"
          cy="132"
          r="20"
          fill="#f59e0b"
          fillOpacity="0.35"
          stroke="#f59e0b"
          strokeOpacity="0.8"
          strokeWidth="1.5"
        />
        <text x="430" y="137" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="700">
          2
        </text>
        <text x="430" y="90" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">
          Expire
        </text>
        <text x="430" y="108" textAnchor="middle" fill="white" fillOpacity="0.6" fontSize="10">
          TTL reached
        </text>
        <text x="430" y="175" textAnchor="middle" fill="white" fillOpacity="0.8" fontSize="10" fontFamily="monospace">
          data marked stale
        </text>

        <circle
          cx="560"
          cy="132"
          r="20"
          fill="#7c3aed"
          fillOpacity="0.35"
          stroke="#7c3aed"
          strokeOpacity="0.8"
          strokeWidth="1.5"
        />
        <text x="560" y="137" textAnchor="middle" fill="#a78bfa" fontSize="14" fontWeight="700">
          3
        </text>
        <text x="560" y="90" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">
          Re-seed
        </text>
        <text x="560" y="108" textAnchor="middle" fill="white" fillOpacity="0.6" fontSize="10">
          $0.01
        </text>
        <text x="560" y="175" textAnchor="middle" fill="white" fillOpacity="0.8" fontSize="10" fontFamily="monospace">
          new cycle begins
        </text>

        <path
          d="M590 132 Q650 132 650 80 Q650 30 350 30 Q80 30 80 80 Q80 120 100 132"
          stroke="white"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          fill="none"
          markerEnd="url(#arrowLoop)"
        />
        <text x="350" y="48" textAnchor="middle" fill="white" fillOpacity="0.6" fontSize="10" fontFamily="monospace">
          self-sustaining cycle
        </text>

        <defs>
          <marker id="arrowLoop" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" fill="white" fillOpacity="0.5" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

function PricingSection() {
  return (
    <div className="w-full max-w-3xl mx-auto mb-24">
      <h2 className="text-2xl text-white font-bold mb-10 text-center">Pricing</h2>
      <div className="overflow-hidden">
        <div className="grid grid-cols-3 border-b border-white/10 bg-white/5">
          <div className="px-6 py-4 text-white/50 text-xs uppercase tracking-wider font-mono">Role</div>
          <div className="px-6 py-4 text-white/50 text-xs uppercase tracking-wider font-mono">Cost</div>
          <div className="px-6 py-4 text-white/50 text-xs uppercase tracking-wider font-mono">What happens</div>
        </div>
        <div className="grid grid-cols-3 border-b border-white/10">
          <div className="px-6 py-5">
            <span className="text-purple-300 font-bold">Seeder</span>
          </div>
          <div className="px-6 py-5">
            <span className="text-white font-bold text-xl">0.001 MON</span>
          </div>
          <div className="px-6 py-5 text-white/70 text-sm">
            First request fetches from source, stores result on-chain. You fund the cache for everyone.
          </div>
        </div>
        <div className="grid grid-cols-3 border-b border-white/10">
          <div className="px-6 py-5">
            <span className="text-green-300 font-bold">Reader</span>
          </div>
          <div className="px-6 py-5">
            <span className="text-white font-bold text-xl">0.0001 MON</span>
          </div>
          <div className="px-6 py-5 text-white/70 text-sm">
            Read cached data on-chain. 10x cheaper. Available until TTL expires.
          </div>
        </div>
        <div className="grid grid-cols-3">
          <div className="px-6 py-5">
            <span className="text-orange-300 font-bold">Refresh</span>
          </div>
          <div className="px-6 py-5">
            <span className="text-white font-bold text-xl">60s</span>
          </div>
          <div className="px-6 py-5 text-white/70 text-sm">
            TTL expiration. Next request becomes the new seeder. Cycle restarts.
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractReference() {
  return (
    <div className="w-full max-w-3xl mx-auto mb-24">
      <h2 className="text-2xl text-white font-bold mb-10 text-center">Smart Contract</h2>
      <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden font-mono text-sm">
        <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div>
            <span className="text-purple-400">contract</span> <span className="text-white font-bold">DataCache</span>
          </div>
          <span className="text-white/50 text-xs">0x8aff...5fca</span>
        </div>
        <div className="px-6 py-4 space-y-1 text-white/80">
          <div>
            <span className="text-white/40">{"// Storage"}</span>
          </div>
          <div>
            <span className="text-blue-400">mapping</span>(bytes32 {`=>`} CacheEntry){" "}
            <span className="text-white">entries</span>
          </div>
          <div>
            <span className="text-blue-400">uint256</span> <span className="text-white">defaultTTL</span>{" "}
            <span className="text-white/40">= 60</span>
          </div>
          <div className="pt-3">
            <span className="text-white/40">{"// Core functions"}</span>
          </div>
          <div>
            <span className="text-green-400">view</span> checkCache(bytes32 queryHash) → (bool, string)
          </div>
          <div>
            <span className="text-purple-400">write</span> storeResult(queryHash, query, data, seeder)
          </div>
          <div>
            <span className="text-green-400">view</span> getResult(bytes32 queryHash) → CacheEntry
          </div>
          <div>
            <span className="text-green-400">view</span> getStats() → (seeds, hits, queries)
          </div>
        </div>
      </div>
    </div>
  );
}

function DataSources() {
  return (
    <div className="w-full max-w-3xl mx-auto mb-24">
      <h2 className="text-2xl text-white font-bold mb-10 text-center">Supported Data Sources</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { name: "Crypto Prices", source: "CoinGecko API", examples: "ETH, BTC, SOL, MON" },
          { name: "Weather", source: "wttr.in", examples: "Any city worldwide" },
          { name: "Country Info", source: "REST Countries", examples: "Population, capital, area" },
        ].map(item => (
          <div key={item.name} className="px-6 py-6">
            <div className="text-white font-bold mb-1">{item.name}</div>
            <div className="text-white/50 text-xs font-mono mb-3">{item.source}</div>
            <div className="text-white/70 text-sm">{item.examples}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HowItWorksContent() {
  return (
    <div className="flex flex-col items-center w-full">
      {/* Title */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h1 className="font-[family-name:var(--font-vt323)] text-5xl md:text-7xl text-white tracking-wider mb-4">
          How It Works
        </h1>
        <p className="text-white/80 text-lg max-w-xl mx-auto">
          An on-chain data cache on Monad. Pay for freshness, not for data.
        </p>
      </motion.div>

      {/* 1-liner summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-xl mx-auto mb-20 px-8 py-6"
      >
        <div className="flex flex-col gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-white mb-1">1.</div>
            <div className="text-white/80 text-sm">
              You query data via <span className="text-purple-300 font-mono">CLI</span> or{" "}
              <span className="text-purple-300 font-mono">SDK</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1">2.</div>
            <div className="text-white/80 text-sm">
              If cached on-chain, you read it for <span className="text-green-300 font-mono">$0.0001</span>
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white mb-1">3.</div>
            <div className="text-white/80 text-sm">
              If not, you seed the cache for <span className="text-purple-300 font-mono">$0.01</span>
            </div>
          </div>
        </div>
      </motion.div>

      <FlowDiagram />
      <LifecycleDiagram />
      <PricingSection />
      <DataSources />
      <ContractReference />

      <div className="text-center mt-8 mb-8">
        <p className="text-white/60 text-sm">
          Built on <span className="text-white/80 font-medium">Monad Testnet</span> · Powered by{" "}
          <span className="text-white/80 font-medium">x402 Protocol</span>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { IconArrowUpRight } from "@tabler/icons-react";
import { motion } from "framer-motion";
import type { NextPage } from "next";
import { DevToolsContent } from "~~/components/content/DevToolsContent";
import { HowItWorksContent } from "~~/components/content/HowItWorksContent";

type ActiveSection = "how-it-works" | "dev-tools" | null;

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
          transition={{ delay: 0.8 + idx * 0.1, duration: 0.4 }}
          className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 text-center"
        >
          <div className="text-2xl md:text-3xl font-bold text-white">{item.value}</div>
          <div className="text-white/70 text-sm mt-1">{item.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

const btnClass =
  "px-10 py-4 rounded-full bg-[#f5f0e8] text-[#1a1a2e] text-lg font-bold tracking-wide hover:bg-white transition-all duration-200 shadow-lg hover:shadow-xl";

/* ─── Main Landing ─── */
const Home: NextPage = () => {
  const [hoveredLaunch, setHoveredLaunch] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);

  const toggleSection = (section: "how-it-works" | "dev-tools") => {
    setActiveSection(prev => (prev === section ? null : section));
  };

  return (
    <>
      <ShaderGradientCanvas style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
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

      <div className="relative z-10 flex flex-col grow px-6 md:px-12 pt-20 pb-16 overflow-y-auto scrollbar-hide">
        {/* ─── Hero ─── */}
        <section className="flex flex-col items-center text-center mb-12">
          {/* Title — click to reset to initial state */}
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            onClick={() => setActiveSection(null)}
            className="font-[family-name:var(--font-vt323)] text-6xl md:text-8xl text-white tracking-wider mb-4 cursor-pointer select-none"
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
            className="text-white/70 text-base md:text-lg max-w-xl mb-8"
          >
            An on-chain data caching protocol on Monad. The first requester seeds the cache, everyone else reads for 10x
            less. No API keys. No subscriptions. Just a wallet.
          </motion.p>

          {/* ─── 3 CTA Buttons ─── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <button onClick={() => toggleSection("how-it-works")} className={btnClass}>
              How It Works
            </button>

            <button onClick={() => toggleSection("dev-tools")} className={btnClass}>
              Dev Tools
            </button>

            <Link
              href="/dashboard"
              onMouseEnter={() => setHoveredLaunch(true)}
              onMouseLeave={() => setHoveredLaunch(false)}
              className={`inline-flex items-center gap-2 ${btnClass}`}
            >
              <span>Launch App</span>
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={hoveredLaunch ? { opacity: 1, width: "auto" } : { opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <IconArrowUpRight className="h-5 w-5" />
              </motion.span>
            </Link>
          </motion.div>
        </section>

        {/* ─── Inline section content ─── */}
        {activeSection === "how-it-works" && (
          <section className="w-full">
            <HowItWorksContent />
          </section>
        )}
        {activeSection === "dev-tools" && (
          <section className="w-full">
            <DevToolsContent />
          </section>
        )}

        {/* ─── Default view: Live Stats ─── */}
        {activeSection === null && (
          <>
            <section className="flex flex-col items-center mb-16">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-white font-bold text-xl mb-6"
              >
                Live On-Chain Stats
              </motion.h2>
              <LiveStats />
            </section>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="text-center"
            >
              <p className="text-white/60 text-base">
                Built on <span className="text-white/80 font-medium">Monad Testnet</span> · Powered by{" "}
                <span className="text-white/80 font-medium">x402 Protocol</span>
              </p>
            </motion.div>
          </>
        )}
      </div>
    </>
  );
};

export default Home;

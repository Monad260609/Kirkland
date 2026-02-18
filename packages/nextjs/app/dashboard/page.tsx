"use client";

import { useState } from "react";
import Link from "next/link";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { IconBuildingStore, IconHistory } from "@tabler/icons-react";
import { AnimatePresence } from "framer-motion";
import type { NextPage } from "next";
import { MarketContent } from "~~/components/gateway/MarketContent";
import { MyCallContent } from "~~/components/gateway/MyCallContent";
import { FloatingDock } from "~~/components/ui/floating-dock";

const Dashboard: NextPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  const dockItems = [
    {
      title: "Market",
      icon: <IconBuildingStore className="h-full w-full text-white/70" />,
      onClick: () => setActiveTab(0),
    },
    {
      title: "My Calls",
      icon: <IconHistory className="h-full w-full text-white/70" />,
      onClick: () => setActiveTab(1),
    },
  ];

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

      <div className="relative z-10 flex flex-col grow px-6 md:px-12 pt-10 pb-32">
        {/* Back to home */}
        <Link
          href="/"
          className="cursor-target fixed top-4 left-4 z-20 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 backdrop-blur-sm transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Home
        </Link>

        <h1 className="text-center font-[family-name:var(--font-vt323)] text-5xl md:text-6xl text-white tracking-wider mb-10 select-none">
          Dashboard
        </h1>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            {activeTab === 0 && <MarketContent key="market" />}
            {activeTab === 1 && <MyCallContent key="mycall" />}
          </AnimatePresence>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="flex items-end justify-center px-6 pb-6 pt-4 pointer-events-auto">
          <FloatingDock items={dockItems} />
          <Link
            href="/about"
            className="absolute right-6 bottom-5 px-4 py-2 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-white/70 text-base tracking-wide cursor-pointer hover:bg-white/15 hover:text-white transition-all"
          >
            About us
          </Link>
        </div>
      </div>
    </>
  );
};

export default Dashboard;

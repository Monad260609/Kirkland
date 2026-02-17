"use client";

import { useState } from "react";
import Link from "next/link";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { IconBuildingStore, IconHistory, IconInfoCircle } from "@tabler/icons-react";
import { AnimatePresence } from "framer-motion";
import type { NextPage } from "next";
import { HowItWorksContent } from "~~/components/gateway/HowItWorksContent";
import { MarketContent } from "~~/components/gateway/MarketContent";
import { MyCallContent } from "~~/components/gateway/MyCallContent";
import { FloatingDock } from "~~/components/ui/floating-dock";

const Home: NextPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  const dockItems = [
    {
      title: "Market",
      icon: <IconBuildingStore className="h-full w-full text-white/70" />,
      onClick: () => setActiveTab(0),
    },
    {
      title: "My Call",
      icon: <IconHistory className="h-full w-full text-white/70" />,
      onClick: () => setActiveTab(1),
    },
    {
      title: "How it works",
      icon: <IconInfoCircle className="h-full w-full text-white/70" />,
      onClick: () => setActiveTab(2),
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
        {/* App Title */}
        <h1 className="text-center text-6xl md:text-7xl text-white tracking-wider mb-10 select-none">Cachemarket</h1>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            {activeTab === 0 && <MarketContent key="market" />}
            {activeTab === 1 && <MyCallContent key="mycall" />}
            {activeTab === 2 && <HowItWorksContent key="howitworks" />}
          </AnimatePresence>
        </div>
      </div>

      {/* Fixed bottom bar: dock centered, About Us right */}
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

export default Home;

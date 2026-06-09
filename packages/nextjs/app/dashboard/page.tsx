"use client";

import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import type { NextPage } from "next";
import { LiveFeed } from "~~/components/gateway/LiveFeed";
import { MarketContent } from "~~/components/gateway/MarketContent";
import { MyCalls } from "~~/components/gateway/MyCalls";

const Dashboard: NextPage = () => {
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

      <div className="relative z-10 flex flex-col grow px-6 md:px-12 pt-16 pb-16">
        <h1 className="text-center font-[family-name:var(--font-vt323)] text-5xl md:text-6xl text-white tracking-wider mb-10 select-none">
          Dashboard
        </h1>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <MarketContent />
          <LiveFeed />
          <MyCalls />
        </div>
      </div>
    </>
  );
};

export default Dashboard;

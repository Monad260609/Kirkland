"use client";

import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import type { NextPage } from "next";
import { DevToolsContent } from "~~/components/content/DevToolsContent";

const DevToolsPage: NextPage = () => {
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
        <DevToolsContent />
      </div>
    </>
  );
};

export default DevToolsPage;

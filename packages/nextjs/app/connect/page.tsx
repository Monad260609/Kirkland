"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import type { NextPage } from "next";
import { Connector, useAccount, useConnect, useConnectors } from "wagmi";
import TargetCursor from "~~/components/TargetCursor";

const WalletOption = ({ connector, onClick }: { connector: Connector; onClick: () => void }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const provider = await connector.getProvider();
      setReady(!!provider);
    })();
  }, [connector]);

  return (
    <button
      disabled={!ready}
      onClick={onClick}
      className="cursor-target flex items-center gap-4 w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 backdrop-blur-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {connector.icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={connector.icon} alt={connector.name} width={40} height={40} className="rounded-lg" />
      )}
      <span className="text-lg font-medium">{connector.name}</span>
    </button>
  );
};

const ConnectPage: NextPage = () => {
  const { isConnected } = useAccount();
  const { connect } = useConnect();
  const connectors = useConnectors();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  // Deduplicate connectors by name (RainbowKit can register duplicates)
  const uniqueConnectors = connectors.reduce<Connector[]>((acc, connector) => {
    if (!acc.find(c => c.name === connector.name)) {
      acc.push(connector);
    }
    return acc;
  }, []);

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

      <TargetCursor targetSelector=".cursor-target" />

      <div className="relative z-10 flex items-center justify-end grow pr-24">
        <div className="flex flex-col gap-6 max-w-sm w-full">
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-white">Connect Wallet</h1>
            <p className="text-white/50 mt-2">Choose a wallet to connect to Monad</p>
          </div>

          <div className="flex flex-col gap-3">
            {uniqueConnectors.map(connector => (
              <WalletOption
                key={connector.uid}
                connector={connector}
                onClick={() => connect({ connector })}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ConnectPage;

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import type { NextPage } from "next";
import { Connector, useAccount, useConnect, useConnectors } from "wagmi";
import MonadMascot from "~~/components/MonadMascot";
import TargetCursor from "~~/components/TargetCursor";

const WALLET_ICONS: Record<string, string> = {
  MetaMask:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='8' fill='%23F6851B'/%3E%3Cpath d='M30.5 8l-8.2 6.1 1.5-3.6z' fill='%23E2761B' stroke='%23E2761B' stroke-width='.5'/%3E%3Cpath d='M9.5 8l8.1 6.2-1.4-3.7zm17.6 17.4l-2.2 3.3 4.6 1.3 1.3-4.5zm-22.7.1l1.3 4.5 4.6-1.3-2.2-3.3z' fill='%23E4761B' stroke='%23E4761B' stroke-width='.5'/%3E%3C/svg%3E",
  WalletConnect:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='8' fill='%233B99FC'/%3E%3Cpath d='M12.3 15.6c4.2-4.2 11.1-4.2 15.4 0l.5.5a.5.5 0 010 .8l-1.8 1.7a.3.3 0 01-.4 0l-.7-.7a7.6 7.6 0 00-10.7 0l-.7.7a.3.3 0 01-.4 0l-1.8-1.7a.5.5 0 010-.8zm19 3.5l1.6 1.5a.5.5 0 010 .8l-7.1 6.9a.5.5 0 01-.7 0l-5-4.9a.1.1 0 00-.2 0l-5 4.9a.5.5 0 01-.8 0l-7-6.9a.5.5 0 010-.8l1.5-1.5a.5.5 0 01.8 0l5 4.9a.1.1 0 00.2 0l5-4.9a.5.5 0 01.7 0l5 4.9a.1.1 0 00.2 0l5-4.9a.5.5 0 01.8 0z' fill='white'/%3E%3C/svg%3E",
  "Coinbase Smart Wallet":
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='8' fill='%230052FF'/%3E%3Ccircle cx='20' cy='20' r='12' fill='white'/%3E%3Crect x='15' y='15' width='10' height='10' rx='2' fill='%230052FF'/%3E%3C/svg%3E",
};

const WalletOption = ({ connector, onClick }: { connector: Connector; onClick: () => void }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const provider = await connector.getProvider();
      setReady(!!provider);
    })();
  }, [connector]);

  const icon = connector.icon || WALLET_ICONS[connector.name];

  return (
    <button
      disabled={!ready}
      onClick={onClick}
      className="cursor-target flex items-center gap-4 w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 backdrop-blur-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt={connector.name} width={40} height={40} className="rounded-lg" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-lg">
          {connector.name.charAt(0)}
        </div>
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

      <div className="relative z-10 flex items-center justify-center grow gap-16 px-12">
        <MonadMascot className="w-[300px] flex-shrink-0 -ml-20" />

        <div className="flex flex-col gap-6 max-w-sm w-full ml-12">
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-white">Connect Wallet</h1>
            <p className="text-white/50 mt-2">Choose a wallet to connect to Monad</p>
          </div>

          <div className="flex flex-col gap-3">
            {uniqueConnectors.map(connector => (
              <WalletOption key={connector.uid} connector={connector} onClick={() => connect({ connector })} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ConnectPage;

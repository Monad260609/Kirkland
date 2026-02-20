"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { IconArrowLeft } from "@tabler/icons-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { useAccount } from "wagmi";
import { WagmiProvider } from "wagmi";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const WEB2_PATHS = ["/", "/how-it-works", "/dev-tools"];

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  const { isConnected } = useAccount();
  const pathname = usePathname();
  const router = useRouter();

  const isLanding = pathname === "/";
  const isWeb2 = WEB2_PATHS.includes(pathname);
  const isAbout = pathname === "/about";
  const isConnect = pathname === "/connect";
  const isWeb3 = !isWeb2 && !isAbout && !isConnect;

  // Logo target: landing page for Web2, app home for everything else
  const logoHref = isWeb2 ? "/" : "/dashboard";

  return (
    <>
      <div className="flex flex-col min-h-screen">
        {/* ── Top-left: back arrow + CacheMarket logo (skip on landing and /connect) ── */}
        {!isConnect && !isLanding && (
          <div className="fixed top-0 left-0 z-20 p-4 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-white/50 hover:text-white transition-colors"
              aria-label="Go back"
            >
              <IconArrowLeft size={20} />
            </button>
            <Link
              href={logoHref}
              className="font-[family-name:var(--font-vt323)] text-2xl text-white tracking-wider hover:text-white/80 transition-colors"
            >
              CacheMarket
            </Link>
          </div>
        )}

        {/* ── Top-right: Connect Wallet (Web3 pages only) ── */}
        {isWeb3 && (
          <div className="fixed top-0 right-0 z-20 p-4 flex items-center gap-3">
            {isConnected ? (
              <RainbowKitCustomConnectButton />
            ) : (
              <Link
                href="/connect"
                className="px-4 py-2 bg-white/10 border border-white/15 rounded-xl text-white hover:bg-white/20 backdrop-blur-sm transition-all text-sm"
              >
                Connect Wallet
              </Link>
            )}
          </div>
        )}

        {/* ── About Us button (every page except /about itself and /connect) ── */}
        {!isAbout && !isConnect && (
          <div className="fixed bottom-0 right-0 z-50 pointer-events-none">
            <div className="flex justify-end px-6 pb-6">
              <Link
                href="/about"
                className="pointer-events-auto px-4 py-2 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-white/70 text-base tracking-wide cursor-pointer hover:bg-white/15 hover:text-white transition-all"
              >
                About us
              </Link>
            </div>
          </div>
        )}

        <main className="relative flex flex-col flex-1">{children}</main>
      </div>
      <Toaster />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const ScaffoldEthAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          avatar={BlockieAvatar}
          theme={mounted ? (isDarkMode ? darkTheme() : lightTheme()) : lightTheme()}
        >
          <ScaffoldEthApp>{children}</ScaffoldEthApp>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { IconArrowLeft, IconCheck, IconCoin, IconExternalLink, IconLoader2, IconWallet } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useGatewayQuery } from "~~/hooks/gateway/useGatewayQuery";
import type { GatewayResult } from "~~/hooks/gateway/useGatewayQuery";
import { addCallEntry } from "~~/utils/gateway/callHistory";

function buildQuery(cat: string, q: string): string {
  if (cat === "crypto") return `${q} price`;
  return q;
}

interface CachePreCheck {
  cached: boolean;
  price: string;
  description: string;
}

export default function MarketResultPage() {
  const searchParams = useSearchParams();
  const category = searchParams.get("cat") ?? "";
  const query = searchParams.get("q") ?? "";
  const fullQuery = buildQuery(category, query);

  const { isConnected } = useAccount();
  const { queryGateway, result, error, isPending } = useGatewayQuery();

  const [preCheck, setPreCheck] = useState<CachePreCheck | null>(null);
  const [preCheckLoading, setPreCheckLoading] = useState(true);

  // Pre-check: call /api/query without X-PAYMENT to get the 402 info (cache status + price)
  useEffect(() => {
    if (!category || !query) return;
    let cancelled = false;

    (async () => {
      setPreCheckLoading(true);
      try {
        const res = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: fullQuery }),
        });
        if (res.status === 402 && !cancelled) {
          const info = await res.json();
          setPreCheck({
            cached: info.cached ?? false,
            price: info.price ?? "0.001 MON",
            description: info.description ?? "",
          });
        }
      } catch {
        // ignore — user will see the error when they click pay
      } finally {
        if (!cancelled) setPreCheckLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [category, query, fullQuery]);

  const handlePay = useCallback(async () => {
    const res = await queryGateway(fullQuery, preCheck?.cached);
    if (res) {
      addCallEntry({
        id: res.txHash || `local-${Date.now()}`,
        query: res.query,
        intent: res.intent,
        data: res.data,
        cached: res.cached,
        cost: res.cost,
        txHash: res.txHash,
        explorerUrl: res.explorerUrl,
        source: res.source,
        timestamp: res.timestamp,
      });
    }
  }, [fullQuery, queryGateway, preCheck?.cached]);

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

      <div className="relative z-10 min-h-screen flex flex-col px-6 md:px-12 pt-10 pb-20">
        <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 w-fit">
          <IconArrowLeft className="h-5 w-5" />
          <span className="text-lg">Back to Market</span>
        </Link>

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl text-white tracking-wider mb-2"
        >
          {category === "crypto" && `${query.toUpperCase()} / USD`}
          {category === "meteo" && query}
          {category === "countries" && query}
        </motion.h1>
        <p className="text-white/50 text-base mb-8">via x402 Gateway on Monad</p>

        {/* ── STATE 1: Wallet not connected ── */}
        {!isConnected && (
          <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/30 backdrop-blur-md p-6 flex items-center gap-4">
            <IconWallet className="h-6 w-6 text-yellow-300 shrink-0" />
            <div>
              <p className="text-yellow-200 text-lg font-semibold">Wallet not connected</p>
              <p className="text-yellow-200/60 text-base">Connect your wallet to pay with MON and query the gateway.</p>
            </div>
          </div>
        )}

        {/* ── STATE 2: Pre-check loading ── */}
        {isConnected && preCheckLoading && !result && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <IconLoader2 className="h-8 w-8 text-white/60 animate-spin" />
            <p className="text-white/70 text-lg">Checking on-chain cache...</p>
          </div>
        )}

        {/* ── STATE 3: Ready to pay (pre-check done, no result yet) ── */}
        {isConnected && !preCheckLoading && preCheck && !result && !isPending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto w-full"
          >
            <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-8 text-center space-y-6">
              <div className="space-y-2">
                {preCheck.cached ? (
                  <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <IconCheck className="h-4 w-4" />
                    Data is cached on-chain
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    <IconCoin className="h-4 w-4" />
                    Fresh data — you are the seeder
                  </span>
                )}
                <p className="text-white/50 text-sm">{preCheck.description}</p>
              </div>

              <div className="text-5xl font-bold text-white">{preCheck.price}</div>

              <button
                onClick={handlePay}
                className="w-full px-6 py-4 rounded-xl bg-white/15 border border-white/25 text-white text-lg font-semibold hover:bg-white/25 hover:border-white/40 active:scale-[0.98] transition-all"
              >
                Pay & Query
              </button>

              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
          </motion.div>
        )}

        {/* ── STATE 4: Payment in progress ── */}
        {isConnected && isPending && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <IconLoader2 className="h-8 w-8 text-white/60 animate-spin" />
            <p className="text-white/70 text-lg">Sign the transaction in your wallet...</p>
          </div>
        )}

        {/* ── STATE 5: Error (after payment attempt) ── */}
        {error && !isPending && !result && !preCheck && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 backdrop-blur-md p-6 text-red-300 text-lg">
            Error: {error}
          </div>
        )}

        {/* ── STATE 6: Result ── */}
        {result && !isPending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <PaymentInfoBanner result={result} />
            {category === "crypto" && <CryptoResult data={result.data} token={query} />}
            {category === "meteo" && <MeteoResult data={result.data} />}
            {category === "countries" && <CountriesResult data={result.data} />}
          </motion.div>
        )}
      </div>
    </>
  );
}

/* ── Payment info banner ── */
function PaymentInfoBanner({ result }: { result: GatewayResult }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-5 flex flex-wrap items-center gap-4">
      {result.cached ? (
        <span className="flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
          <IconCheck className="h-4 w-4" />
          CACHED
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
          <IconCoin className="h-4 w-4" />
          FRESH
        </span>
      )}
      <span className="text-white/70 text-sm font-mono">
        Cost: <span className="text-white font-semibold">{result.cost}</span>
      </span>
      <span className="text-white/50 text-sm">Source: {result.source}</span>
      {result.explorerUrl && (
        <a
          href={result.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200 transition-colors ml-auto"
        >
          View on Monad
          <IconExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

/* ── Crypto ── */
function CryptoResult({ data, token }: { data: Record<string, unknown>; token: string }) {
  const usd = data.usd as number | undefined;
  const change = data.usd_24h_change as number | undefined;
  if (usd === undefined) return <p className="text-white/60">No data found for {token}</p>;

  const items = [
    { label: "Price (USD)", value: `$${usd.toLocaleString()}` },
    { label: "24h Change", value: `${change?.toFixed(2) ?? "—"}%`, positive: (change ?? 0) >= 0 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(item => (
        <div key={item.label} className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-6">
          <p className="text-white/50 text-sm mb-1">{item.label}</p>
          <p
            className={`text-2xl font-bold ${"positive" in item ? (item.positive ? "text-green-400" : "text-red-400") : "text-white"}`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Meteo ── */
function MeteoResult({ data }: { data: Record<string, unknown> }) {
  // Gateway normalized format: { temperature, condition, humidity, feelsLike, wind }
  const hasFields = data.temperature !== undefined || data.condition !== undefined;

  if (!hasFields) {
    return <RawDataDisplay data={data} />;
  }

  const items = [
    { label: "Temperature", value: `${data.temperature ?? "—"}°C` },
    { label: "Condition", value: String(data.condition ?? "—") },
    { label: "Humidity", value: `${data.humidity ?? "—"}%` },
    { label: "Feels Like", value: `${data.feelsLike ?? "—"}°C` },
    { label: "Wind", value: `${data.wind ?? "—"} km/h` },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map(item => (
        <div key={item.label} className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-6">
          <p className="text-white/50 text-sm mb-1">{item.label}</p>
          <p className="text-white text-2xl font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Countries ── */
function CountriesResult({ data }: { data: Record<string, unknown> }) {
  const items = [
    { label: "Country", value: String(data.name ?? "—") },
    { label: "Capital", value: String(data.capital ?? "—") },
    { label: "Population", value: typeof data.population === "number" ? data.population.toLocaleString() : "—" },
    { label: "Currency", value: String(data.currency ?? "—") },
    { label: "Region", value: String(data.region ?? "—") },
  ];

  return (
    <div className="space-y-4">
      {typeof data.flag === "string" && (
        <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-6 flex items-center gap-4">
          <span className="text-4xl">{String(data.flag)}</span>
          <h2 className="text-white text-3xl font-bold">{String(data.name ?? "—")}</h2>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.label} className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-6">
            <p className="text-white/50 text-sm mb-1">{item.label}</p>
            <p className="text-white text-xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Fallback: raw JSON display ── */
function RawDataDisplay({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-6">
      <p className="text-white/50 text-sm mb-3">Raw data</p>
      <pre className="text-white text-sm font-mono whitespace-pre-wrap break-words">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

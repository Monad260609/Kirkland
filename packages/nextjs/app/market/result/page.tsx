"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { IconArrowLeft, IconLoader2 } from "@tabler/icons-react";
import { motion } from "framer-motion";

/* ── Token ID mapping for CoinGecko ── */
const TOKEN_MAP: Record<string, string> = {
  eth: "ethereum",
  btc: "bitcoin",
  sol: "solana",
  matic: "matic-network",
  avax: "avalanche-2",
  dot: "polkadot",
  ada: "cardano",
  mon: "monad",
};

/* ── Helpers to extract city / country name from query ── */
function extractCity(query: string) {
  return query
    .replace(/weather|meteo|forecast|in|the/gi, "")
    .trim()
    .replace(/\s+/g, "+");
}

function extractCountry(query: string) {
  return query
    .replace(/info|country|population|details|data/gi, "")
    .trim()
    .replace(/\s+/g, "+");
}

export default function MarketResultPage() {
  const searchParams = useSearchParams();
  const category = searchParams.get("cat") ?? "";
  const query = searchParams.get("q") ?? "";

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category || !query) return;

    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        let url = "";
        if (category === "crypto") {
          const id = TOKEN_MAP[query.toLowerCase()] ?? query.toLowerCase();
          url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
        } else if (category === "meteo") {
          const city = extractCity(query);
          url = `https://wttr.in/${city}?format=j1`;
        } else if (category === "countries") {
          const country = extractCountry(query);
          url = `https://restcountries.com/v3.1/name/${country}?fields=name,capital,population,area,flags,region,subregion,currencies,languages`;
        }

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [category, query]);

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
        {/* Back button */}
        <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 w-fit">
          <IconArrowLeft className="h-5 w-5" />
          <span className="text-lg">Back to Market</span>
        </Link>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl text-white tracking-wider mb-2"
        >
          {category === "crypto" && `${query.toUpperCase()} / USD`}
          {category === "meteo" && query}
          {category === "countries" && query}
        </motion.h1>
        <p className="text-white/50 text-base mb-8">
          {category === "crypto" && "CoinGecko Price Feed"}
          {category === "meteo" && "wttr.in Weather Data"}
          {category === "countries" && "REST Countries API"}
        </p>

        {/* Content */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <IconLoader2 className="h-8 w-8 text-white/60 animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 backdrop-blur-md p-6 text-red-300 text-lg">
            Error: {error}
          </div>
        )}

        {!loading && !error && data && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {category === "crypto" && <CryptoResult data={data} token={query} />}
            {category === "meteo" && <MeteoResult data={data} />}
            {category === "countries" && <CountriesResult data={data} />}
          </motion.div>
        )}
      </div>
    </>
  );
}

/* ── Crypto ── */
function CryptoResult({ data, token }: { data: Record<string, unknown>; token: string }) {
  const id = TOKEN_MAP[token.toLowerCase()] ?? token.toLowerCase();
  const info = (data as Record<string, Record<string, number>>)[id];
  if (!info) return <p className="text-white/60">No data found for {token}</p>;

  const items = [
    { label: "Price (USD)", value: `$${info.usd?.toLocaleString() ?? "—"}` },
    { label: "24h Change", value: `${info.usd_24h_change?.toFixed(2) ?? "—"}%` },
    { label: "Market Cap", value: `$${(info.usd_market_cap ?? 0).toLocaleString()}` },
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

/* ── Meteo ── */
function MeteoResult({ data }: { data: Record<string, unknown> }) {
  const current = (data as { current_condition?: Record<string, string>[] }).current_condition?.[0];
  if (!current) return <p className="text-white/60">No weather data available</p>;

  const items = [
    { label: "Temperature", value: `${current.temp_C}°C / ${current.temp_F}°F` },
    { label: "Feels Like", value: `${current.FeelsLikeC}°C` },
    { label: "Humidity", value: `${current.humidity}%` },
    { label: "Wind", value: `${current.windspeedKmph} km/h ${current.winddir16Point}` },
    { label: "Visibility", value: `${current.visibility} km` },
    {
      label: "Description",
      value: (current as Record<string, unknown>).weatherDesc
        ? ((current as Record<string, unknown>).weatherDesc as { value: string }[])[0]?.value
        : "—",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map(item => (
        <div key={item.label} className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-6">
          <p className="text-white/50 text-sm mb-1">{item.label}</p>
          <p className="text-white text-2xl font-bold">{String(item.value)}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Countries ── */
function CountriesResult({ data }: { data: Record<string, unknown> }) {
  const country = Array.isArray(data) ? (data[0] as Record<string, unknown>) : null;
  if (!country) return <p className="text-white/60">No country data available</p>;

  const name = (country.name as { common?: string })?.common ?? "—";
  const capital = Array.isArray(country.capital) ? country.capital[0] : "—";
  const population = typeof country.population === "number" ? country.population.toLocaleString() : "—";
  const area = typeof country.area === "number" ? `${country.area.toLocaleString()} km²` : "—";
  const region = `${country.region ?? ""}${country.subregion ? ` — ${country.subregion}` : ""}`;
  const languages = country.languages ? Object.values(country.languages as Record<string, string>).join(", ") : "—";
  const currencies = country.currencies
    ? Object.values(country.currencies as Record<string, { name: string; symbol: string }>)
        .map(c => `${c.name} (${c.symbol})`)
        .join(", ")
    : "—";
  const flag = (country.flags as { svg?: string })?.svg;

  const items = [
    { label: "Country", value: name },
    { label: "Capital", value: capital },
    { label: "Population", value: population },
    { label: "Area", value: area },
    { label: "Region", value: region },
    { label: "Languages", value: languages },
    { label: "Currencies", value: currencies },
  ];

  return (
    <div className="space-y-4">
      {flag && (
        <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-6 flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flag} alt={`${name} flag`} className="h-12 rounded shadow" />
          <h2 className="text-white text-3xl font-bold">{name}</h2>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.label} className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-6">
            <p className="text-white/50 text-sm mb-1">{item.label}</p>
            <p className="text-white text-xl font-bold">{String(item.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

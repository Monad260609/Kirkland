import type { IntentType } from "./types.js";

/**
 * Fetch data from an external API based on the detected intent type.
 * All fetchers are free and require no API key except AI (Groq).
 */
export async function fetchExternal(
  type: IntentType,
  param: string,
  groqApiKey?: string,
): Promise<Record<string, unknown>> {
  switch (type) {
    case "price":
      return fetchPrice(param);
    case "weather":
      return fetchWeather(param);
    case "country":
      return fetchCountry(param);
    case "ai":
      return fetchAI(param, groqApiKey);
  }
}

// ── Price (CoinGecko — free, no key) ──────────────────────

async function fetchPrice(token: string): Promise<Record<string, unknown>> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd&include_24hr_change=true`,
  );
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  const json = await res.json() as Record<string, Record<string, number>>;
  return {
    token,
    usd: json[token]?.usd ?? 0,
    usd_24h_change: json[token]?.usd_24h_change ?? 0,
  };
}

// ── Weather (wttr.in — free, no key) ──────────────────────

async function fetchWeather(city: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
  if (!res.ok) throw new Error(`wttr.in error: ${res.status}`);
  const json = await res.json() as Record<string, unknown>;
  const cur = (json.current_condition as Record<string, unknown>[])?.[0] ?? {};
  const desc = (cur.weatherDesc as { value: string }[])?.[0]?.value ?? "Unknown";
  return {
    city,
    temperature: cur.temp_F ?? "N/A",
    condition: desc,
    humidity: cur.humidity ?? "N/A",
    wind_mph: cur.windspeedMiles ?? "N/A",
  };
}

// ── Country (REST Countries — free, no key) ───────────────

async function fetchCountry(name: string): Promise<Record<string, unknown>> {
  const res = await fetch(
    `https://restcountries.com/v3.1/name/${encodeURIComponent(name)}`,
  );
  if (!res.ok) throw new Error(`REST Countries error: ${res.status}`);
  const json = await res.json() as Record<string, unknown>[];
  const c = json[0] as Record<string, unknown>;
  return {
    name: (c.name as Record<string, unknown>)?.common ?? name,
    capital: (c.capital as string[])?.[0] ?? "N/A",
    population: c.population ?? "N/A",
    region: c.region ?? "N/A",
    currency: Object.keys((c.currencies as Record<string, unknown>) ?? {})[0] ?? "N/A",
  };
}

// ── AI via Groq ────────────────────────────────────────────

async function fetchAI(
  prompt: string,
  apiKey?: string,
): Promise<Record<string, unknown>> {
  if (!apiKey) {
    return { answer: "groqApiKey not provided — AI queries unavailable." };
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Answer concisely in 1-3 sentences." },
        { role: "user", content: prompt },
      ],
      max_tokens: 150,
    }),
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const json = await res.json() as Record<string, unknown>;
  const choices = json.choices as { message: { content: string } }[];
  return { answer: choices?.[0]?.message?.content ?? "No response" };
}

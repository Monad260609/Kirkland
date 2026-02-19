import { Hono } from "hono";
import {
  hashQuery,
  checkOnChainCache,
  storeResultOnChain,
  recordHitsOnChain,
} from "../chain.js";
import { emitEvent } from "../events.js";

const query = new Hono();

query.post("/", async (c) => {
  // ══════════════════════════════════════════════════════
  //  GET THE QUERY
  // ══════════════════════════════════════════════════════

  const body = c.get("parsedBody") || (await c.req.json());
  const input: string = body.query;

  if (!input) return c.json({ error: "Missing 'query' in body" }, 400);

  // Payer address (extracted from x402 header by the middleware)
  const payer =
    c.req.header("x-payer") ||
    "0x0000000000000000000000000000000000000000";

  // ══════════════════════════════════════════════════════
  //  HASH THE QUERY
  // ══════════════════════════════════════════════════════

  const queryHash =
    (c.get("queryHash") as `0x${string}`) || hashQuery(input);

  // ══════════════════════════════════════════════════════
  //  CHECK THE ON-CHAIN CONTRACT
  // ══════════════════════════════════════════════════════

  const isCached = c.get("isCached") as boolean | undefined;
  let cachedData: string | null = null;

  if (isCached === true) {
    const result = await checkOnChainCache(queryHash);
    cachedData = result.data;
  } else if (isCached === undefined) {
    const result = await checkOnChainCache(queryHash);
    if (result.isCached) {
      cachedData = result.data;
    }
  }

  // ══════════════════════════════════════════════════════
  //  CASE 1: CACHE HIT — data on-chain, not expired
  //  Cost: $0.0001 (bypass x402, nearly free)
  // ══════════════════════════════════════════════════════

  if (cachedData) {
    // Record the hit on-chain (batch of 1)
    let txHash: string | null = null;
    try {
      txHash = await recordHitsOnChain(queryHash, 1n);
    } catch {
      // Non-blocking: return the data even if recordHit fails
    }

    emitEvent({
      type: "cache_hit",
      query: input,
      user: payer.slice(0, 6) + "…" + payer.slice(-4),
      cost: "$0.0001",
      cached: true,
    });

    return c.json({
      query: input,
      data: JSON.parse(cachedData),
      cached: true,
      cost: "$0.0001",
      txHash,
      explorerUrl: txHash
        ? `https://testnet.monadexplorer.com/tx/${txHash}`
        : null,
      source: "on-chain cache (Monad)",
    });
  }

  // ══════════════════════════════════════════════════════
  //  CASE 2: CACHE MISS — data absent or expired
  //  Cost: $0.01 (x402 payment required)
  //  1. Detect the intent (price, weather, AI)
  //  2. Call the external API
  //  3. Store on-chain
  //  4. Return to the client
  // ══════════════════════════════════════════════════════

  const intent = detectIntent(input);
  const apiData = await fetchExternalAPI(intent.type, intent.param);
  const dataString = JSON.stringify(apiData);

  const txHash = await storeResultOnChain(
    queryHash,
    input,
    dataString,
    payer,
  );

  emitEvent({
    type: "query",
    query: input,
    user: payer.slice(0, 6) + "…" + payer.slice(-4),
    cost: "$0.01",
    cached: false,
    source: intent.type,
  });

  return c.json({
    query: input,
    data: apiData,
    cached: false,
    cost: "$0.01",
    seeder: payer,
    txHash,
    explorerUrl: `https://testnet.monadexplorer.com/tx/${txHash}`,
    source: `${intent.type} → stored on Monad`,
  });
});

// ══════════════════════════════════════════════════════════
//  DETECT INTENT
// ══════════════════════════════════════════════════════════

function detectIntent(input: string): { type: string; param: string } {
  const lower = input.toLowerCase().trim();

  // Weather
  if (lower.match(/weather|temperature|forecast/)) {
    const city = lower
      .replace(/weather|temperature|forecast|in/g, "")
      .trim();
    return { type: "weather", param: city || "denver" };
  }

  // Crypto price
  if (lower.match(/price|eth|btc|sol|bitcoin|ethereum|solana|mon|monad/)) {
    const tokenMap: Record<string, string> = {
      eth: "ethereum",
      btc: "bitcoin",
      sol: "solana",
      mon: "monad",
      monad: "monad",
    };
    const word = lower.replace(/price/g, "").trim().split(" ")[0];
    return { type: "price", param: tokenMap[word] || word };
  }

  // Fallback: AI
  return { type: "ai", param: input };
}

// ══════════════════════════════════════════════════════════
//  FETCH EXTERNAL API
// ══════════════════════════════════════════════════════════

async function fetchExternalAPI(
  type: string,
  param: string,
): Promise<Record<string, unknown>> {
  // WEATHER (wttr.in — free, no key)
  if (type === "weather") {
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(param)}?format=j1`,
    );
    const json = await res.json();
    const cur = json.current_condition?.[0];
    return {
      city: param,
      temperature: cur?.temp_F || "N/A",
      condition: cur?.weatherDesc?.[0]?.value || "Unknown",
      humidity: cur?.humidity || "N/A",
      wind_mph: cur?.windspeedMiles || "N/A",
    };
  }

  // CRYPTO PRICE (CoinGecko — free, no key)
  if (type === "price") {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${param}&vs_currencies=usd&include_24hr_change=true`,
    );
    const json = await res.json();
    return {
      token: param,
      usd: json[param]?.usd || 0,
      usd_24h_change: json[param]?.usd_24h_change || 0,
    };
  }

  // AI (Groq — free, requires GROQ_API_KEY)
  if (type === "ai") {
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "Answer concisely in 1-3 sentences." },
            { role: "user", content: param },
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      },
    );
    const json = await res.json();
    return {
      answer: json.choices?.[0]?.message?.content || "No response",
    };
  }

  return { error: "Unknown query type" };
}

export default query;

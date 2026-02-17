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
  //  RECUPERER LA QUERY
  // ══════════════════════════════════════════════════════

  const body = c.get("parsedBody") || (await c.req.json());
  const input: string = body.query;

  if (!input) return c.json({ error: "Missing 'query' in body" }, 400);

  // Adresse du payer (extraite du header x402 par le middleware)
  const payer =
    c.req.header("x-payer") ||
    "0x0000000000000000000000000000000000000000";

  // ══════════════════════════════════════════════════════
  //  HASHER LA QUERY
  // ══════════════════════════════════════════════════════

  const queryHash =
    (c.get("queryHash") as `0x${string}`) || hashQuery(input);

  // ══════════════════════════════════════════════════════
  //  CHECK LE CONTRAT ON-CHAIN
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
  //  CAS 1 : CACHE HIT — data on-chain, pas expiree
  //  Cout : $0.0001 (bypass x402, quasi gratuit)
  // ══════════════════════════════════════════════════════

  if (cachedData) {
    // Enregistrer le hit on-chain (batch de 1)
    let txHash: string | null = null;
    try {
      txHash = await recordHitsOnChain(queryHash, 1n);
    } catch {
      // Non-bloquant : on retourne la data meme si le recordHit echoue
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
  //  CAS 2 : CACHE MISS — data absente ou expiree
  //  Cout : $0.01 (paiement x402 requis)
  //  1. Detecter l'intent (prix, meteo, AI)
  //  2. Appeler l'API externe
  //  3. Stocker on-chain
  //  4. Retourner au client
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

  // Meteo
  if (lower.match(/weather|météo|meteo|temperature|temps/)) {
    const city = lower
      .replace(/weather|météo|meteo|temperature|temps|in|à|a/g, "")
      .trim();
    return { type: "weather", param: city || "denver" };
  }

  // Prix crypto
  if (lower.match(/price|prix|eth|btc|sol|bitcoin|ethereum|solana|mon|monad/)) {
    const tokenMap: Record<string, string> = {
      eth: "ethereum",
      btc: "bitcoin",
      sol: "solana",
      mon: "monad",
      monad: "monad",
    };
    const word = lower.replace(/price|prix/g, "").trim().split(" ")[0];
    return { type: "price", param: tokenMap[word] || word };
  }

  // Fallback : AI
  return { type: "ai", param: input };
}

// ══════════════════════════════════════════════════════════
//  FETCH EXTERNAL API
// ══════════════════════════════════════════════════════════

async function fetchExternalAPI(
  type: string,
  param: string,
): Promise<Record<string, unknown>> {
  // METEO (wttr.in — gratuit, pas de cle)
  if (type === "weather") {
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(param)}?format=j1`,
    );
    const json = await res.json();
    const cur = json.current_condition?.[0];
    return {
      city: param,
      temperature: cur?.temp_C || "N/A",
      condition: cur?.weatherDesc?.[0]?.value || "Unknown",
      humidity: cur?.humidity || "N/A",
      wind_kmph: cur?.windspeedKmph || "N/A",
    };
  }

  // PRIX CRYPTO (CoinGecko — gratuit, pas de cle)
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

  // AI (Groq — gratuit, necessite GROQ_API_KEY)
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

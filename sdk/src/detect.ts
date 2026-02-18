import type { Intent, IntentType } from "./types.js";

const TOKEN_MAP: Record<string, string> = {
  eth: "ethereum",
  btc: "bitcoin",
  sol: "solana",
  mon: "monad",
  monad: "monad",
  ethereum: "ethereum",
  bitcoin: "bitcoin",
  solana: "solana",
};

const SKIP_WORDS = /^(price|prix|of|du|de|le|la|the|a|an|pour|get|give|what|is|are)$/;

/**
 * Detect the intent of a natural language query.
 *
 * @example
 * detectIntent("price of ETH")      // { type: "price", param: "ethereum" }
 * detectIntent("weather in Denver") // { type: "weather", param: "denver" }
 * detectIntent("France info")       // { type: "country", param: "france" }
 * detectIntent("what is gravity")   // { type: "ai", param: "what is gravity" }
 */
export function detectIntent(input: string): Intent {
  const lower = input.toLowerCase().trim();

  // ── Weather ──────────────────────────────────────────────
  if (/weather|météo|meteo|temperature|temps/.test(lower)) {
    const city = lower
      .replace(/weather|météo|meteo|temperature|temps|in|à|a\b/g, "")
      .trim();
    return { type: "weather", param: city || "denver" };
  }

  // ── Crypto price ─────────────────────────────────────────
  if (/price|prix|eth\b|btc\b|sol\b|bitcoin|ethereum|solana|mon\b|monad/.test(lower)) {
    const words = lower.replace(/[?!.,]/g, "").trim().split(/\s+/);
    const token = words.find(w => !SKIP_WORDS.test(w) && w.length > 1) ?? "ethereum";
    return { type: "price", param: TOKEN_MAP[token] ?? token };
  }

  // ── Country ──────────────────────────────────────────────
  if (/country|pays|nation|population|capital|capitale/.test(lower)) {
    const country = lower
      .replace(/country|pays|nation|population|capital|capitale|info|of|du|de/g, "")
      .trim();
    return { type: "country", param: country || "france" };
  }

  // ── AI fallback ──────────────────────────────────────────
  return { type: "ai", param: input };
}

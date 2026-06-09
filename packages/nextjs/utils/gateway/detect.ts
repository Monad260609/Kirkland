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

// Tokens we know how to quote on Uniswap (Ethereum mainnet pools).
const UNISWAP_TOKENS = ["eth", "weth", "usdc", "usdt", "dai", "wbtc", "uni", "link"];

export type IntentType = "price" | "weather" | "country" | "swap-quote";

export interface Intent {
  type: IntentType;
  param: string;
}

export function detectIntent(input: string): Intent {
  const lower = input.toLowerCase().trim();
  const tokens = UNISWAP_TOKENS.join("|");

  // Swap-quote detection: "swap 1 eth to usdc", "quote 0.5 eth for usdc", "1 eth in usdc"
  const swapWithAmount =
    lower.match(
      new RegExp(`(?:swap|quote|trade)\\s+(\\d+\\.?\\d*)\\s*(${tokens})\\s+(?:to|for|in|->)\\s+(${tokens})`),
    ) || lower.match(new RegExp(`(\\d+\\.?\\d*)\\s*(${tokens})\\s+(?:in|to|->)\\s+(${tokens})`));
  if (swapWithAmount) {
    return { type: "swap-quote", param: `${swapWithAmount[1]}:${swapWithAmount[2]}:${swapWithAmount[3]}` };
  }

  // Swap-quote without explicit amount: "quote eth usdc", "swap eth for usdc", "eth -> usdc quote"
  const swapNoAmount =
    lower.match(new RegExp(`(?:quote|swap)\\s+(${tokens})\\s+(?:to|for|in|->|/|\\s+)\\s*(${tokens})`)) ||
    lower.match(new RegExp(`(${tokens})\\s*(?:->|→)\\s*(${tokens})`));
  if (swapNoAmount) {
    return { type: "swap-quote", param: `1:${swapNoAmount[1]}:${swapNoAmount[2]}` };
  }

  // Price detection: "ETH price", "price of bitcoin", "bitcoin", "BTC"
  const priceMatch = lower.match(
    /(?:price)\s+(?:of\s+)?(\w+)|(\w+)\s+price|(ethereum|bitcoin|btc|eth|sol|solana|matic|avax|dot|ada|mon|monad)/,
  );
  if (priceMatch) {
    const raw = priceMatch[1] || priceMatch[2] || priceMatch[3];
    const token = TOKEN_MAP[raw] || raw;
    return { type: "price", param: token };
  }

  // Weather detection: "Denver weather", "weather in Paris", "Tokyo forecast"
  const weatherMatch = lower.match(
    /(?:weather|temperature|forecast)\s+(?:in\s+|for\s+)?(\w+)|(\w+)\s+(?:weather|forecast)/,
  );
  if (weatherMatch) {
    return { type: "weather", param: weatherMatch[1] || weatherMatch[2] };
  }

  // Country detection: "France info", "Japan country", "Brazil population", "info on Germany"
  const countryMatch = lower.match(
    /(?:country|info|population|capital|currency)\s+(?:of\s+|on\s+|about\s+)?(\w+)|(\w+)\s+(?:country|info|population)/,
  );
  if (countryMatch) {
    return { type: "country", param: countryMatch[1] || countryMatch[2] };
  }

  // Default: treat as crypto price
  return { type: "price", param: TOKEN_MAP[lower] || lower };
}

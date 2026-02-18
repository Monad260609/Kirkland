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

export function detectIntent(input: string): { type: "price" | "weather" | "country"; param: string } {
  const lower = input.toLowerCase().trim();

  // Price detection: "ETH price", "price of bitcoin", "bitcoin", "BTC"
  const priceMatch = lower.match(
    /(?:price|cost|value)\s+(?:of\s+)?(\w+)|(\w+)\s+price|(ethereum|bitcoin|btc|eth|sol|solana|matic|avax|dot|ada|mon|monad)/,
  );
  if (priceMatch) {
    const raw = priceMatch[1] || priceMatch[2] || priceMatch[3];
    const token = TOKEN_MAP[raw] || raw;
    return { type: "price", param: token };
  }

  // Weather detection: "Denver weather", "weather in Paris", "forecast Tokyo"
  const weatherMatch = lower.match(
    /(?:weather|temperature|forecast|climate)\s+(?:in\s+|at\s+|for\s+)?(\w+)|(\w+)\s+(?:weather|forecast)/,
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

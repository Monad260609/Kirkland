// Ethereum mainnet token addresses for Uniswap quoting.
// Native ETH is represented as the zero address — Uniswap's API normalizes it to WETH.
export const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
  eth: "0x0000000000000000000000000000000000000000",
  weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  wbtc: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  uni: "0x1f9840a85d5aF5bf1D1762F925BdAddC4201F984",
  link: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
};

export const TOKEN_DECIMALS: Record<string, number> = {
  eth: 18,
  weth: 18,
  usdc: 6,
  usdt: 6,
  dai: 18,
  wbtc: 8,
  uni: 18,
  link: 18,
};

export interface UniswapQuote {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  rate: string; // amountOut / amountIn, displayed as text
  route: string; // human-readable hop sequence ("ETH → USDC" or "ETH → WETH → USDC")
  estimatedGasUSD?: string;
  chainId: 1; // Ethereum mainnet — Monad caches the quote, mainnet has the pools
}

interface UniswapApiQuote {
  amountDecimals?: string | number;
  quoteDecimals?: string | number;
  amount?: string;
  quote?: string;
  gasUseEstimateUSD?: string;
  route?: Array<Array<{ tokenIn?: { symbol?: string }; tokenOut?: { symbol?: string } }>>;
}

const UNISWAP_API_URL = "https://api.uniswap.org/v2/quote";

/**
 * Fetches a swap quote from Uniswap's public API.
 *
 * Throws if the API rejects or the response is malformed.
 */
export async function fetchUniswapQuote(
  tokenInSym: string,
  tokenOutSym: string,
  amountIn: string,
): Promise<UniswapQuote> {
  const apiKey = process.env.UNISWAP_API_KEY;
  if (!apiKey) throw new Error("UNISWAP_API_KEY is not set");

  const inSym = tokenInSym.toLowerCase();
  const outSym = tokenOutSym.toLowerCase();
  const inAddr = TOKEN_ADDRESSES[inSym];
  const outAddr = TOKEN_ADDRESSES[outSym];
  if (!inAddr) throw new Error(`Unknown token: ${tokenInSym}`);
  if (!outAddr) throw new Error(`Unknown token: ${tokenOutSym}`);

  const decimals = TOKEN_DECIMALS[inSym] ?? 18;
  const rawAmount = BigInt(Math.round(parseFloat(amountIn) * 10 ** decimals)).toString();

  const res = await fetch(UNISWAP_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      origin: "https://app.uniswap.org",
    },
    body: JSON.stringify({
      tokenInChainId: 1,
      tokenOutChainId: 1,
      tokenIn: inAddr,
      tokenOut: outAddr,
      amount: rawAmount,
      type: "EXACT_INPUT",
      // Zero-address swapper — quotes are simulated without an account.
      swapper: "0x0000000000000000000000000000000000000000",
      slippageTolerance: 50,
      configs: [{ routingType: "CLASSIC", protocols: ["V2", "V3", "MIXED"] }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Uniswap quote failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { quote?: UniswapApiQuote } & UniswapApiQuote;
  const q: UniswapApiQuote = json.quote ?? json;

  const amountOutDecimal = String(q.quoteDecimals ?? q.amountDecimals ?? q.amount ?? "0");
  const route = formatRoute(q.route, inSym, outSym);
  const rate = formatRate(amountIn, amountOutDecimal);

  return {
    tokenIn: tokenInSym.toUpperCase(),
    tokenOut: tokenOutSym.toUpperCase(),
    amountIn,
    amountOut: amountOutDecimal,
    rate,
    route,
    estimatedGasUSD: q.gasUseEstimateUSD,
    chainId: 1,
  };
}

function formatRoute(route: UniswapApiQuote["route"] | undefined, fallbackIn: string, fallbackOut: string): string {
  if (!route || route.length === 0) {
    return `${fallbackIn.toUpperCase()} → ${fallbackOut.toUpperCase()}`;
  }
  const path = route[0];
  const hops = path.map(hop => hop.tokenIn?.symbol ?? "?").concat(path[path.length - 1]?.tokenOut?.symbol ?? "?");
  return hops.join(" → ");
}

function formatRate(amountIn: string, amountOut: string): string {
  const a = parseFloat(amountIn);
  const b = parseFloat(amountOut);
  if (!a || !b) return "—";
  return (b / a).toFixed(6);
}

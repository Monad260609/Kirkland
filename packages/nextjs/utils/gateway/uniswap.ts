import { createPublicClient, formatUnits, http, parseUnits } from "viem";
import { mainnet } from "viem/chains";

// Ethereum mainnet token addresses. Quotes read Uniswap V3 pools directly
// on-chain (QuoterV2) — no API key, nothing to revoke or rate-limit.
// Native ETH is quoted through WETH.
export const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
  eth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
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

export const QUOTER_V2_ADDRESS = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" as const;

export const QUOTER_V2_ABI = [
  {
    name: "quoteExactInputSingle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

// 0.05% / 0.3% / 1% — the standard V3 fee tiers for majors.
const FEE_TIERS = [500, 3000, 10000] as const;

const FEE_LABEL: Record<number, string> = {
  500: "0.05%",
  3000: "0.3%",
  10000: "1%",
};

const ethereumClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETHEREUM_RPC_URL ?? "https://ethereum-rpc.publicnode.com"),
});

export interface UniswapQuote {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  rate: string;
  route: string; // "ETH → USDC · 0.05% pool"
  feeTier: string;
  estimatedGas: string; // swap gas estimate in gas units, from QuoterV2
  chainId: 1; // quotes read Ethereum mainnet pools; the result is cached on Monad
}

/**
 * Quote tokenIn→tokenOut on Uniswap V3 by calling QuoterV2 on Ethereum
 * mainnet. Tries the three standard fee tiers and returns the best output.
 */
export async function fetchUniswapQuote(
  tokenInSym: string,
  tokenOutSym: string,
  amountIn: string,
): Promise<UniswapQuote> {
  const inSym = tokenInSym.toLowerCase();
  const outSym = tokenOutSym.toLowerCase();
  const tokenIn = TOKEN_ADDRESSES[inSym];
  const tokenOut = TOKEN_ADDRESSES[outSym];
  if (!tokenIn) throw new Error(`Unknown token: ${tokenInSym}`);
  if (!tokenOut) throw new Error(`Unknown token: ${tokenOutSym}`);
  if (tokenIn === tokenOut) throw new Error("tokenIn and tokenOut are the same asset");

  const inDecimals = TOKEN_DECIMALS[inSym] ?? 18;
  const outDecimals = TOKEN_DECIMALS[outSym] ?? 18;
  const rawAmountIn = parseUnits(amountIn, inDecimals);

  let best: { amountOut: bigint; gasEstimate: bigint; fee: number } | null = null;

  for (const fee of FEE_TIERS) {
    try {
      const { result } = await ethereumClient.simulateContract({
        address: QUOTER_V2_ADDRESS,
        abi: QUOTER_V2_ABI,
        functionName: "quoteExactInputSingle",
        args: [{ tokenIn, tokenOut, amountIn: rawAmountIn, fee, sqrtPriceLimitX96: 0n }],
      });
      const [amountOut, , , gasEstimate] = result;
      if (amountOut > 0n && (!best || amountOut > best.amountOut)) {
        best = { amountOut, gasEstimate, fee };
      }
    } catch {
      // No pool at this fee tier for the pair — try the next one.
    }
  }

  if (!best) {
    throw new Error(`No Uniswap V3 pool found for ${tokenInSym.toUpperCase()}/${tokenOutSym.toUpperCase()}`);
  }

  const amountOutDecimal = formatUnits(best.amountOut, outDecimals);
  const displayIn = inSym === "weth" ? "WETH" : tokenInSym.toUpperCase();
  const displayOut = outSym === "weth" ? "WETH" : tokenOutSym.toUpperCase();

  return {
    tokenIn: displayIn,
    tokenOut: displayOut,
    amountIn,
    amountOut: amountOutDecimal,
    rate: formatRate(amountIn, amountOutDecimal),
    route: `${displayIn} → ${displayOut} · ${FEE_LABEL[best.fee]} pool`,
    feeTier: FEE_LABEL[best.fee],
    estimatedGas: best.gasEstimate.toString(),
    chainId: 1,
  };
}

function formatRate(amountIn: string, amountOut: string): string {
  const a = parseFloat(amountIn);
  const b = parseFloat(amountOut);
  if (!a || !b) return "—";
  return (b / a).toLocaleString("en-US", { maximumFractionDigits: 6 });
}

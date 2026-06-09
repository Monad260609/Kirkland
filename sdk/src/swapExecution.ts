import { createPublicClient, createWalletClient, formatUnits, http, parseUnits } from "viem";
import type { Address, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

// Ethereum mainnet. ETH input is routed through WETH with msg.value —
// the router wraps it. Output is always delivered as the ERC-20
// (WETH when "eth" is requested), no unwrap step.
const TOKEN_ADDRESSES: Record<string, Address> = {
  eth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  wbtc: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  uni: "0x1f9840a85d5aF5bf1D1762F925BdAddC4201F984",
  link: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
};

const TOKEN_DECIMALS: Record<string, number> = {
  eth: 18,
  weth: 18,
  usdc: 6,
  usdt: 6,
  dai: 18,
  wbtc: 8,
  uni: 18,
  link: 18,
};

const QUOTER_V2: Address = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e";
const SWAP_ROUTER_02: Address = "0x68b3465833fb72A70ecDF485E0e4C7bd8665Fc45";
const FEE_TIERS = [500, 3000, 10000] as const;

const QUOTER_ABI = [
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

const ROUTER_ABI = [
  {
    name: "exactInputSingle",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

const ERC20_ABI = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export interface SwapExecutionParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  privateKey: Hex;
  /** Slippage tolerance in basis points. Default 50 (0.5%). */
  slippageBps?: number;
  /** Ethereum mainnet RPC. Defaults to a free public endpoint. */
  rpcUrl?: string;
}

export interface SwapExecutionResult {
  txHash: Hex;
  approveTxHash?: Hex;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  quotedAmountOut: string;
  minAmountOut: string;
  feeTier: number;
  explorerUrl: string;
}

/**
 * Execute a real Uniswap V3 swap on Ethereum mainnet.
 *
 * Flow: quote via QuoterV2 (best of the 3 standard fee tiers) →
 * approve SwapRouter02 if needed (ERC-20 input) →
 * exactInputSingle with amountOutMinimum derived from the quote.
 *
 * ETH input is wrapped by the router (msg.value); output is delivered
 * as the ERC-20 (WETH when "eth" is requested as output).
 */
export async function executeSwap(params: SwapExecutionParams): Promise<SwapExecutionResult> {
  const { tokenIn, tokenOut, amountIn, privateKey, slippageBps = 50, rpcUrl } = params;

  const inSym = tokenIn.toLowerCase();
  const outSym = tokenOut.toLowerCase();
  const inAddr = TOKEN_ADDRESSES[inSym];
  const outAddr = TOKEN_ADDRESSES[outSym];
  if (!inAddr) throw new Error(`Unknown token: ${tokenIn}`);
  if (!outAddr) throw new Error(`Unknown token: ${tokenOut}`);
  if (inAddr === outAddr) throw new Error("tokenIn and tokenOut are the same asset");

  const isNativeEthIn = inSym === "eth";
  const inDecimals = TOKEN_DECIMALS[inSym] ?? 18;
  const outDecimals = TOKEN_DECIMALS[outSym] ?? 18;
  const rawAmountIn = parseUnits(amountIn, inDecimals);

  const account = privateKeyToAccount(privateKey);
  const transport = http(rpcUrl ?? "https://ethereum-rpc.publicnode.com");
  const publicClient = createPublicClient({ chain: mainnet, transport });
  const walletClient = createWalletClient({ account, chain: mainnet, transport });

  // ── 1. Quote: best amountOut across fee tiers ──
  let best: { amountOut: bigint; fee: number } | null = null;
  for (const fee of FEE_TIERS) {
    try {
      const { result } = await publicClient.simulateContract({
        address: QUOTER_V2,
        abi: QUOTER_ABI,
        functionName: "quoteExactInputSingle",
        args: [{ tokenIn: inAddr, tokenOut: outAddr, amountIn: rawAmountIn, fee, sqrtPriceLimitX96: 0n }],
      });
      if (result[0] > 0n && (!best || result[0] > best.amountOut)) {
        best = { amountOut: result[0], fee };
      }
    } catch {
      // no pool at this tier
    }
  }
  if (!best) {
    throw new Error(`No Uniswap V3 pool found for ${tokenIn.toUpperCase()}/${tokenOut.toUpperCase()}`);
  }

  const minAmountOut = (best.amountOut * BigInt(10000 - slippageBps)) / 10000n;

  // ── 2. Approve router for ERC-20 input ──
  let approveTxHash: Hex | undefined;
  if (!isNativeEthIn) {
    const allowance = await publicClient.readContract({
      address: inAddr,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [account.address, SWAP_ROUTER_02],
    });
    if (allowance < rawAmountIn) {
      approveTxHash = await walletClient.writeContract({
        address: inAddr,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [SWAP_ROUTER_02, rawAmountIn],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
    }
  }

  // ── 3. Swap ──
  const txHash = await walletClient.writeContract({
    address: SWAP_ROUTER_02,
    abi: ROUTER_ABI,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: inAddr,
        tokenOut: outAddr,
        fee: best.fee,
        recipient: account.address,
        amountIn: rawAmountIn,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0n,
      },
    ],
    value: isNativeEthIn ? rawAmountIn : 0n,
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    txHash,
    approveTxHash,
    tokenIn: tokenIn.toUpperCase(),
    tokenOut: tokenOut.toUpperCase(),
    amountIn,
    quotedAmountOut: formatUnits(best.amountOut, outDecimals),
    minAmountOut: formatUnits(minAmountOut, outDecimals),
    feeTier: best.fee,
    explorerUrl: `https://etherscan.io/tx/${txHash}`,
  };
}

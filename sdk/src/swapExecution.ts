import {
  createWalletClient,
  http,
  type Hex,
  type Address,
  createPublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";

const TOKEN_ADDRESSES: Record<string, string> = {
  eth: "0x0000000000000000000000000000000000000000",
  weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  wbtc: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
};

const TOKEN_DECIMALS: Record<string, number> = {
  eth: 18, weth: 18, usdc: 6, usdt: 6, dai: 18, wbtc: 8,
};

export interface SwapExecutionParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  privateKey: Hex;
  uniswapApiKey: string;
  slippageTolerance?: number; // basis points, default 50 (0.5%)
}

export interface SwapExecutionResult {
  txHash: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  expectedAmountOut: string;
  explorerUrl: string;
}

/**
 * Execute a swap via Uniswap API.
 *
 * Flow:
 * 1. Get quote from Uniswap API
 * 2. Get swap transaction data from Uniswap API
 * 3. Sign and submit the transaction
 * 4. Return the tx hash
 *
 * Note: This executes on Ethereum mainnet where Uniswap pools exist.
 */
export async function executeSwap(params: SwapExecutionParams): Promise<SwapExecutionResult> {
  const { tokenIn, tokenOut, amountIn, privateKey, uniswapApiKey, slippageTolerance = 50 } = params;

  const account = privateKeyToAccount(privateKey);
  const inAddress = TOKEN_ADDRESSES[tokenIn.toLowerCase()] || TOKEN_ADDRESSES.eth;
  const outAddress = TOKEN_ADDRESSES[tokenOut.toLowerCase()] || TOKEN_ADDRESSES.usdc;
  const decimals = TOKEN_DECIMALS[tokenIn.toLowerCase()] || 18;
  const rawAmount = BigInt(Math.round(parseFloat(amountIn) * 10 ** decimals)).toString();

  // Step 1: Get quote
  const quoteRes = await fetch("https://api.uniswap.org/v2/quote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": uniswapApiKey,
      origin: "https://app.uniswap.org",
    },
    body: JSON.stringify({
      tokenInChainId: 1,
      tokenOutChainId: 1,
      tokenIn: inAddress,
      tokenOut: outAddress,
      amount: rawAmount,
      type: "EXACT_INPUT",
      swapper: account.address,
      slippageTolerance: slippageTolerance,
      configs: [{ routingType: "CLASSIC", protocols: ["V2", "V3", "MIXED"] }],
    }),
  });

  if (!quoteRes.ok) {
    const text = await quoteRes.text();
    throw new Error(`Uniswap quote failed: ${quoteRes.status} ${text}`);
  }

  const quoteData = await quoteRes.json() as Record<string, unknown>;
  const quote = (quoteData.quote as Record<string, unknown>) ?? quoteData;
  const expectedAmountOut = String(quote.quoteDecimals ?? quote.amountOut ?? "0");

  // Step 2: Check if the API provides a swap transaction
  // The Uniswap v2 API may not provide direct swap transactions for all cases
  // For the hackathon demo, we'll use the quote data and construct the swap
  const methodParameters = quote.methodParameters as { calldata: string; to: string; value: string } | undefined;

  if (!methodParameters) {
    throw new Error("Uniswap API did not return swap transaction parameters. Quote-only mode.");
  }

  // Step 3: Sign and submit
  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  });

  const txHash = await walletClient.sendTransaction({
    to: methodParameters.to as Address,
    data: methodParameters.calldata as Hex,
    value: BigInt(methodParameters.value || "0"),
  });

  // Step 4: Wait for confirmation
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    txHash,
    tokenIn: tokenIn.toUpperCase(),
    tokenOut: tokenOut.toUpperCase(),
    amountIn,
    expectedAmountOut,
    explorerUrl: `https://etherscan.io/tx/${txHash}`,
  };
}

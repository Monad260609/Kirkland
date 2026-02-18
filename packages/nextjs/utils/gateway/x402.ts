import { publicClient } from "./chain";
import { parseEther } from "viem";

// Cache MISS = first to fetch, pays full price
// Cache HIT = data already on-chain, pays less
export const PRICE_CACHE_MISS = "0.001"; // 0.001 MON
export const PRICE_CACHE_HIT = "0.0001"; // 0.0001 MON

/**
 * Verifies that a tx hash corresponds to a valid MON payment to SERVER_WALLET.
 */
export async function verifyPayment(txHash: string, expectedPrice: string) {
  const serverWallet = process.env.SERVER_WALLET?.toLowerCase();
  if (!serverWallet) throw new Error("SERVER_WALLET not set");

  // Retry on 429 — the RPC may rate-limit us after the user's payment tx
  const maxRetries = 4;
  const baseDelay = 600;

  let receipt;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
      break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if ((!msg.includes("429") && !msg.includes("Too Many Requests")) || i === maxRetries) throw err;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
    }
  }

  if (!receipt || receipt.status !== "success") {
    return { ok: false as const, reason: "Transaction failed" };
  }

  let tx;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
      break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if ((!msg.includes("429") && !msg.includes("Too Many Requests")) || i === maxRetries) throw err;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
    }
  }

  if (!tx || tx.to?.toLowerCase() !== serverWallet) {
    return { ok: false as const, reason: "Wrong recipient" };
  }

  const minValue = parseEther(expectedPrice);
  if (tx.value < minValue) {
    return { ok: false as const, reason: "Insufficient payment" };
  }

  return { ok: true as const, payer: tx.from };
}

/**
 * Returns the 402 response body with the appropriate price (miss or hit).
 */
export function paymentRequiredResponse(isCached: boolean) {
  const price = isCached ? PRICE_CACHE_HIT : PRICE_CACHE_MISS;
  return {
    error: "Payment Required",
    price: `${price} MON`,
    cached: isCached,
    payTo: process.env.SERVER_WALLET,
    chainId: 10143,
    description: isCached
      ? "Cache hit — send 0.0001 MON to read cached data"
      : "Cache miss — send 0.001 MON to fetch fresh data",
  };
}

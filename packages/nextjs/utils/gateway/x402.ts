import { publicClient } from "./chain";
import { parseEther } from "viem";

// Cache MISS = premier a fetcher, paye cher
// Cache HIT = data deja on-chain, paye moins cher
export const PRICE_CACHE_MISS = "0.001"; // 0.001 MON
export const PRICE_CACHE_HIT = "0.0001"; // 0.0001 MON

/**
 * Verifie qu'un tx hash correspond a un paiement MON valide vers SERVER_WALLET.
 */
export async function verifyPayment(txHash: string, expectedPrice: string) {
  const serverWallet = process.env.SERVER_WALLET?.toLowerCase();
  if (!serverWallet) throw new Error("SERVER_WALLET not set");

  const receipt = await publicClient.getTransactionReceipt({
    hash: txHash as `0x${string}`,
  });

  if (receipt.status !== "success") {
    return { ok: false as const, reason: "Transaction failed" };
  }

  const tx = await publicClient.getTransaction({
    hash: txHash as `0x${string}`,
  });

  if (tx.to?.toLowerCase() !== serverWallet) {
    return { ok: false as const, reason: "Wrong recipient" };
  }

  const minValue = parseEther(expectedPrice);
  if (tx.value < minValue) {
    return { ok: false as const, reason: "Insufficient payment" };
  }

  return { ok: true as const, payer: tx.from };
}

/**
 * Retourne le body 402 avec le prix adapte (miss ou hit).
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

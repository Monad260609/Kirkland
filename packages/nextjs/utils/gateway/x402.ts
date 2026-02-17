import { publicClient } from "./chain";
import { parseEther } from "viem";

const CACHE_MISS_PRICE_MON = "0.001"; // 0.001 MON pour un cache miss

/**
 * Verifie qu'un tx hash correspond a un paiement MON valide vers SERVER_WALLET.
 * Le client envoie le txHash dans le header X-PAYMENT apres avoir envoye du MON.
 */
export async function verifyPayment(txHash: string) {
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

  const minValue = parseEther(CACHE_MISS_PRICE_MON);
  if (tx.value < minValue) {
    return { ok: false as const, reason: "Insufficient payment" };
  }

  return { ok: true as const, payer: tx.from };
}

/**
 * Retourne le body 402 quand un paiement est requis.
 */
export function paymentRequiredResponse() {
  return {
    error: "Payment Required",
    price: `${CACHE_MISS_PRICE_MON} MON`,
    payTo: process.env.SERVER_WALLET,
    chainId: 10143,
    description: "Send MON to the server wallet, then retry with X-PAYMENT: <txHash>",
  };
}

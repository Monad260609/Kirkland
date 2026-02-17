"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useSendTransaction } from "wagmi";

const SERVER_WALLET = process.env.NEXT_PUBLIC_SERVER_WALLET as `0x${string}`;
const CACHE_MISS_PRICE = "0.001"; // MON

export interface GatewayResult {
  query: string;
  intent: string;
  data: Record<string, unknown>;
  cached: boolean;
  cost: string;
  seeder?: string;
  txHash?: string;
  explorerUrl?: string;
  source: string;
  timestamp: number;
}

export function useGatewayQuery() {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [result, setResult] = useState<GatewayResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const queryGateway = async (query: string) => {
    setError(null);
    setResult(null);
    setIsPending(true);

    try {
      // 1. Appel initial — peut retourner la data (cache hit) ou 402
      const res = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(address ? { "x-payer": address } : {}),
        },
        body: JSON.stringify({ query }),
      });

      // Cache HIT — data gratuite
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        return data as GatewayResult;
      }

      // Pas un 402 → erreur classique
      if (res.status !== 402) {
        const body = await res.json();
        throw new Error(body.error || "Query failed");
      }

      // 2. Cache MISS → 402 → envoyer du MON au server wallet
      if (!address) throw new Error("Connect your wallet first");

      const paymentTxHash = await sendTransactionAsync({
        to: SERVER_WALLET,
        value: parseEther(CACHE_MISS_PRICE),
      });

      // 3. Attendre la confirmation
      // On poll le receipt directement via fetch pour ne pas dependre d'un hook
      let confirmed = false;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 1000));
        try {
          const checkRes = await fetch(`/api/tx-status?hash=${paymentTxHash}`);
          if (checkRes.ok) {
            const status = await checkRes.json();
            if (status.confirmed) {
              confirmed = true;
              break;
            }
          }
        } catch {
          // continue polling
        }
      }

      if (!confirmed) throw new Error("Payment transaction not confirmed");

      // 4. Retry avec le txHash comme preuve de paiement
      const retryRes = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": paymentTxHash,
          ...(address ? { "x-payer": address } : {}),
        },
        body: JSON.stringify({ query }),
      });

      if (!retryRes.ok) {
        const body = await retryRes.json();
        throw new Error(body.error || "Query failed after payment");
      }

      const data = await retryRes.json();
      setResult(data);
      return data as GatewayResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return null;
    } finally {
      setIsPending(false);
    }
  };

  return { queryGateway, result, error, isPending };
}

"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useSendTransaction } from "wagmi";

const SERVER_WALLET = process.env.NEXT_PUBLIC_SERVER_WALLET as `0x${string}`;

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
      if (!address) throw new Error("Connect your wallet first");

      // 1. Appel initial → toujours 402 avec le prix (miss ou hit)
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (res.status !== 402) {
        const body = await res.json();
        if (res.ok) {
          setResult(body);
          return body as GatewayResult;
        }
        throw new Error(body.error || "Query failed");
      }

      // 2. 402 → lire le prix (cache hit = 0.0001, cache miss = 0.001)
      const paymentInfo = await res.json();
      const price = paymentInfo.cached ? "0.0001" : "0.001";

      // 3. Envoyer le paiement en MON
      const paymentTxHash = await sendTransactionAsync({
        to: SERVER_WALLET,
        value: parseEther(price),
      });

      // 4. Attendre la confirmation sur Monad
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

      // 5. Retry avec le txHash comme preuve de paiement
      const retryRes = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": paymentTxHash,
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

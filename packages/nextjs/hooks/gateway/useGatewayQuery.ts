"use client";

import { useCallback, useState } from "react";
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

  /**
   * @param query  - Natural language query ("eth price", "Denver weather", etc.)
   * @param cachedHint - Pass true/false from the pre-check to skip the redundant 402 call.
   *                     true  → cache hit  → pay 0.0001 MON
   *                     false → cache miss → pay 0.001 MON
   *                     undefined → do the 402 dance as fallback
   */
  const queryGateway = useCallback(
    async (query: string, cachedHint?: boolean) => {
      setError(null);
      setResult(null);
      setIsPending(true);

      try {
        if (!address) throw new Error("Connect your wallet first");

        let price: string;

        if (cachedHint !== undefined) {
          // We already know from the pre-check — skip the extra API call
          price = cachedHint ? "0.0001" : "0.001";
        } else {
          // Fallback: ask the backend for the cache status
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

          const paymentInfo = await res.json();
          price = paymentInfo.cached ? "0.0001" : "0.001";
        }

        // Send MON payment
        const paymentTxHash = await sendTransactionAsync({
          to: SERVER_WALLET,
          value: parseEther(price),
        });

        // Wait for confirmation on Monad (poll every 2.5s to avoid 429)
        let confirmed = false;
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 2500));
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

        // Small delay before retry to let the RPC breathe
        await new Promise(r => setTimeout(r, 1000));

        // Retry with payment proof
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
    },
    [address, sendTransactionAsync],
  );

  return { queryGateway, result, error, isPending };
}

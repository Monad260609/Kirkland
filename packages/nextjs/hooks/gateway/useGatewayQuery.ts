"use client";

import { useCallback, useState } from "react";
import { parseEther } from "viem";
import { useAccount, useSendTransaction, useSignMessage } from "wagmi";

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
  agentId?: string;
  agentVerified?: boolean;
  timestamp: number;
}

interface AgentHeaders {
  "X-Agent-Id": string;
  "X-Agent-Sig": string;
  "X-Agent-Ts": string;
}

export type FlowStepKey = "identity" | "payment" | "confirmation" | "cache" | "result";

export interface FlowState {
  currentStep: FlowStepKey | null;
  agentId?: string;
  agentVerified: boolean;
  paymentTxHash?: string;
  paymentAmount?: string;
  cached?: boolean;
  txHash?: string;
  explorerUrl?: string;
}

const INITIAL_FLOW: FlowState = {
  currentStep: null,
  agentVerified: false,
};

export function useGatewayQuery() {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { signMessageAsync } = useSignMessage();
  const [result, setResult] = useState<GatewayResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [flow, setFlow] = useState<FlowState>(INITIAL_FLOW);

  /**
   * @param query  - Natural language query ("eth price", "New York weather", etc.)
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
      setFlow({ ...INITIAL_FLOW, currentStep: "identity" });

      try {
        if (!address) throw new Error("Connect your wallet first");

        // ── Step 1: sign agent identity (before payment so the visualizer reads naturally) ──
        const agentTs = Date.now().toString();
        const agentMessage = `cachemarket-agent:${address}:${agentTs}`;
        let agentHeaders: AgentHeaders | null = null;
        try {
          const agentSig = await signMessageAsync({ message: agentMessage });
          agentHeaders = {
            "X-Agent-Id": address,
            "X-Agent-Sig": agentSig,
            "X-Agent-Ts": agentTs,
          };
          setFlow(f => ({ ...f, agentId: address, agentVerified: true }));
        } catch {
          // User rejected signature — proceed as anonymous
          setFlow(f => ({ ...f, agentVerified: false }));
        }

        // ── Step 2: resolve cache status + price ──
        setFlow(f => ({ ...f, currentStep: "payment" }));
        let price: string;
        let cached: boolean;

        if (cachedHint !== undefined) {
          cached = cachedHint;
          price = cachedHint ? "0.0001" : "0.001";
        } else {
          const res = await fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
          });

          if (res.status !== 402) {
            const body = await res.json();
            if (res.ok) {
              setResult(body);
              setFlow(f => ({
                ...f,
                currentStep: "result",
                cached: body.cached,
                txHash: body.txHash,
                explorerUrl: body.explorerUrl,
              }));
              return body as GatewayResult;
            }
            throw new Error(body.error || "Query failed");
          }

          const paymentInfo = await res.json();
          cached = paymentInfo.cached ?? false;
          price = cached ? "0.0001" : "0.001";
        }
        setFlow(f => ({ ...f, cached, paymentAmount: `${price} MON` }));

        // ── Step 3: send MON payment ──
        const paymentTxHash = await sendTransactionAsync({
          to: SERVER_WALLET,
          value: parseEther(price),
        });
        setFlow(f => ({ ...f, paymentTxHash, currentStep: "confirmation" }));

        // ── Step 4: wait for confirmation on Monad ──
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

        // ── Step 5: retry with payment proof + agent headers ──
        setFlow(f => ({ ...f, currentStep: "cache" }));
        let retryRes: Response | null = null;
        for (let attempt = 0; attempt < 4; attempt++) {
          retryRes = await fetch("/api/query", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-PAYMENT": paymentTxHash,
              ...(agentHeaders ?? {}),
            },
            body: JSON.stringify({ query }),
          });

          if (retryRes.status >= 500 && attempt < 3) {
            await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempt)));
            continue;
          }
          break;
        }

        if (!retryRes || !retryRes.ok) {
          const body = retryRes ? await retryRes.json() : { error: "No response" };
          throw new Error(body.error || "Query failed after payment");
        }

        const data = (await retryRes.json()) as GatewayResult;
        setResult(data);
        setFlow(f => ({
          ...f,
          currentStep: "result",
          cached: data.cached,
          txHash: data.txHash,
          explorerUrl: data.explorerUrl,
          agentVerified: data.agentVerified ?? f.agentVerified,
        }));
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [address, sendTransactionAsync, signMessageAsync],
  );

  const resetFlow = useCallback(() => {
    setFlow(INITIAL_FLOW);
    setResult(null);
    setError(null);
  }, []);

  return { queryGateway, result, error, isPending, flow, resetFlow };
}

import { NextRequest, NextResponse } from "next/server";
import { verifyAgentIdentity } from "~~/utils/gateway/agentIdentity";
import { checkOnChainCache, hashQuery, recordHitOnChain, storeResultOnChain } from "~~/utils/gateway/chain";
import { detectIntent } from "~~/utils/gateway/detect";
import { emitEvent } from "~~/utils/gateway/events";
import { fetchFromSource } from "~~/utils/gateway/fetchers";
import {
  PRICE_CACHE_HIT,
  PRICE_CACHE_MISS,
  markPaymentRedeemed,
  paymentRequiredResponse,
  verifyPayment,
} from "~~/utils/gateway/x402";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input: string = body.query;
    if (!input) return NextResponse.json({ error: "Missing 'query'" }, { status: 400 });

    const intent = detectIntent(input);
    const qHash = hashQuery(input);

    // ── Check on-chain cache ──────────────────────────────
    const { isCached, data: cachedData } = await checkOnChainCache(qHash);

    // ── Payment required in all cases ─────────────────
    const paymentTxHash = req.headers.get("X-PAYMENT");

    if (!paymentTxHash) {
      return NextResponse.json(paymentRequiredResponse(isCached), { status: 402 });
    }

    // Verify the payment with the correct price
    const expectedPrice = isCached ? PRICE_CACHE_HIT : PRICE_CACHE_MISS;
    const payment = await verifyPayment(paymentTxHash, expectedPrice);
    if (!payment.ok) {
      return NextResponse.json({ error: payment.reason }, { status: 402 });
    }

    const payer = payment.payer;
    const agent = await verifyAgentIdentity(req.headers);

    // ══════════════════════════════════════════════════════
    //  CACHE HIT — 0.0001 MON (10x cheaper)
    // ══════════════════════════════════════════════════════
    if (isCached) {
      // Record the hit on-chain so getStats reflects real usage.
      // Fire-and-forget: a failed counter update must never block the response.
      recordHitOnChain(qHash).catch(() => undefined);

      markPaymentRedeemed(paymentTxHash);
      emitEvent({
        type: "cache_hit",
        query: input,
        user: payer.slice(0, 6) + "..." + payer.slice(-4),
        cost: `${PRICE_CACHE_HIT} MON`,
        cached: true,
        agentId: agent.verified ? agent.agentId : undefined,
        agentVerified: agent.verified,
      });

      return NextResponse.json({
        query: input,
        intent: intent.type,
        data: JSON.parse(cachedData),
        cached: true,
        cost: `${PRICE_CACHE_HIT} MON`,
        source: "on-chain cache",
        agentId: agent.verified ? agent.agentId : undefined,
        agentVerified: agent.verified,
        timestamp: Date.now(),
      });
    }

    // ══════════════════════════════════════════════════════
    //  CACHE MISS — 0.001 MON (first to pay)
    // ══════════════════════════════════════════════════════
    const freshData = await fetchFromSource(intent.type, intent.param);

    // Never seed upstream failures into the cache: a cached {error} would be
    // served (and charged) to every subsequent reader for the full TTL.
    // The payment stays unredeemed so the client can retry with the same tx.
    const parsedFresh = JSON.parse(freshData);
    if (parsedFresh && typeof parsedFresh === "object" && "error" in parsedFresh) {
      return NextResponse.json({ error: `Upstream source failed: ${parsedFresh.error}` }, { status: 502 });
    }

    const txHash = await storeResultOnChain(qHash, input, freshData, payer);

    markPaymentRedeemed(paymentTxHash);
    emitEvent({
      type: "query",
      query: input,
      user: payer.slice(0, 6) + "..." + payer.slice(-4),
      cost: `${PRICE_CACHE_MISS} MON`,
      cached: false,
      source: intent.type,
      agentId: agent.verified ? agent.agentId : undefined,
      agentVerified: agent.verified,
    });

    return NextResponse.json({
      query: input,
      intent: intent.type,
      data: JSON.parse(freshData),
      cached: false,
      cost: `${PRICE_CACHE_MISS} MON`,
      seeder: payer,
      txHash,
      explorerUrl: `https://testnet.monadexplorer.com/tx/${txHash}`,
      source: intent.type,
      agentId: agent.verified ? agent.agentId : undefined,
      agentVerified: agent.verified,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : "";
    console.error("Query error:", message);
    if (stack) console.error("Stack:", stack);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

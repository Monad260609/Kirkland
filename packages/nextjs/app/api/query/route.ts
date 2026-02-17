import { NextRequest, NextResponse } from "next/server";
import { checkOnChainCache, hashQuery, storeResultOnChain } from "~~/utils/gateway/chain";
import { detectIntent } from "~~/utils/gateway/detect";
import { emitEvent } from "~~/utils/gateway/events";
import { fetchFromSource } from "~~/utils/gateway/fetchers";
import { paymentRequiredResponse, verifyPayment } from "~~/utils/gateway/x402";

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

    // ══════════════════════════════════════════════════════
    //  CACHE HIT — data on-chain, pas expiree
    //  Gratuit, pas de paiement requis
    // ══════════════════════════════════════════════════════
    if (isCached) {
      const payer = req.headers.get("x-payer") || "0x0000000000000000000000000000000000000000";

      emitEvent({
        type: "cache_hit",
        query: input,
        user: payer.slice(0, 6) + "..." + payer.slice(-4),
        cost: "FREE",
        cached: true,
      });

      return NextResponse.json({
        query: input,
        intent: intent.type,
        data: JSON.parse(cachedData),
        cached: true,
        cost: "FREE",
        source: "on-chain cache",
        timestamp: Date.now(),
      });
    }

    // ══════════════════════════════════════════════════════
    //  CACHE MISS — paiement en MON requis
    //  Le client doit envoyer du MON au SERVER_WALLET
    //  puis inclure le txHash dans le header X-PAYMENT
    // ══════════════════════════════════════════════════════

    const paymentTxHash = req.headers.get("X-PAYMENT");

    if (!paymentTxHash) {
      return NextResponse.json(paymentRequiredResponse(), { status: 402 });
    }

    // Verifier le paiement on-chain
    const payment = await verifyPayment(paymentTxHash);
    if (!payment.ok) {
      return NextResponse.json({ error: payment.reason }, { status: 402 });
    }

    // Paiement OK — fetch + store on-chain
    const payer = payment.payer;
    const freshData = await fetchFromSource(intent.type, intent.param);
    const txHash = await storeResultOnChain(qHash, input, freshData, payer);

    emitEvent({
      type: "query",
      query: input,
      user: payer.slice(0, 6) + "..." + payer.slice(-4),
      cost: "0.001 MON",
      cached: false,
      source: intent.type,
    });

    return NextResponse.json({
      query: input,
      intent: intent.type,
      data: JSON.parse(freshData),
      cached: false,
      cost: "0.001 MON",
      seeder: payer,
      txHash,
      explorerUrl: `https://testnet.monadexplorer.com/tx/${txHash}`,
      source: intent.type,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Query error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

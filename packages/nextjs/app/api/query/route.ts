import { NextRequest, NextResponse } from "next/server";
import { checkOnChainCache, hashQuery, storeResultOnChain } from "~~/utils/gateway/chain";
import { detectIntent } from "~~/utils/gateway/detect";
import { emitEvent } from "~~/utils/gateway/events";
import { fetchFromSource } from "~~/utils/gateway/fetchers";

export async function POST(req: NextRequest) {
  try {
    const { query: input } = await req.json();
    if (!input) return NextResponse.json({ error: "Missing 'query'" }, { status: 400 });

    const intent = detectIntent(input);
    const qHash = hashQuery(input);
    const payerAddress = req.headers.get("x-payer") || "0x0000000000000000000000000000000000000000";

    // Check on-chain cache
    const { isCached, data: cachedData } = await checkOnChainCache(qHash);

    if (isCached) {
      // CACHE HIT — data is fresh on-chain
      emitEvent({
        type: "cache_hit",
        query: input,
        user: payerAddress.slice(0, 6) + "..." + payerAddress.slice(-4),
        cost: "$0.0001",
        cached: true,
      });

      return NextResponse.json({
        query: input,
        intent: intent.type,
        data: JSON.parse(cachedData),
        cached: true,
        cost: "$0.0001",
        source: "on-chain cache",
        timestamp: Date.now(),
      });
    }

    // CACHE MISS — fetch external API, store on-chain
    const freshData = await fetchFromSource(intent.type, intent.param);
    const txHash = await storeResultOnChain(qHash, input, freshData, payerAddress);

    emitEvent({
      type: "query",
      query: input,
      user: payerAddress.slice(0, 6) + "..." + payerAddress.slice(-4),
      cost: "$0.01",
      cached: false,
      source: intent.type,
    });

    return NextResponse.json({
      query: input,
      intent: intent.type,
      data: JSON.parse(freshData),
      cached: false,
      cost: "$0.01",
      seeder: payerAddress,
      txHash,
      source: intent.type,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Query error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

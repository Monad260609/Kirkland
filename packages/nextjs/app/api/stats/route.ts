import { NextResponse } from "next/server";
import { getOnChainStats } from "~~/utils/gateway/chain";

export async function GET() {
  try {
    const stats = await getOnChainStats();
    return NextResponse.json({
      seeds: stats.seeds.toString(),
      hits: stats.hits.toString(),
      queries: stats.queries.toString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

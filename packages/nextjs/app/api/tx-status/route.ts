import { NextRequest, NextResponse } from "next/server";
import { publicClient } from "~~/utils/gateway/chain";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const hash = req.nextUrl.searchParams.get("hash");
  if (!hash) return NextResponse.json({ error: "Missing hash" }, { status: 400 });

  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: hash as `0x${string}`,
    });
    return NextResponse.json({ confirmed: receipt.status === "success" });
  } catch {
    return NextResponse.json({ confirmed: false });
  }
}

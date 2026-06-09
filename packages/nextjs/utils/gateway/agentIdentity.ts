import { type Address, verifyMessage } from "viem";

const MAX_TIMESTAMP_AGE_MS = 60_000; // 60 seconds replay protection

/**
 * Verifies agent identity from request headers.
 *
 * Expected headers:
 *   X-Agent-Id:  <walletAddress>
 *   X-Agent-Sig: <signature>
 *   X-Agent-Ts:  <timestamp>
 *
 * The agent must sign: `cachemarket-agent:<walletAddress>:<timestamp>`
 *
 * Returns { agentId, verified: true } or { agentId: "0x0...", verified: false }
 */
export async function verifyAgentIdentity(headers: Headers): Promise<{
  agentId: Address;
  verified: boolean;
}> {
  const NULL_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

  const agentId = headers.get("X-Agent-Id");
  const agentSig = headers.get("X-Agent-Sig");
  const agentTs = headers.get("X-Agent-Ts");

  // No agent headers = anonymous request (valid, just not authenticated)
  if (!agentId || !agentSig || !agentTs) {
    return { agentId: NULL_ADDRESS, verified: false };
  }

  // Validate timestamp (replay protection)
  const timestamp = parseInt(agentTs, 10);
  if (isNaN(timestamp)) {
    return { agentId: NULL_ADDRESS, verified: false };
  }

  const now = Date.now();
  if (Math.abs(now - timestamp) > MAX_TIMESTAMP_AGE_MS) {
    return { agentId: NULL_ADDRESS, verified: false };
  }

  // Verify signature
  const message = `cachemarket-agent:${agentId}:${agentTs}`;

  try {
    const valid = await verifyMessage({
      address: agentId as Address,
      message,
      signature: agentSig as `0x${string}`,
    });

    if (valid) {
      return { agentId: agentId as Address, verified: true };
    }
  } catch {
    // Invalid signature format or verification error
  }

  return { agentId: NULL_ADDRESS, verified: false };
}

import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";

/**
 * Creates agent identity headers for inclusion in Kirkland API requests.
 *
 * Signs the message: `kirkland-agent:<walletAddress>:<timestamp>`
 *
 * @example
 * const headers = await createAgentHeaders("0xprivatekey...");
 * // { "X-Agent-Id": "0x...", "X-Agent-Sig": "0x...", "X-Agent-Ts": "1709..." }
 */
export async function createAgentHeaders(privateKey: Hex): Promise<Record<string, string>> {
  const account = privateKeyToAccount(privateKey);
  const timestamp = Date.now().toString();
  const message = `kirkland-agent:${account.address}:${timestamp}`;
  const signature = await account.signMessage({ message });

  return {
    "X-Agent-Id": account.address,
    "X-Agent-Sig": signature,
    "X-Agent-Ts": timestamp,
  };
}

/**
 * Gets the wallet address from a private key.
 */
export function getAgentAddress(privateKey: Hex): Address {
  return privateKeyToAccount(privateKey).address;
}

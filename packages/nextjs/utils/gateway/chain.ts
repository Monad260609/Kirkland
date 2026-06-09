import { createPublicClient, createWalletClient, http, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "~~/scaffold.config";

async function withRetry<T>(fn: () => Promise<T>, retries = 5, baseDelay = 800): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      const isRetryable =
        msg.includes("429") ||
        msg.includes("Too Many Requests") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("fetch failed") ||
        msg.includes("nonce") ||
        msg.includes("already known");
      if (!isRetryable || i === retries) throw err;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
    }
  }
  throw new Error("Unreachable");
}

const DATACACHE_ABI = [
  {
    name: "checkCache",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "queryHash", type: "bytes32" }],
    outputs: [
      { name: "isCached", type: "bool" },
      { name: "data", type: "string" },
    ],
  },
  {
    name: "storeResult",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "queryHash", type: "bytes32" },
      { name: "query", type: "string" },
      { name: "data", type: "string" },
      { name: "seeder", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "getResult",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "queryHash", type: "bytes32" }],
    outputs: [
      { name: "data", type: "string" },
      { name: "seeder", type: "address" },
      { name: "timestamp", type: "uint256" },
      { name: "hits", type: "uint256" },
    ],
  },
  {
    name: "getStats",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "seeds", type: "uint256" },
      { name: "hits", type: "uint256" },
      { name: "queries", type: "uint256" },
    ],
  },
  {
    name: "recordHits",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "queryHash", type: "bytes32" },
      { name: "count", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

function getAccount() {
  if (!process.env.BACKEND_PRIVATE_KEY) {
    throw new Error("BACKEND_PRIVATE_KEY is not set");
  }
  return privateKeyToAccount(process.env.BACKEND_PRIVATE_KEY as `0x${string}`);
}

function getWalletClient() {
  return createWalletClient({
    account: getAccount(),
    chain: monadTestnet,
    transport: http(),
  });
}

function getCacheAddress(): `0x${string}` {
  const addr = process.env.DATACACHE_ADDRESS;
  if (!addr) throw new Error("DATACACHE_ADDRESS is not set");
  return addr as `0x${string}`;
}

export function hashQuery(query: string): `0x${string}` {
  return keccak256(toHex(query.toLowerCase().trim()));
}

export async function checkOnChainCache(queryHash: `0x${string}`) {
  return withRetry(async () => {
    const result = await publicClient.readContract({
      address: getCacheAddress(),
      abi: DATACACHE_ABI,
      functionName: "checkCache",
      args: [queryHash],
    });
    return { isCached: result[0], data: result[1] };
  });
}

export async function storeResultOnChain(queryHash: `0x${string}`, query: string, data: string, seeder: string) {
  return withRetry(async () => {
    const txHash = await getWalletClient().writeContract({
      address: getCacheAddress(),
      abi: DATACACHE_ABI,
      functionName: "storeResult",
      args: [queryHash, query, data, seeder as `0x${string}`],
    });
    return txHash;
  });
}

export async function recordHitOnChain(queryHash: `0x${string}`) {
  return withRetry(async () => {
    return getWalletClient().writeContract({
      address: getCacheAddress(),
      abi: DATACACHE_ABI,
      functionName: "recordHits",
      args: [queryHash, 1n],
    });
  });
}

export async function getOnChainStats() {
  return withRetry(async () => {
    const result = await publicClient.readContract({
      address: getCacheAddress(),
      abi: DATACACHE_ABI,
      functionName: "getStats",
    });
    return { seeds: result[0], hits: result[1], queries: result[2] };
  });
}

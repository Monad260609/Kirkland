import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ── Monad Testnet ──────────────────────────────────────────

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
});

// ── DataCache contract ─────────────────────────────────────

export const CACHE_ADDRESS =
  "0x8aff0f33092efe2af41c67e8e76944d0009a5fca" as const;

export const CACHE_ABI = [
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
    name: "recordHits",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "queryHash", type: "bytes32" },
      { name: "count", type: "uint256" },
    ],
    outputs: [],
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
] as const;

// ── Clients ────────────────────────────────────────────────

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

export function getWalletClient() {
  const rawKey = process.env.PRIVATE_KEY;
  if (!rawKey) {
    throw new Error(
      "PRIVATE_KEY not set. Create a cli/.env file with your private key.",
    );
  }
  const account = privateKeyToAccount(rawKey as `0x${string}`);
  return {
    account,
    client: createWalletClient({ account, chain: monadTestnet, transport: http() }),
  };
}

// ── Hash a query the same way as the backend ───────────────

export function hashQuery(query: string): `0x${string}` {
  return keccak256(toHex(query.toLowerCase().trim()));
}

// ── Contract reads ─────────────────────────────────────────

export async function checkCache(
  queryHash: `0x${string}`,
): Promise<{ isCached: boolean; data: string }> {
  const [isCached, data] = await publicClient.readContract({
    address: CACHE_ADDRESS,
    abi: CACHE_ABI,
    functionName: "checkCache",
    args: [queryHash],
  });
  return { isCached, data };
}

export async function getStats() {
  const [seeds, hits, queries] = await publicClient.readContract({
    address: CACHE_ADDRESS,
    abi: CACHE_ABI,
    functionName: "getStats",
  });
  return { seeds, hits, queries };
}

// ── Contract writes (owner only) ───────────────────────────

export async function storeResult(
  queryHash: `0x${string}`,
  query: string,
  data: string,
  seeder: `0x${string}`,
): Promise<string> {
  const { account, client } = getWalletClient();
  const txHash = await client.writeContract({
    address: CACHE_ADDRESS,
    abi: CACHE_ABI,
    functionName: "storeResult",
    args: [queryHash, query, data, seeder],
    account,
    chain: monadTestnet,
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function recordHits(
  queryHash: `0x${string}`,
  count: bigint,
): Promise<string> {
  const { account, client } = getWalletClient();
  const txHash = await client.writeContract({
    address: CACHE_ADDRESS,
    abi: CACHE_ABI,
    functionName: "recordHits",
    args: [queryHash, count],
    account,
    chain: monadTestnet,
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

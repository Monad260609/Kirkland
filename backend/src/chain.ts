import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

// ══════════════════════════════════════════════════════════
//  CHAIN MONAD TESTNET
// ══════════════════════════════════════════════════════════

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
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

// ══════════════════════════════════════════════════════════
//  ABI — adapte au DataCache deploye
// ══════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════
//  CLIENTS VIEM
// ══════════════════════════════════════════════════════════

const account = privateKeyToAccount(
  process.env.BACKEND_PRIVATE_KEY! as `0x${string}`,
);

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

export const walletClient = createWalletClient({
  account,
  chain: monadTestnet,
  transport: http(),
});

const cacheAddress = (process.env.DATACACHE_ADDRESS ||
  "0x8aff0f33092efe2af41c67e8e76944d0009a5fca") as `0x${string}`;

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════

/** Hash a query deterministically (lowercase + trim) */
export function hashQuery(query: string): `0x${string}` {
  return keccak256(toHex(query.toLowerCase().trim()));
}

/** READ: is the query cached on-chain? (free) */
export async function checkOnChainCache(queryHash: `0x${string}`) {
  const [isCached, data] = await publicClient.readContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "checkCache",
    args: [queryHash],
  });
  return { isCached, data };
}

/** WRITE: store a result after a cache miss (costs MON gas) */
export async function storeResultOnChain(
  queryHash: `0x${string}`,
  query: string,
  data: string,
  seeder: string,
) {
  const txHash = await walletClient.writeContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "storeResult",
    args: [queryHash, query, data, seeder as `0x${string}`],
  });
  return txHash;
}

/** WRITE: record hits in batch (costs MON gas) */
export async function recordHitsOnChain(
  queryHash: `0x${string}`,
  count: bigint,
) {
  const txHash = await walletClient.writeContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "recordHits",
    args: [queryHash, count],
  });
  return txHash;
}

/** READ: global stats (free) */
export async function getOnChainStats() {
  const [seeds, hits, queries] = await publicClient.readContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "getStats",
  });
  return { seeds, hits, queries };
}

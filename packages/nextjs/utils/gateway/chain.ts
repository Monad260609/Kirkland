import { createPublicClient, createWalletClient, http, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "~~/scaffold.config";

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
] as const;

const account = privateKeyToAccount(process.env.BACKEND_PRIVATE_KEY! as `0x${string}`);

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

export const walletClient = createWalletClient({
  account,
  chain: monadTestnet,
  transport: http(),
});

const cacheAddress = process.env.DATACACHE_ADDRESS! as `0x${string}`;

export function hashQuery(query: string): `0x${string}` {
  return keccak256(toHex(query.toLowerCase().trim()));
}

export async function checkOnChainCache(queryHash: `0x${string}`) {
  const result = await publicClient.readContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "checkCache",
    args: [queryHash],
  });
  return { isCached: result[0], data: result[1] };
}

export async function storeResultOnChain(queryHash: `0x${string}`, query: string, data: string, seeder: string) {
  const txHash = await walletClient.writeContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "storeResult",
    args: [queryHash, query, data, seeder as `0x${string}`],
  });
  return txHash;
}

export async function getOnChainStats() {
  const result = await publicClient.readContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "getStats",
  });
  return { seeds: result[0], hits: result[1], queries: result[2] };
}

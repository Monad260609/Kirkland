import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  keccak256,
  toHex,
  type PublicClient,
  type WalletClient,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ── Monad Testnet ──────────────────────────────────────────

export const MONAD_TESTNET = defineChain({
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

export const EXPLORER_TX = "https://testnet.monadexplorer.com/tx/";

// ── Contract ───────────────────────────────────────────────

export const CACHE_ADDRESS =
  "0xF82441bDCAD5a0BB910798cC3859366cAF2AE413" as const;

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

// ── Helpers ────────────────────────────────────────────────

export function hashQuery(query: string): `0x${string}` {
  return keccak256(toHex(query.toLowerCase().trim()));
}

// ── Chain class ────────────────────────────────────────────

export class ChainClient {
  private publicClient: PublicClient;
  private walletClient: WalletClient | null = null;
  private account: Account | null = null;

  constructor(rpcUrl?: string, privateKey?: string) {
    const transport = http(rpcUrl);
    this.publicClient = createPublicClient({
      chain: MONAD_TESTNET,
      transport,
    });

    if (privateKey) {
      this.account = privateKeyToAccount(privateKey as `0x${string}`);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: MONAD_TESTNET,
        transport,
      });
    }
  }

  getAddress(): `0x${string}` | null {
    return this.account?.address ?? null;
  }

  // ── Reads ────────────────────────────────────────────────

  async checkCache(
    queryHash: `0x${string}`,
  ): Promise<{ isCached: boolean; data: string }> {
    const [isCached, data] = await this.publicClient.readContract({
      address: CACHE_ADDRESS,
      abi: CACHE_ABI,
      functionName: "checkCache",
      args: [queryHash],
    });
    return { isCached, data };
  }

  async getStats(): Promise<{ seeds: bigint; hits: bigint; queries: bigint }> {
    const [seeds, hits, queries] = await this.publicClient.readContract({
      address: CACHE_ADDRESS,
      abi: CACHE_ABI,
      functionName: "getStats",
    });
    return { seeds, hits, queries };
  }

  // ── Writes (require privateKey) ──────────────────────────

  private requireWallet(): { client: WalletClient; account: Account } {
    if (!this.walletClient || !this.account) {
      throw new Error(
        "privateKey is required to write on-chain. Pass it in KirklandConfig.",
      );
    }
    return { client: this.walletClient, account: this.account };
  }

  async storeResult(
    queryHash: `0x${string}`,
    query: string,
    data: string,
    seeder: `0x${string}`,
    retries = 3,
  ): Promise<string> {
    const { client, account } = this.requireWallet();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const txHash = await client.writeContract({
          address: CACHE_ADDRESS,
          abi: CACHE_ABI,
          functionName: "storeResult",
          args: [queryHash, query, data, seeder],
          account,
          chain: MONAD_TESTNET,
        });
        await this.publicClient.waitForTransactionReceipt({ hash: txHash });
        return txHash;
      } catch (err: unknown) {
        const msg = (err as Error).message;
        if (attempt < retries && msg.includes("429")) {
          await new Promise(r => setTimeout(r, attempt * 2000));
          continue;
        }
        throw err;
      }
    }
    throw new Error("storeResult: max retries exceeded");
  }

  async recordHits(
    queryHash: `0x${string}`,
    count: bigint,
  ): Promise<string> {
    const { client, account } = this.requireWallet();
    const txHash = await client.writeContract({
      address: CACHE_ADDRESS,
      abi: CACHE_ABI,
      functionName: "recordHits",
      args: [queryHash, count],
      account,
      chain: MONAD_TESTNET,
    });
    await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }
}

// ── Config ─────────────────────────────────────────────────

export interface CacheMarketConfig {
  /** Private key of the contract owner — required for cache misses (storeResult) */
  privateKey?: string;
  /** Override the default Monad Testnet RPC URL */
  rpcUrl?: string;
  /** Groq API key — required for AI-type queries */
  groqApiKey?: string;
}

// ── Query ──────────────────────────────────────────────────

export type IntentType = "price" | "weather" | "country" | "ai";

export interface Intent {
  type: IntentType;
  param: string;
}

export interface QueryResult {
  /** The original query string */
  query: string;
  /** The data returned (price, weather, country info, or AI answer) */
  data: Record<string, unknown>;
  /** true if data came from on-chain cache, false if freshly fetched */
  cached: boolean;
  /** Detected query type */
  intent: IntentType;
  /** Human-readable source description */
  source: string;
  /** Tx hash of the storeResult call (cache miss only) */
  txHash?: string;
  /** Address that seeded the data (cache miss only) */
  seeder?: string;
  /** Monad Explorer link */
  explorerUrl?: string;
}

// ── Stats ──────────────────────────────────────────────────

export interface CacheStats {
  /** Total number of times data was seeded on-chain */
  seeds: bigint;
  /** Total number of cache hits recorded */
  hits: bigint;
  /** Total queries processed */
  queries: bigint;
}

// ── Cache check ────────────────────────────────────────────

export interface CacheCheckResult {
  /** Whether there is a valid (non-expired) entry on-chain */
  isCached: boolean;
  /** Raw JSON string stored on-chain, null if not cached */
  rawData: string | null;
  /** Parsed data object, null if not cached */
  data: Record<string, unknown> | null;
}

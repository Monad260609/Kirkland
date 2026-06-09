import { ChainClient, hashQuery, EXPLORER_TX } from "./chain.js";
import { detectIntent } from "./detect.js";
import { fetchExternal } from "./fetchers.js";
import type {
  KirklandConfig,
  CacheCheckResult,
  QueryResult,
  CacheStats,
} from "./types.js";

/**
 * Kirkland SDK client.
 *
 * @example
 * ```ts
 * import { Kirkland } from "@kirkland/sdk";
 *
 * const client = new Kirkland({ privateKey: "0x..." });
 *
 * const result = await client.query("price of ETH");
 * console.log(result.data); // { token: "ethereum", usd: 1989, ... }
 * console.log(result.cached); // true / false
 * ```
 */
export class Kirkland {
  private chain: ChainClient;
  private groqApiKey?: string;

  constructor(config: KirklandConfig = {}) {
    this.chain = new ChainClient(config.rpcUrl, config.privateKey);
    this.groqApiKey = config.groqApiKey;
  }

  // ── hashQuery ────────────────────────────────────────────

  /**
   * Hash a query string to a bytes32 key (keccak256).
   * Useful to check the cache manually before querying.
   */
  hashQuery(query: string): `0x${string}` {
    return hashQuery(query);
  }

  // ── checkCache ───────────────────────────────────────────

  /**
   * Check if a query has a valid (non-expired) entry on-chain.
   * This is a free read — no gas, no private key needed.
   *
   * @example
   * const { isCached, data } = await client.checkCache("price of ETH");
   */
  async checkCache(query: string): Promise<CacheCheckResult> {
    const qHash = hashQuery(query);
    const { isCached, data: rawData } = await this.chain.checkCache(qHash);

    if (!isCached) {
      return { isCached: false, rawData: null, data: null };
    }

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(rawData) as Record<string, unknown>;
    } catch {
      parsed = { raw: rawData };
    }

    return { isCached: true, rawData, data: parsed };
  }

  // ── query ────────────────────────────────────────────────

  /**
   * Query the Kirkland protocol.
   *
   * Flow:
   * 1. Hash the query and check on-chain cache
   * 2. If HIT → return cached data (free read)
   * 3. If MISS → fetch from external API, store on-chain (requires privateKey)
   *
   * @throws if cache miss and no privateKey was provided
   *
   * @example
   * const result = await client.query("price of ETH");
   * const result = await client.query("weather in New York");
   * const result = await client.query("France info");
   */
  async query(query: string): Promise<QueryResult> {
    const qHash = hashQuery(query);
    const { isCached, data: rawData } = await this.chain.checkCache(qHash);

    // ── Cache HIT ──────────────────────────────────────────
    if (isCached) {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rawData) as Record<string, unknown>;
      } catch {
        parsed = { raw: rawData };
      }

      const { type } = detectIntent(query);

      // Record hit on-chain (best effort, non-blocking)
      this.chain.recordHits(qHash, 1n).catch(() => undefined);

      return {
        query,
        data: parsed,
        cached: true,
        intent: type,
        source: "on-chain cache (Monad)",
      };
    }

    // ── Cache MISS ─────────────────────────────────────────
    const { type, param } = detectIntent(query);
    const apiData = await fetchExternal(type, param, this.groqApiKey);

    const seeder = this.chain.getAddress();
    if (!seeder) {
      throw new Error(
        "Cache miss — a privateKey is required to seed data on-chain.",
      );
    }

    const txHash = await this.chain.storeResult(
      qHash,
      query,
      JSON.stringify(apiData),
      seeder,
    );

    return {
      query,
      data: apiData,
      cached: false,
      intent: type,
      source: `${type} → stored on Monad`,
      txHash,
      seeder,
      explorerUrl: `${EXPLORER_TX}${txHash}`,
    };
  }

  // ── getStats ─────────────────────────────────────────────

  /**
   * Read global on-chain cache statistics.
   * Free read — no gas, no private key needed.
   *
   * @example
   * const { seeds, hits, queries } = await client.getStats();
   */
  async getStats(): Promise<CacheStats> {
    return this.chain.getStats();
  }
}

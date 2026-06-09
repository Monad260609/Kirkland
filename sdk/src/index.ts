// Main client
export { CacheMarket } from "./client.js";

// Types
export type {
  CacheMarketConfig,
  QueryResult,
  CacheCheckResult,
  CacheStats,
  IntentType,
  Intent,
} from "./types.js";

// Utilities (for advanced usage)
export { detectIntent } from "./detect.js";
export { fetchExternal } from "./fetchers.js";
export { hashQuery, CACHE_ADDRESS, MONAD_TESTNET, EXPLORER_TX } from "./chain.js";

// Agent identity (for HTTP gateway clients that prove who they are)
export { createAgentHeaders, getAgentAddress } from "./agentIdentity.js";

// Uniswap swap execution (Ethereum mainnet) — for agents that act on cached quotes
export { executeSwap } from "./swapExecution.js";
export type { SwapExecutionParams, SwapExecutionResult } from "./swapExecution.js";

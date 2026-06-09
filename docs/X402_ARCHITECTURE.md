# Cachemarket — x402 Data Freshness Marketplace

## Overview

Cachemarket is a pay-per-call API gateway built on **Monad testnet**. It uses the HTTP 402 protocol to monetize API access, where the **first caller pays more** (cache miss) and **subsequent callers pay less** (cache hit) within a 60-second TTL window. All data is stored on-chain via the `DataCache` smart contract.

## Architecture

```
┌──────────┐         ┌──────────────┐         ┌─────────────┐
│  Client   │◄──402──│  Next.js API │◄──view──│  DataCache  │
│  (wagmi)  │──MON──►│  /api/query  │──store─►│  (Monad)    │
└──────────┘         └──────┬───────┘         └─────────────┘
                            │
                     ┌──────┴───────┐
                     │ External APIs │
                     │ CoinGecko    │
                     │ wttr.in      │
                     │ RESTCountries│
                     └──────────────┘
```

## Agent Identity (optional)

Every `/api/query` POST can carry a signed agent identity in three extra headers:

```
X-Agent-Id:  <walletAddress>
X-Agent-Sig: <signature>
X-Agent-Ts:  <unix millis>
```

The agent signs the EIP-191 message `cachemarket-agent:<walletAddress>:<timestamp>` with their wallet key. The server verifies the signature with `viem.verifyMessage` and rejects timestamps older than 60s (replay protection). Verified requests get `agentVerified: true` and the `agentId` stamped onto the response, and the agent id is broadcast on the SSE event stream. Missing or invalid signatures fall through anonymously — the payment flow is unchanged so existing clients keep working.

Server: `packages/nextjs/utils/gateway/agentIdentity.ts`
Client helpers: `sdk/src/agentIdentity.ts` (`createAgentHeaders`, `getAgentAddress`).

## Payment Flow (x402)

### Cache MISS — First caller, pays 0.001 MON

1. Client sends `POST /api/query` with `{ "query": "ETH price" }`
2. Server checks `DataCache.checkCache(hash)` on Monad → not cached
3. Server returns **402 Payment Required** with `{ price: "0.001 MON", payTo: SERVER_WALLET }`
4. Client sends **0.001 MON** to `SERVER_WALLET` via `sendTransaction`
5. Client retries with header `X-PAYMENT: <txHash>`
6. Server verifies tx on-chain (recipient, amount, status)
7. Server fetches external API (CoinGecko/wttr.in/RESTCountries)
8. Server stores result on-chain via `DataCache.storeResult()`
9. Returns data to client

### Cache HIT — Subsequent callers, pays 0.0001 MON

1. Client sends `POST /api/query` with `{ "query": "ETH price" }`
2. Server checks `DataCache.checkCache(hash)` → cached (< 60s TTL)
3. Server returns **402 Payment Required** with `{ price: "0.0001 MON", cached: true }`
4. Client sends **0.0001 MON** (10x cheaper)
5. Client retries with `X-PAYMENT: <txHash>`
6. Server verifies tx, returns cached data from on-chain

## Smart Contract — DataCache

- **Address**: `0x8aff0f33092efe2af41c67e8e76944d0009a5fca`
- **Chain**: Monad Testnet (ID: 10143)
- **TTL**: 60 seconds (configurable by owner)

### Functions

| Function | Type | Description |
|---|---|---|
| `checkCache(bytes32 queryHash)` | view | Returns `(isCached, data)` — checks if data exists and is not expired |
| `storeResult(bytes32, string, string, address)` | write | Stores query result on-chain (onlyOwner) |
| `getResult(bytes32 queryHash)` | view | Returns `(data, seeder, timestamp, hits)` |
| `getEntry(bytes32 queryHash)` | view | Full entry details including `isExpired` |
| `recordHits(bytes32, uint256)` | write | Batch increment hit counter (onlyOwner) |
| `getStats()` | view | Returns `(totalSeeds, totalHits, totalQueries)` |
| `setTTL(uint256)` | write | Change cache TTL (onlyOwner) |

### Events

- `DataSeeded(queryHash, query, seeder, data, timestamp)` — emitted on cache miss store
- `CacheHit(queryHash, reader, totalHits)` — emitted on hit recording

## API Endpoints

### `POST /api/query`

Main endpoint. Accepts a natural language query, detects intent, checks cache, handles payment.

**Request:**
```json
{
  "query": "ETH price"
}
```

**Headers:**
- `X-PAYMENT: <txHash>` — MON payment proof (required)

**Response (cache miss):**
```json
{
  "query": "ETH price",
  "intent": "price",
  "data": { "usd": 1997.67, "usd_24h_change": 0.356 },
  "cached": false,
  "cost": "0.001 MON",
  "seeder": "0xCFf44...",
  "txHash": "0xfa7c...",
  "explorerUrl": "https://testnet.monadexplorer.com/tx/0xfa7c...",
  "source": "price",
  "timestamp": 1771368934586
}
```

**Response (cache hit):**
```json
{
  "query": "ETH price",
  "intent": "price",
  "data": { "usd": 1997.67, "usd_24h_change": 0.356 },
  "cached": true,
  "cost": "0.0001 MON",
  "source": "on-chain cache",
  "timestamp": 1771368955059
}
```

### `GET /api/stats`

Returns global on-chain stats from `DataCache.getStats()`.

```json
{
  "seeds": "5",
  "hits": "0",
  "queries": "5"
}
```

### `GET /api/events`

SSE (Server-Sent Events) live feed of all queries and cache hits.

### `GET /api/tx-status?hash=0x...`

Check if a MON payment transaction is confirmed on Monad.

```json
{ "confirmed": true }
```

## Available Queries

### 1. Crypto Prices (CoinGecko)

| Query | Token ID |
|---|---|
| `"ETH price"`, `"ethereum"` | ethereum |
| `"BTC price"`, `"bitcoin"` | bitcoin |
| `"SOL price"`, `"solana"` | solana |
| `"MATIC price"` | matic-network |
| `"AVAX price"` | avalanche-2 |
| `"DOT price"` | polkadot |
| `"ADA price"` | cardano |
| `"MON price"`, `"monad"` | monad |

### 2. Weather (wttr.in)

| Query | City |
|---|---|
| `"New York weather"` | New York |
| `"weather in new york"` | New York |
| `"weather Paris"` | Paris |
| `"temperature Tokyo"` | Tokyo |
| `"forecast London"` | London |

Multi-word cities are fully supported ("buenos aires weather", "weather in los angeles").

### 3. Country Info (REST Countries)

| Query | Country |
|---|---|
| `"France info"` | France |
| `"info on Germany"` | Germany |
| `"Japan country"` | Japan |
| `"Brazil population"` | Brazil |
| `"capital of Spain"` | Spain |

### 4. Swap Quotes (Uniswap on Ethereum mainnet)

| Query | Pair |
|---|---|
| `"quote 1 eth to usdc"` | ETH → USDC |
| `"swap 1 wbtc to dai"` | WBTC → DAI |
| `"100 usdc in eth"` | USDC → ETH |
| `"eth -> usdc"` | ETH → USDC (default amount: 1) |

Quotes are read on-chain from the Uniswap V3 **QuoterV2** contract (`0x61fF…B21e`) on Ethereum mainnet — the gateway tries the 0.05% / 0.3% / 1% fee tiers and returns the best output, with the quoter's own gas estimate. No API key. Cached on Monad for 60s like any other entry. Supported tokens: ETH, WETH, USDC, USDT, DAI, WBTC, UNI, LINK.

### 5. AI (Groq)

Any query that matches no other category and is not a known token symbol is answered by Groq (`llama-3.3-70b-versatile`) and cached on-chain. Requires `GROQ_API_KEY`; without it the gateway returns an explicit 502 and nothing is cached or charged beyond the unredeemed payment (retryable).

## Key Files

| File | Description |
|---|---|
| `packages/nextjs/app/api/query/route.ts` | Main API route — cache check, payment verification, fetch + store |
| `packages/nextjs/app/api/stats/route.ts` | On-chain stats endpoint |
| `packages/nextjs/app/api/events/route.ts` | SSE live feed |
| `packages/nextjs/app/api/tx-status/route.ts` | Transaction confirmation check |
| `packages/nextjs/utils/gateway/x402.ts` | Payment verification (checks MON tx on Monad) |
| `packages/nextjs/utils/gateway/chain.ts` | Viem clients, contract interactions |
| `packages/nextjs/utils/gateway/detect.ts` | Intent detection (price/weather/country/swap-quote/ai) |
| `packages/nextjs/utils/gateway/fetchers.ts` | External fetchers (CoinGecko, wttr.in, REST Countries, Groq) |
| `packages/nextjs/utils/gateway/uniswap.ts` | On-chain QuoterV2 quotes (Ethereum mainnet) |
| `packages/nextjs/utils/gateway/agentIdentity.ts` | Verify signed agent headers |
| `packages/nextjs/components/PaymentFlowVisualizer.tsx` | Live x402 round-trip timeline |
| `packages/nextjs/components/gateway/LiveFeed.tsx` | SSE consumer — real-time paid-query feed |
| `packages/nextjs/components/gateway/MyCalls.tsx` | Local call history (reads callHistory.ts) |
| `packages/nextjs/utils/gateway/events.ts` | SSE event system |
| `packages/nextjs/hooks/gateway/useGatewayQuery.ts` | React hook for full x402 flow |
| `packages/foundry/contracts/DataCache.sol` | On-chain cache smart contract |

## Environment Variables

```env
BACKEND_PRIVATE_KEY=0x...              # DataCache contract owner private key
DATACACHE_ADDRESS=0x8aff...5fca        # DataCache contract address
SERVER_WALLET=0x...                    # Wallet that receives MON payments
NEXT_PUBLIC_SERVER_WALLET=0x...        # Same, exposed to client
GROQ_API_KEY=                          # Optional, for AI queries
ETHEREUM_RPC_URL=                      # Optional, Ethereum mainnet RPC for Uniswap quotes
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, wagmi, RainbowKit, Framer Motion
- **Smart Contract**: Solidity 0.8.20, Foundry
- **Blockchain**: Monad Testnet (chain ID 10143)
- **On-chain interaction**: viem
- **External APIs**: CoinGecko, wttr.in, REST Countries, Uniswap
- **Agent identity**: EIP-191 signed HTTP headers verified with `viem.verifyMessage`

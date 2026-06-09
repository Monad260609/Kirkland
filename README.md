# Cachemarket

An on-chain data caching protocol built on Monad. The first requester seeds the cache and pays full price; every subsequent requester reads from on-chain storage for ~10x less. No API keys, no subscriptions — just a wallet.

## Built for Monad Blitz Denver 2026, revived for Monad Blitz NYC

Cachemarket was built in one day on February 17, 2026 at **Monad Blitz Denver**, a hackathon challenging developers to build consumer dApps on the Monad blockchain. It finished as a finalist. We wanted to prove a simple idea: what if paying for data was built directly into HTTP, and the first person to ask a question could subsidize everyone who asks after them?

For **Monad Blitz NYC (June 2026)** the project picks up where Denver left off and adds three new pieces:
1. **Verifiable agent identity** — every gateway request can carry a signed wallet identity that the server verifies before returning data.
2. **Uniswap data category** — live swap quotes from Ethereum mainnet pools, cached on Monad like any other entry.
3. **PaymentFlowVisualizer** — a live timeline of the x402 round-trip so judges (and users) can see exactly what each MON pays for.

## How it works

1. You ask a natural language question ("price of ETH", "weather in New York", "quote 1 ETH to USDC")
2. The gateway checks the `DataCache` smart contract on Monad for a cached answer
3. **Cache hit** — you pay 0.0001 MON and get the data instantly
4. **Cache miss** — you pay 0.001 MON, the gateway fetches fresh data from an external API, stores it on-chain, and returns it to you
5. The data lives on-chain for 60 seconds. During that window, every subsequent reader pays 10x less
6. After the TTL expires, the next requester becomes the new seeder

Optionally, each request can prove **who** is asking by signing `cachemarket-agent:<address>:<timestamp>` with a wallet key and attaching three headers (`X-Agent-Id`, `X-Agent-Sig`, `X-Agent-Ts`). The gateway verifies the signature, stamps the response with `agentVerified: true`, and emits the agent id into the event stream. Missing or invalid signatures fall through anonymously.

```
User / Agent                                            (optional)
     │                                                  X-Agent-* headers
     ▼  POST /api/query (no payment)
  Gateway  ──────►  402 Payment Required { price, payTo, chainId }
     │
     ▼  Send MON to payTo
  Gateway  ──────►  Verify tx on-chain · verify agent signature
     │
     ├── Cache HIT  → return cached data (0.0001 MON)
     └── Cache MISS → fetch from API → store on Monad → return fresh data (0.001 MON)
```

## Data sources

| Category | Source | Example queries |
|----------|--------|-----------------|
| Crypto prices | CoinGecko | "ETH price", "price of bitcoin", "SOL" |
| Weather | wttr.in | "New York weather", "weather in Paris" |
| Country info | REST Countries | "France info", "Japan country" |
| Swap quotes | Uniswap (Ethereum mainnet) | "quote 1 ETH to USDC", "1 WBTC in DAI" |
| AI fallback | Groq (Llama 3.3 70B) | Any other question (optional) |

Uniswap quotes are fetched live from `api.uniswap.org`. The result — amount out, rate, route, gas estimate — is cached on Monad for 60s; the response page also exposes an "Execute on Uniswap" deep link for the human-side swap.

## Setup

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Copy the environment file and fill in your values:
   ```bash
   cp packages/nextjs/.env.example packages/nextjs/.env.local
   ```

3. Edit `.env.local` with:
   - `BACKEND_PRIVATE_KEY` — Private key of the DataCache owner (used to write to chain)
   - `SERVER_WALLET` / `NEXT_PUBLIC_SERVER_WALLET` — Public address matching the key above
   - `DATACACHE_ADDRESS` — Deployed DataCache contract address (defaults to the Denver deployment)
   - `UNISWAP_API_KEY` — Uniswap API key for the swap-quote category (other categories work without it)
   - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` — WalletConnect project ID (optional)
   - `GROQ_API_KEY` — Groq API key for AI fallback queries (optional)

4. Start the app:
   ```bash
   yarn start
   ```

   Visit `http://localhost:3000`.

## Using the CLI

```bash
cd cli
cp .env.example .env
# fill in PRIVATE_KEY
npm install
npm run build

cachemarket query "price of ETH"
cachemarket stats
```

## Using the SDK

```typescript
import { CacheMarket, createAgentHeaders, executeSwap } from "@cachemarket/sdk";

const client = new CacheMarket({
  privateKey: "0x...",
  rpcUrl: "https://testnet-rpc.monad.xyz",
});

// Read from cache (free)
const { isCached, data } = await client.checkCache("ETH price");

// Full query (cache check → fetch if miss → store on-chain)
const result = await client.query("weather in New York");

// Sign a request as a verifiable agent (HTTP gateway flow)
const headers = await createAgentHeaders("0x..."); // { X-Agent-Id, X-Agent-Sig, X-Agent-Ts }
await fetch("https://your-gateway.example.com/api/query", { method: "POST", headers, body: ... });

// Execute a Uniswap swap (Ethereum mainnet)
const swap = await executeSwap({
  tokenIn: "eth",
  tokenOut: "usdc",
  amountIn: "0.5",
  privateKey: "0x...",
  uniswapApiKey: "...",
});
console.log(swap.txHash, swap.expectedAmountOut);
```

## Smart contract

**DataCache** is deployed on Monad Testnet (chain ID 10143).

| Function | Description |
|----------|-------------|
| `checkCache(bytes32 queryHash)` | Returns whether data is cached and not expired |
| `storeResult(bytes32, string, string, address)` | Stores fresh data on-chain with a 60s TTL (owner only) |
| `getResult(bytes32 queryHash)` | Returns data, seeder address, timestamp, and hit count |
| `getStats()` | Returns total seeds, cache hits, and queries |

Source: [`packages/foundry/contracts/DataCache.sol`](packages/foundry/contracts/DataCache.sol)

## Technology stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, Tailwind CSS, Framer Motion |
| Wallet | RainbowKit, wagmi, viem |
| Smart contracts | Solidity, Foundry |
| Blockchain | Monad Testnet (EVM-compatible, 10,000 TPS, sub-second finality) |
| Payment protocol | x402 (HTTP 402 Payment Required) |
| Agent identity | EIP-191 signed headers, viem `verifyMessage` |
| External APIs | CoinGecko, wttr.in, REST Countries, Uniswap, Groq |

## Project structure

```
cachemarket/
├── packages/
│   ├── nextjs/          # Main app (frontend + API routes + gateway logic)
│   └── foundry/         # Solidity contracts + Foundry tooling
├── cli/                 # CLI tool — cachemarket query "..."
├── sdk/                 # TypeScript SDK — @cachemarket/sdk
└── docs/                # Technical references
```

> For the full technical reference (component docs, hook internals, navigation logic, state management), see [`docs/TECHNICAL_REFERENCE.md`](docs/TECHNICAL_REFERENCE.md).

## The problem Cachemarket solves

Every API call today requires authentication, rate limits, and subscriptions. AI agents can't pay for data programmatically. Developers manage dozens of API keys across services. And when two people ask the same question seconds apart, the same data gets fetched twice.

Cachemarket removes all of that. One on-chain contract, one payment rail, zero API keys. The first person to ask pays for fresh data and stores it on Monad. Everyone who asks the same question within 60 seconds reads from on-chain storage at 1/10th the cost. The cache key is a keccak256 hash of the normalized query, so identical questions always resolve to the same entry.

Built on Monad's sub-second finality and sub-cent transaction costs, micropayments are practical for the first time — paying 0.0001 MON per cached read is economically viable because the chain makes it so.

## Why Monad

- **10,000 TPS** with optimistic parallel execution — handles high query throughput without congestion
- **Sub-second finality** (0.8s) — payments confirm before the user notices
- **Sub-cent fees** — micropayments for cached reads are economically viable
- **Full EVM compatibility** — Solidity, viem, wagmi, Foundry all work with zero changes

## Team

Built by three students from **DeVinci Blockchain** (Paris, France) at Monad Blitz Denver, February 17, 2026.

| Name | Role | Links |
|------|------|-------|
| **Sofiane Ben Taleb** | Full-Stack & Smart Contracts | [GitHub](https://github.com/gamween) · [LinkedIn](https://www.linkedin.com/in/sofiane-ben-taleb/) |
| **Armand Sechon** | Backend & Infrastructure | [GitHub](https://github.com/STOOKEEE) · [LinkedIn](https://www.linkedin.com/in/armand-sechon/) |
| **Noé Wales** | Frontend & Design | [GitHub](https://github.com/CHAAIISE) · [LinkedIn](https://www.linkedin.com/in/no%C3%A9-w/) |

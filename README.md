# Kirkland

An on-chain data caching protocol built on Monad. The first requester seeds the cache and pays full price; every subsequent requester reads from on-chain storage for ~10x less. No API keys, no subscriptions — just a wallet.

### 🔗 Live demo → **[kirkland-nextjs-iyrp-ten.vercel.app](https://kirkland-nextjs-iyrp-ten.vercel.app)**

*Built on Monad Testnet · Powered by the x402 protocol*

## Built for Monad Blitz NYC

Kirkland was built in one day at **⚡ Monad Blitz NYC** (June 9, 2026 · 9 AM–9 PM), a fast-paced hackathon hosted by the **Monad Foundation** — a focused sprint to experiment with Monad's high-performance EVM and rapidly prototype new ideas. The concept behind Kirkland is simple: what if paying for data was built directly into HTTP, and the first person to ask a question could subsidize everyone who asks after them?

> *"Monad Blitz is less about delivering a polished, market-ready application in a day, and more about sparking innovation, identifying exciting new use cases for Monad, and giving you a hands-on experience with the future of EVM performance."*

**Event at a glance**

| | |
|---|---|
| Event | ⚡ Monad Blitz NYC |
| Date | June 9, 2026 · 9:00 AM – 9:00 PM |
| Host | Monad Foundation |
| Prizes | 🥇 $2,500 · 🥈 $1,500 · 🥉 $1,000 |
| Faucet · Submissions · Voting | [blitz.devnads.com/events/monad-blitz-nyc](https://blitz.devnads.com/events/monad-blitz-nyc) |

Highlights:
1. **Verifiable agent identity** — every gateway request can carry a signed wallet identity that the server verifies before returning data.
2. **Uniswap data category** — swap quotes read directly from Uniswap V3 pools on Ethereum mainnet (QuoterV2, no API key), cached on Monad like any other entry.
3. **AI category** — free-form questions answered by Groq (Llama 3.3 70B) and cached on-chain.
4. **PaymentFlowVisualizer** — a live timeline of the x402 round-trip so judges (and users) can see exactly what each MON pays for.
5. **Live activity feed** — every paid query streams onto the dashboard in real time (SSE), with verified agent badges.

## How it works

1. You ask a natural language question ("price of ETH", "weather in New York", "quote 1 ETH to USDC")
2. The gateway checks the `DataCache` smart contract on Monad for a cached answer
3. **Cache hit** — you pay 0.0001 MON and get the data instantly
4. **Cache miss** — you pay 0.001 MON, the gateway fetches fresh data from an external API, stores it on-chain, and returns it to you
5. The data lives on-chain for 60 seconds. During that window, every subsequent reader pays 10x less
6. After the TTL expires, the next requester becomes the new seeder

Optionally, each request can prove **who** is asking by signing `kirkland-agent:<address>:<timestamp>` with a wallet key and attaching three headers (`X-Agent-Id`, `X-Agent-Sig`, `X-Agent-Ts`). The gateway verifies the signature, stamps the response with `agentVerified: true`, and emits the agent id into the event stream. Missing or invalid signatures fall through anonymously.

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
| Swap quotes | Uniswap V3 QuoterV2 (on-chain, Ethereum mainnet) | "quote 1 ETH to USDC", "1 WBTC in DAI" |
| AI fallback | Groq (Llama 3.3 70B) | Any other question |

Uniswap quotes are read directly from the QuoterV2 contract across the three standard fee tiers — no API key, nothing that can be revoked. The result — amount out, rate, winning pool, gas estimate — is cached on Monad for 60s; the response page also exposes an "Execute on Uniswap" deep link for the human-side swap.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment file and fill in your values:
   ```bash
   cp packages/nextjs/.env.example packages/nextjs/.env.local
   ```

3. Edit `.env.local` with:
   - `BACKEND_PRIVATE_KEY` — Private key of the DataCache owner (used to write to chain)
   - `SERVER_WALLET` / `NEXT_PUBLIC_SERVER_WALLET` — Public address matching the key above
   - `DATACACHE_ADDRESS` — Deployed DataCache contract address (defaults to the Blitz NYC deployment)
   - `GROQ_API_KEY` — Groq API key for the AI category (free at console.groq.com; without it AI queries return an explicit 502)
   - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` — WalletConnect project ID (optional)
   - `ETHEREUM_RPC_URL` — Ethereum mainnet RPC for Uniswap quotes (optional, defaults to a public endpoint)

4. Start the app:
   ```bash
   npm run start
   ```

   Visit `http://localhost:3000`.

## Using the CLI

```bash
cd cli
cp .env.example .env
# fill in PRIVATE_KEY
npm install
npm run build

kirkland query "price of ETH"
kirkland stats
```

## Using the SDK

```typescript
import { Kirkland, createAgentHeaders, executeSwap } from "@kirkland/sdk";

const client = new Kirkland({
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

// Execute a real Uniswap V3 swap on Ethereum mainnet
// (QuoterV2 quote → approve if ERC-20 input → SwapRouter02 exactInputSingle)
const swap = await executeSwap({
  tokenIn: "eth",
  tokenOut: "usdc",
  amountIn: "0.5",
  privateKey: "0x...",
  slippageBps: 50, // 0.5%
});
console.log(swap.txHash, swap.quotedAmountOut, swap.feeTier);
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
kirkland/
├── packages/
│   ├── nextjs/          # Main app (frontend + API routes + gateway logic)
│   └── foundry/         # Solidity contracts + Foundry tooling
├── cli/                 # CLI tool — kirkland query "..."
├── sdk/                 # TypeScript SDK — @kirkland/sdk
└── docs/                # Technical references
```

> For the full technical reference (component docs, hook internals, navigation logic, state management), see [`docs/TECHNICAL_REFERENCE.md`](docs/TECHNICAL_REFERENCE.md).

## The problem Kirkland solves

Every API call today requires authentication, rate limits, and subscriptions. AI agents can't pay for data programmatically. Developers manage dozens of API keys across services. And when two people ask the same question seconds apart, the same data gets fetched twice.

Kirkland removes all of that. One on-chain contract, one payment rail, zero API keys. The first person to ask pays for fresh data and stores it on Monad. Everyone who asks the same question within 60 seconds reads from on-chain storage at 1/10th the cost. The cache key is a keccak256 hash of the normalized query, so identical questions always resolve to the same entry.

Built on Monad's sub-second finality and sub-cent transaction costs, micropayments are practical for the first time — paying 0.0001 MON per cached read is economically viable because the chain makes it so.

## Why Monad

- **10,000 TPS** with optimistic parallel execution — handles high query throughput without congestion
- **Sub-second finality** (0.8s) — payments confirm before the user notices
- **Sub-cent fees** — micropayments for cached reads are economically viable
- **Full EVM compatibility** — Solidity, viem, wagmi, Foundry all work with zero changes

## Team

| Name | Role | Links |
|------|------|-------|
| **Sofiane Ben Taleb** | Builder | [GitHub](https://github.com/gamween) · [LinkedIn](https://www.linkedin.com/in/sofiane-ben-taleb/) |
| **Johann Cali** | Builder | [GitHub](https://github.com/JohannCFi) |
| **Jean Vasseur** | Builder | [GitHub](https://github.com/vassCaR) |

## License

Released under the **MIT License** — see [`LICENCE`](LICENCE). Bootstrapped with [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2) (© BuidlGuidl, MIT).

## Disclaimer

**Kirkland is an independent hackathon project and a parody.** It is **not affiliated with, endorsed by, sponsored by, or associated with Costco Wholesale Corporation, the "Kirkland Signature"™ brand, or any of its products — including its beverages.** "Kirkland Signature" and its logo are trademarks of their respective owners and are used here purely for satirical, non-commercial, and illustrative purposes. No trademark infringement is intended, and no commercial association is implied.

The software is provided "as is", for educational and demonstration purposes only, and runs on a public testnet. It handles no real-world funds and is **not financial advice**. Use at your own risk.

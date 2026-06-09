# Cachemarket — Technical Reference

This file consolidates the original detailed documentation that was previously in README.md.

---

**x402 Universal Access Point — Data Freshness Marketplace**

An on-chain data caching protocol built on Monad Testnet. The first requester seeds the cache and pays the full price; every subsequent requester reads from on-chain storage for 10x less. No API keys, no subscriptions — just a wallet.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Web2 / Web3 Structure](#web2--web3-structure)
4. [Pages & Components](#pages--components)
5. [Navigation Logic](#navigation-logic)
6. [State Management](#state-management)
7. [Web3 Integration](#web3-integration)
8. [API Routes](#api-routes)
9. [Smart Contract](#smart-contract)
10. [File Structure](#file-structure)
11. [How to Run Locally](#how-to-run-locally)

---

## Project Overview

Cachemarket is a monorepo containing:

| Package | Description |
|---------|-------------|
| `packages/nextjs` | Main Next.js 15 frontend + API gateway routes |
| `packages/foundry` | Solidity smart contracts (DataCache) + Foundry scripts |
| `backend/` | Standalone Hono.js backend (alternative gateway, port 4402) |
| `cli/` | CLI tool — `cachemarket query "..."` |
| `sdk/` | TypeScript SDK — `@cachemarket/sdk` |

The core flow:

1. User/agent queries data (crypto price, weather, country info)
2. Gateway checks the `DataCache` contract on Monad for a cached result
3. **Cache HIT** → user pays 0.0001 MON, gets cached data
4. **Cache MISS** → user pays 0.001 MON, gateway fetches from external API, stores on-chain, returns fresh data
5. After 60 seconds (TTL), data is stale and the next requester becomes the new seeder

---

## Architecture

```
User / Agent
     │
     ▼ POST /api/query
Next.js API Routes  ────────────────► DataCache (Monad contract)
     │                  checkCache()        │
     │   MISS                               │
     ├──────────► CoinGecko / wttr.in       │
     │            REST Countries            │
     │                                storeResult()
     │◄───────────────────────────────────────┘
     │
     ▼
GatewayResult { data, cached, cost, txHash }
```

**Key files in the gateway:**
- `utils/gateway/chain.ts` — viem public/wallet client, contract read/write helpers
- `utils/gateway/detect.ts` — NLP intent detection (price / weather / country)
- `utils/gateway/fetchers.ts` — external API calls (CoinGecko, wttr.in, REST Countries)
- `utils/gateway/x402.ts` — payment verification, 402 response builder
- `utils/gateway/events.ts` — SSE live event broadcast

---

## Web2 / Web3 Structure

The app is split based on whether a wallet is needed. This split is enforced in `ScaffoldEthAppWithProviders.tsx`:

```ts
const WEB2_PATHS = ["/", "/how-it-works", "/dev-tools"];
```

| Path | Type | Wallet required |
|------|------|-----------------|
| `/` | Web2 | No |
| `/how-it-works` | Web2 | No |
| `/dev-tools` | Web2 | No |
| `/about` | Special | No |
| `/connect` | Special | No |
| `/dashboard` | Web3 | Yes (soft) |
| `/market/result` | Web3 | Yes (to pay) |
| `/debug` | Dev tool | No |
| `/blockexplorer` | Dev tool | No |

Web3 pages show a "Connect Wallet" button in the top-right. Web2 pages and `/about` do not.

---

## Pages & Components

### Pages (`packages/nextjs/app/`)

#### `/` — Landing page (`app/page.tsx`)
The main marketing page. Contains:
- Animated hero with the **Cachemarket** title (click to reset inline section)
- Three CTA buttons: **How It Works**, **Dev Tools**, **Launch App**
- **How It Works** and **Dev Tools** toggle inline content panels below the hero (no navigation)
- **Launch App** links to `/dashboard`
- Default view (no section active): shows **Live On-Chain Stats** fetched from `/api/stats`
- Shader gradient background (shared across all pages)

#### `/about` — About page (`app/about/page.tsx`)
Team presentation page with cards for the 3 team members (photo, name, role, GitHub/LinkedIn links) and a description of the DeVinci Blockchain association.

#### `/connect` — Wallet connect page (`app/connect/page.tsx`)
Custom wallet connection UI:
- Shows the animated **MonadMascot** SVG on the left
- Lists all available wagmi connectors (MetaMask, WalletConnect, Coinbase, etc.) deduped by name
- `TargetCursor` for custom crosshair cursor effect on wallet buttons
- After connecting, redirects to `/`

#### `/dashboard` — Dashboard (`app/dashboard/page.tsx`)
The main app page. Renders `MarketContent`, which shows 3 data category cards (Crypto Prices, Weather, Country Info) using the `HoverEffect` card grid component. Each card has a dropdown to pick a query and a "Request API →" button that navigates to `/market/result?cat=...&q=...`.

#### `/how-it-works` — How It Works (`app/how-it-works/page.tsx`)
Full standalone page rendering `HowItWorksContent` (the detailed version from `components/content/`). Contains: flow diagram SVG, cache lifecycle SVG, pricing table, data sources grid, smart contract reference.

#### `/dev-tools` — Dev Tools (`app/dev-tools/page.tsx`)
Full standalone page rendering `DevToolsContent`. Contains: animated `Terminal` component showing a CLI demo, and a syntax-highlighted SDK code example.

#### `/market/result` — Query result (`app/market/result/page.tsx`)
The payment + result page. Takes `?cat=` and `?q=` query params. Implements a 6-state UI:
1. **Wallet not connected** — warning banner
2. **Pre-check loading** — checks `/api/query` (no payment) to get cache status and price
3. **Ready to pay** — shows price, CACHED/FRESH badge, "Pay & Query" button
4. **Payment in progress** — spinner while user signs tx
5. **Error** — error message
6. **Result** — renders `CryptoResult`, `WeatherResult`, or `CountriesResult` based on category

Uses `useGatewayQuery` hook for the full payment + query flow. Saves each successful call to localStorage via `addCallEntry`.

#### `/debug` — Debug Contracts (`app/debug/page.tsx`)
Scaffold-ETH developer tool for interacting with deployed contracts directly. Uses `@scaffold-ui/debug-contracts`.

#### `/blockexplorer` — Block Explorer (`app/blockexplorer/`)
Scaffold-ETH mini block explorer for the target network (only linked from the footer when on local Hardhat network).

#### `not-found.tsx`
Standard 404 page.

---

### Key Components (`packages/nextjs/components/`)

#### `ScaffoldEthAppWithProviders.tsx`
**The global app shell.** Wraps all providers (Wagmi, TanStack Query, RainbowKit) and renders the persistent navigation elements:
- **Back arrow + "CacheMarket" logo** (top-left, hidden on `/` and `/connect`)
  - Logo links to `/` on Web2 pages, `/dashboard` on Web3 pages
- **Connect Wallet button** (top-right, Web3 pages only)
  - If connected: renders `RainbowKitCustomConnectButton`
  - If not: link to `/connect`
- **"About us" button** (bottom-right, all pages except `/about` and `/connect`)
- `<main>` container for `{children}`
- `<Toaster>` for toast notifications

#### `components/content/HowItWorksContent.tsx`
Full-featured "How It Works" content with interactive SVG diagrams, pricing table, data sources, and contract reference. Used by both the landing page inline toggle and `/how-it-works`.

#### `components/content/DevToolsContent.tsx`
"Dev Tools" content with animated CLI terminal and SDK code example. Used by both the landing page inline toggle and `/dev-tools`.

#### `components/gateway/MarketContent.tsx`
Dashboard content. Three cards (one per data category) each with a `MetricDropdown` selector and a "Request API →" button. Uses `HoverEffect` card grid.

#### `components/MonadMascot.tsx`
Animated SVG mascot with mouse-tracking eye movement. Used on the `/connect` page.

#### `components/TargetCursor.tsx`
Custom crosshair cursor using GSAP. Activates on elements with class `.cursor-target`. Used on the `/connect` page.

#### `components/ThemeProvider.tsx`
next-themes wrapper for dark/light mode.

#### `components/scaffold-eth/RainbowKitCustomConnectButton/`
Custom wallet button that shows balance + chain name when connected, or a connect prompt when not.

#### `components/ui/card-hover-effect.tsx`
Animated card grid (`HoverEffect`, `Card`, `CardTitle`, `CardDescription`). Used by `MarketContent`.

#### `components/ui/stateful-button.tsx`
Button with built-in loading state. Used by `RainbowKitCustomConnectButton`.

#### `components/ui/terminal.tsx`
Animated terminal component with typewriter effect. Used by `DevToolsContent`.

---

### Hooks (`packages/nextjs/hooks/`)

#### `hooks/gateway/useGatewayQuery.ts`
The core payment hook. Given a query string:
1. If `cachedHint` is provided (from pre-check), use known price; otherwise calls `/api/query` without payment to get a 402 with price info
2. Sends a MON transaction to the server wallet via `useSendTransaction`
3. Polls `/api/tx-status` every 2.5s until confirmed (up to 20 retries)
4. Retries `/api/query` with `X-PAYMENT: <txHash>` header (up to 4 attempts with backoff on 5xx)
5. Returns `{ queryGateway, result, error, isPending }`

#### `hooks/scaffold-eth/`
Standard Scaffold-ETH hooks: `useTargetNetwork`, `useDeployedContractInfo`, `useScaffoldReadContract`, `useScaffoldWriteContract`, `useScaffoldEventHistory`, etc.

---

### Utilities (`packages/nextjs/utils/`)

#### `utils/gateway/callHistory.ts`
localStorage-based call history. Stores up to 50 entries under key `x402_call_history`. Dispatches `x402_history_update` window event on write.

#### `utils/gateway/chain.ts`
Viem clients for Monad Testnet. Exports:
- `publicClient` — read-only
- `hashQuery(query)` — keccak256 of lowercased query
- `checkOnChainCache(hash)` — calls `checkCache()` on DataCache
- `storeResultOnChain(hash, query, data, seeder)` — calls `storeResult()` via backend wallet
- `getOnChainStats()` — calls `getStats()`
All functions use exponential backoff retry on 429/network errors.

#### `utils/gateway/detect.ts`
Regex-based intent detection. Classifies a natural language query as `price`, `weather`, or `country` and extracts the key parameter (token ID, city, country name).

#### `utils/gateway/fetchers.ts`
External API callers with retry:
- `fetchPrice(token)` → CoinGecko free API
- `fetchWeather(city)` → wttr.in JSON API
- `fetchCountry(country)` → REST Countries v3

#### `utils/gateway/x402.ts`
Payment verification against Monad Testnet. `verifyPayment(txHash, expectedPrice)` checks that the tx is confirmed, goes to the server wallet, and sends at least the minimum amount. `paymentRequiredResponse(isCached)` builds the 402 JSON body.

#### `utils/gateway/events.ts`
In-memory SSE client registry. `emitEvent()` broadcasts to all connected clients. Used by the `/api/events` route.

---

## Navigation Logic

All navigation is managed by `ScaffoldEthAppWithProviders.tsx` (the persistent shell) plus per-page logic:

| Trigger | Behavior |
|---------|----------|
| **Back arrow** (top-left) | `router.back()` |
| **"CacheMarket" logo** | → `/` if on Web2 page, → `/dashboard` if on Web3 |
| **"About us" button** (bottom-right) | → `/about` |
| **"Launch App" button** (landing) | → `/dashboard` |
| **"Cachemarket" title** (landing) | Resets `activeSection` to `null` (shows Live Stats) |
| **"How It Works" button** (landing) | Toggles `activeSection = "how-it-works"` inline |
| **"Dev Tools" button** (landing) | Toggles `activeSection = "dev-tools"` inline |
| **"Request API →"** (dashboard) | → `/market/result?cat=...&q=...` |
| **"Back to Market"** (result page) | → `/` |
| **Connect Wallet** (not connected, Web3) | → `/connect` |
| **Post-connect redirect** | `/connect` → `/` when wallet connects |

The landing page (`/`) and its content panels are **not** separate routes — "How It Works" and "Dev Tools" toggle inline content within the same page. The `/how-it-works` and `/dev-tools` routes exist as separate full pages (used for direct linking).

---

## State Management

| State | Mechanism | Scope |
|-------|-----------|-------|
| Target network | Zustand (`useGlobalState` in `services/store/store.ts`) | Global |
| Wallet connection | wagmi (`useAccount`, `useConnect`) | Global |
| Active landing section | `useState<ActiveSection>` in `app/page.tsx` | Local |
| Dashboard dropdown selections | `useState<Record<number, string>>` in `MarketContent` | Local |
| Query result / payment state | `useGatewayQuery` hook (useState internally) | Local |
| Call history | localStorage (`utils/gateway/callHistory.ts`) | Persistent |
| Theme (dark/light) | next-themes | Global |

---

## Web3 Integration

### Wallet Connection
- **RainbowKit** provides the connect modal and wallet list
- **wagmi** handles all transaction sending and account state
- Custom `/connect` page (`app/connect/page.tsx`) provides an alternative branded connect UI using raw wagmi `useConnect` + `useConnectors`
- `ScaffoldEthAppWithProviders` shows `RainbowKitCustomConnectButton` or a link to `/connect` depending on connection state

### Payment Flow (x402 Protocol)
The payment protocol is x402-inspired but implemented directly:

1. Frontend sends `POST /api/query` without headers → receives `402 Payment Required` with `{ price, cached, payTo, chainId }`
2. Frontend sends MON to `process.env.NEXT_PUBLIC_SERVER_WALLET` using `useSendTransaction`
3. Frontend polls `GET /api/tx-status?hash=<txHash>` until confirmed
4. Frontend resends `POST /api/query` with `X-PAYMENT: <txHash>` header
5. Backend verifies tx on-chain, returns data

### Configuration (`scaffold.config.ts`)
```ts
targetNetworks: [monadTestnet],  // chain ID 10143
pollingInterval: 1000,
walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
```

### Environment Variables (Next.js)
```
NEXT_PUBLIC_SERVER_WALLET=0x...      # Receives payments
NEXT_PUBLIC_MONAD_RPC_URL=...        # RPC endpoint
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...
BACKEND_PRIVATE_KEY=0x...            # Signs storeResult() txs
DATACACHE_ADDRESS=0x...              # DataCache contract address
```

---

## API Routes

All routes are under `packages/nextjs/app/api/`.

### `POST /api/query`
Main gateway route. Flow:
1. Parse `{ query }` from body
2. Run intent detection (`detectIntent`)
3. Hash query with `hashQuery` (keccak256)
4. Call `checkOnChainCache(hash)` on DataCache contract
5. If no `X-PAYMENT` header → return 402 with price info
6. Verify payment with `verifyPayment(txHash, expectedPrice)`
7. **Cache HIT** → return cached data, emit SSE event
8. **Cache MISS** → `fetchFromSource(type, param)`, `storeResultOnChain(...)`, return fresh data, emit SSE event

### `GET /api/stats`
Calls `getStats()` on DataCache contract. Returns `{ seeds, hits, queries }`.

### `GET /api/events`
Server-Sent Events stream. Broadcasts real-time gateway events (query, cache_hit) to connected clients. Uses heartbeat every 15s.

### `GET /api/tx-status?hash=<txHash>`
Calls `getTransactionReceipt` on Monad. Returns `{ confirmed: true/false }`.

---

## Smart Contract

**DataCache** — deployed on Monad Testnet

| Function | Type | Description |
|----------|------|-------------|
| `checkCache(bytes32 queryHash)` | view | Returns `(bool isCached, string data)` |
| `storeResult(bytes32, string query, string data, address seeder)` | write | Stores result, resets TTL |
| `getResult(bytes32 queryHash)` | view | Returns `(data, seeder, timestamp, hits)` |
| `getStats()` | view | Returns `(seeds, hits, queries)` |

- Default TTL: **60 seconds**
- Cache key: `keccak256(toLower(trim(query)))`
- Source: `packages/foundry/contracts/DataCache.sol`
- Deployment: `packages/foundry/deployments/10143.json`

---

## File Structure

```
monad-blitz-denver/
├── packages/
│   ├── nextjs/                          # Main app
│   │   ├── app/
│   │   │   ├── layout.tsx               # Root layout (fonts, providers)
│   │   │   ├── page.tsx                 # Landing page (/)
│   │   │   ├── not-found.tsx            # 404
│   │   │   ├── about/page.tsx           # Team page (/about)
│   │   │   ├── connect/page.tsx         # Wallet connect (/connect)
│   │   │   ├── dashboard/page.tsx       # Main app (/dashboard)
│   │   │   ├── how-it-works/page.tsx    # How It Works (/how-it-works)
│   │   │   ├── dev-tools/page.tsx       # Dev Tools (/dev-tools)
│   │   │   ├── market/result/page.tsx   # Query result + payment (/market/result)
│   │   │   ├── debug/                   # Scaffold-ETH debug contracts
│   │   │   ├── blockexplorer/           # Scaffold-ETH block explorer
│   │   │   └── api/
│   │   │       ├── query/route.ts       # POST /api/query — main gateway
│   │   │       ├── stats/route.ts       # GET /api/stats
│   │   │       ├── events/route.ts      # GET /api/events (SSE)
│   │   │       └── tx-status/route.ts   # GET /api/tx-status
│   │   ├── components/
│   │   │   ├── ScaffoldEthAppWithProviders.tsx  # App shell + global nav
│   │   │   ├── ThemeProvider.tsx                # next-themes wrapper
│   │   │   ├── MonadMascot.tsx                  # Animated SVG mascot
│   │   │   ├── TargetCursor.tsx                 # GSAP crosshair cursor
│   │   │   ├── content/
│   │   │   │   ├── HowItWorksContent.tsx        # Full How It Works content
│   │   │   │   └── DevToolsContent.tsx          # CLI + SDK demo content
│   │   │   ├── gateway/
│   │   │   │   └── MarketContent.tsx            # Dashboard data cards
│   │   │   ├── scaffold-eth/                    # Scaffold-ETH UI components
│   │   │   │   └── RainbowKitCustomConnectButton/
│   │   │   └── ui/
│   │   │       ├── card-hover-effect.tsx        # Animated card grid
│   │   │       ├── stateful-button.tsx          # Button with loading state
│   │   │       └── terminal.tsx                 # Typewriter terminal UI
│   │   ├── hooks/
│   │   │   ├── gateway/
│   │   │   │   └── useGatewayQuery.ts           # x402 payment + query hook
│   │   │   └── scaffold-eth/                    # Scaffold-ETH wagmi hooks
│   │   ├── utils/
│   │   │   ├── cn.ts                            # clsx + tailwind-merge
│   │   │   ├── gateway/
│   │   │   │   ├── callHistory.ts               # localStorage call log
│   │   │   │   ├── chain.ts                     # Viem client + contract helpers
│   │   │   │   ├── detect.ts                    # Intent detection (price/weather/country)
│   │   │   │   ├── events.ts                    # SSE client registry
│   │   │   │   ├── fetchers.ts                  # CoinGecko / wttr.in / REST Countries
│   │   │   │   └── x402.ts                      # Payment verification + 402 response
│   │   │   └── scaffold-eth/                    # Scaffold-ETH utilities
│   │   ├── services/
│   │   │   ├── store/store.ts                   # Zustand global state (target network)
│   │   │   └── web3/
│   │   │       ├── wagmiConfig.tsx              # Wagmi config (chains, connectors)
│   │   │       └── wagmiConnectors.tsx          # RainbowKit connector setup
│   │   ├── contracts/
│   │   │   └── deployedContracts.ts             # ABI + address registry
│   │   └── scaffold.config.ts                   # App config (network, API keys)
│   └── foundry/
│       ├── contracts/DataCache.sol              # On-chain cache contract
│       └── deployments/10143.json              # Monad testnet deployment
├── backend/                                    # Standalone Hono.js gateway (port 4402)
│   └── src/
│       ├── index.ts                            # Server entry + middleware
│       ├── chain.ts                            # Viem client + contract helpers
│       ├── events.ts                           # SSE broadcast
│       ├── middleware/x402.ts                  # x402 payment middleware
│       └── routes/query.ts                     # /api/query route handler
├── cli/                                        # cachemarket CLI tool
├── sdk/                                        # @cachemarket/sdk
└── package.json                               # Monorepo root (yarn workspaces)
```

---

## How to Run Locally

### Prerequisites
- Node.js >= 20.18.3
- Yarn 4.x (`corepack enable`)
- A funded Monad Testnet wallet (for `BACKEND_PRIVATE_KEY`)

### 1. Install dependencies

```bash
yarn install
```

### 2. Configure environment

Copy and fill in the Next.js env file:

```bash
cp packages/nextjs/.env.example packages/nextjs/.env.local
```

Required variables:
```env
NEXT_PUBLIC_SERVER_WALLET=0x...          # Wallet that receives payments
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...
BACKEND_PRIVATE_KEY=0x...                # Private key for signing storeResult() txs
DATACACHE_ADDRESS=0x...                  # Deployed DataCache contract address
```

The DataCache contract is already deployed on Monad Testnet — see `packages/foundry/deployments/10143.json` for the address.

### 3. Start the Next.js app

```bash
yarn start
# or
yarn workspace @se-2/nextjs dev
```

Visit `http://localhost:3000`

### 4. (Optional) Deploy your own DataCache contract

```bash
# Start local Foundry chain
yarn chain

# Deploy to local chain
yarn deploy

# Deploy to Monad Testnet
yarn foundry:deploy
```

### 5. (Optional) Run the standalone backend

The `backend/` directory is a standalone Hono.js server implementing the same gateway logic. It runs on port 4402.

```bash
cd backend
cp .env.example .env
# fill in .env (same vars as above)
npm install
npm run dev
```

### 6. Build for production

```bash
yarn next:build
```

Or deploy directly to Vercel:

```bash
yarn vercel
```

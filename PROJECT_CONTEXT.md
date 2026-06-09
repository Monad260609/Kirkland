# PROJECT_CONTEXT.md — Cachemarket

> Full project audit and context document. Written so another LLM can understand the entire codebase cold, without reading any source file.

---

## 1. Project Overview

### What the app does

**Cachemarket** is an on-chain data caching protocol built on **Monad Testnet**. It implements the **x402 payment protocol** (HTTP 402 Payment Required) to let anyone — humans or AI agents — query real-world data and pay per request on-chain.

The core mechanism: the **first person** to ask a question pays 0.001 MON and seeds the on-chain cache. **Everyone else** who asks the same question within 60 seconds reads from on-chain storage for 0.0001 MON (100x cheaper). After the TTL expires, the data goes stale and the cycle restarts.

### Who it is for

- Developers who want API data without managing API keys or subscriptions
- AI agents that need to pay for data programmatically
- Anyone who wants to query crypto prices, weather, or country info with just a wallet

### Current project name and branding

- **Name:** Cachemarket
- **Tagline:** "Cache once, read forever — on-chain."
- **Extended:** "x402 Universal Access Point — Data Freshness Marketplace"
- **Visual:** Dark theme with animated purple/blue shader gradient background, VT323 pixel font for headings

### Tech stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS 4.1, DaisyUI 5, Framer Motion 12 |
| **3D/Visual** | Three.js, @shadergradient/react, GSAP |
| **Wallet** | RainbowKit 2.2, wagmi 2.19, viem 2.39 |
| **State** | Zustand 5, TanStack React Query 5 |
| **Smart contracts** | Solidity ^0.8.20, Foundry (Forge, Cast, Anvil) |
| **Blockchain** | Monad Testnet (chain ID 10143, EVM-compatible) |
| **Backend (alt)** | Hono.js, Thirdweb x402, @hono/node-server |
| **CLI** | Commander.js, viem |
| **SDK** | TypeScript, viem |
| **External APIs** | CoinGecko (crypto prices), wttr.in (weather), REST Countries (country info), Groq LLM (AI fallback) |
| **Scaffold** | Scaffold-ETH 2 (base template) |

---

## 2. Architecture

### Full directory structure

```
monad-blitz-denver/
├── package.json                          # Yarn workspace root (workspaces: packages/*, cli, sdk)
├── .gitignore
├── README.md                             # Public-facing README
├── PROJECT_CONTEXT.md                    # This file
├── docs/
│   └── TECHNICAL_REFERENCE.md            # Full technical docs (original detailed README)
│
├── packages/
│   ├── foundry/                          # Smart contracts + deployment
│   │   ├── contracts/
│   │   │   └── DataCache.sol             # The only smart contract — on-chain cache
│   │   ├── script/
│   │   │   ├── Deploy.s.sol              # Main deployment entry
│   │   │   ├── DeployDataCache.s.sol     # DataCache-specific deploy
│   │   │   ├── DeployHelpers.s.sol       # Base deployment utilities
│   │   │   └── VerifyAll.s.sol           # Etherscan verification
│   │   ├── scripts-js/
│   │   │   ├── generateTsAbis.js         # Generates deployedContracts.ts from artifacts
│   │   │   ├── parseArgs.js              # CLI deploy argument parser
│   │   │   ├── checkAccountBalance.js    # Balance checker with QR code
│   │   │   ├── generateKeystore.js       # New wallet generation
│   │   │   ├── importAccount.js          # Private key import
│   │   │   ├── revealPK.js              # Reveal private key from keystore
│   │   │   ├── listKeystores.js         # Keystore selection UI
│   │   │   └── selectOrCreateKeystore.js # Keystore create/select flow
│   │   ├── deployments/
│   │   │   └── 10143.json               # Monad testnet deployment record
│   │   ├── foundry.toml                  # Forge config (src, out, RPC endpoints, formatting)
│   │   ├── remappings.txt               # @openzeppelin → lib/openzeppelin-contracts
│   │   ├── Makefile                     # Build targets (deploy, chain, verify, etc.)
│   │   ├── package.json                 # @se-2/foundry
│   │   ├── .env.example                 # ALCHEMY_API_KEY, ETHERSCAN_API_KEY
│   │   └── .prettier.json              # Formatting config
│   │
│   └── nextjs/                          # Main application
│       ├── app/
│       │   ├── layout.tsx               # Root layout — VT323 font, providers, metadata
│       │   ├── page.tsx                 # Landing page — hero, 3 CTAs, inline sections, live stats
│       │   ├── not-found.tsx            # 404 page
│       │   ├── about/page.tsx           # Team page — 3 members + DeVinci Blockchain
│       │   ├── connect/page.tsx         # Wallet connect — mascot, wagmi connectors
│       │   ├── dashboard/page.tsx       # Dashboard — MarketContent with 3 category cards
│       │   ├── how-it-works/page.tsx    # Standalone How It Works page
│       │   ├── dev-tools/page.tsx       # Standalone Dev Tools page
│       │   ├── market/result/page.tsx   # Query result + payment — 6-state UI
│       │   ├── debug/                   # Scaffold-ETH contract debugger
│       │   │   ├── page.tsx
│       │   │   └── _components/
│       │   │       ├── DebugContracts.tsx
│       │   │       └── ContractUI.tsx
│       │   ├── blockexplorer/           # Scaffold-ETH mini block explorer
│       │   │   ├── page.tsx
│       │   │   ├── layout.tsx
│       │   │   ├── address/[address]/page.tsx
│       │   │   ├── transaction/[txHash]/page.tsx
│       │   │   ├── transaction/_components/TransactionComp.tsx
│       │   │   └── _components/
│       │   │       ├── index.tsx
│       │   │       ├── SearchBar.tsx
│       │   │       ├── TransactionsTable.tsx
│       │   │       ├── TransactionHash.tsx
│       │   │       ├── PaginationButton.tsx
│       │   │       ├── BackButton.tsx
│       │   │       ├── ContractTabs.tsx
│       │   │       ├── AddressComponent.tsx
│       │   │       ├── AddressCodeTab.tsx
│       │   │       ├── AddressStorageTab.tsx
│       │   │       └── AddressLogsTab.tsx
│       │   └── api/
│       │       ├── query/route.ts       # POST — main gateway (402 + payment + data)
│       │       ├── stats/route.ts       # GET — on-chain statistics
│       │       ├── events/route.ts      # GET — SSE live event stream
│       │       └── tx-status/route.ts   # GET — transaction confirmation check
│       │
│       ├── components/
│       │   ├── ScaffoldEthAppWithProviders.tsx  # Global shell — providers, nav, wallet button
│       │   ├── ThemeProvider.tsx                # next-themes wrapper
│       │   ├── MonadMascot.tsx                  # Animated SVG with mouse-tracking eyes
│       │   ├── TargetCursor.tsx                 # GSAP crosshair cursor effect
│       │   ├── content/
│       │   │   ├── HowItWorksContent.tsx        # SVG diagrams, pricing, contract ref
│       │   │   └── DevToolsContent.tsx          # Terminal animation + SDK code block
│       │   ├── gateway/
│       │   │   └── MarketContent.tsx            # 3 data category cards with dropdowns
│       │   ├── scaffold-eth/
│       │   │   ├── index.tsx                    # Barrel export
│       │   │   ├── BlockieAvatar.tsx            # Address avatar from blo library
│       │   │   ├── Faucet.tsx                   # Local faucet modal (Hardhat only)
│       │   │   ├── FaucetButton.tsx             # Quick faucet button
│       │   │   └── RainbowKitCustomConnectButton/
│       │   │       ├── index.tsx                # Main connect button with balance/chain
│       │   │       ├── AddressInfoDropdown.tsx  # Address menu (copy, explorer, disconnect)
│       │   │       ├── AddressQRCodeModal.tsx   # QR code display
│       │   │       ├── NetworkOptions.tsx       # Network switch options
│       │   │       ├── RevealBurnerPKModal.tsx  # Burner wallet PK reveal (dev)
│       │   │       └── WrongNetworkDropdown.tsx # Wrong network warning
│       │   └── ui/
│       │       ├── card-hover-effect.tsx        # Animated card grid (HoverEffect)
│       │       ├── stateful-button.tsx          # Button with idle/loading/success states
│       │       └── terminal.tsx                 # Typewriter terminal component
│       │
│       ├── hooks/
│       │   ├── gateway/
│       │   │   └── useGatewayQuery.ts           # x402 payment + query hook (core business logic)
│       │   └── scaffold-eth/
│       │       ├── index.ts                     # Barrel export
│       │       ├── useTargetNetwork.ts          # Wallet chain sync with global state
│       │       ├── useSelectedNetwork.ts        # Network lookup by chain ID
│       │       ├── useDeployedContractInfo.ts   # Contract ABI/address loader
│       │       ├── useScaffoldContract.ts       # viem contract instance
│       │       ├── useScaffoldReadContract.ts   # Typed contract read
│       │       ├── useScaffoldWriteContract.ts  # Typed contract write with notifications
│       │       ├── useScaffoldWatchContractEvent.ts # Real-time event listener
│       │       ├── useScaffoldEventHistory.ts   # Historical event fetcher (deprecated)
│       │       ├── useTransactor.tsx             # Transaction executor with UI feedback
│       │       ├── useContractLogs.ts           # Contract log fetcher
│       │       ├── useCopyToClipboard.ts        # Clipboard utility
│       │       ├── useNetworkColor.ts           # Network color for UI
│       │       ├── useOutsideClick.ts           # Click-outside detector
│       │       └── useFetchBlocks.ts            # Block fetcher (Hardhat only)
│       │
│       ├── utils/
│       │   ├── cn.ts                            # clsx + tailwind-merge
│       │   ├── gateway/
│       │   │   ├── chain.ts                     # viem clients, hashQuery, checkOnChainCache, storeResultOnChain, getOnChainStats
│       │   │   ├── detect.ts                    # NLP intent detection (price/weather/country)
│       │   │   ├── fetchers.ts                  # CoinGecko, wttr.in, REST Countries callers
│       │   │   ├── x402.ts                      # Payment verification + 402 response builder
│       │   │   ├── events.ts                    # SSE client registry + broadcast
│       │   │   └── callHistory.ts               # localStorage call log (max 50)
│       │   └── scaffold-eth/
│       │       ├── index.ts                     # Barrel export
│       │       ├── networks.ts                  # Chain definitions, explorer links, RPC URLs
│       │       ├── notification.tsx             # react-hot-toast notification system
│       │       ├── contract.ts                  # Contract types, error parsing, simulation
│       │       ├── contractsData.ts             # useAllContracts hook
│       │       ├── common.ts                    # replacer, ZERO_ADDRESS, isENS
│       │       ├── block.ts                     # Transaction types
│       │       ├── decodeTxData.ts              # Transaction decoder
│       │       ├── getParsedError.ts            # Error message parser
│       │       ├── getMetadata.ts               # SEO metadata generator
│       │       └── fetchPriceFromUniswap.ts     # Native token price fetcher
│       │
│       ├── services/
│       │   ├── store/store.ts                   # Zustand global state (targetNetwork)
│       │   └── web3/
│       │       ├── wagmiConfig.tsx              # wagmi config (chains, RPC fallbacks, SSR)
│       │       └── wagmiConnectors.tsx          # RainbowKit wallet connectors
│       │
│       ├── contracts/
│       │   ├── deployedContracts.ts             # Auto-generated ABI + address (DataCache on 10143)
│       │   └── externalContracts.ts             # Empty template for external ABIs
│       │
│       ├── scaffold.config.ts                   # App config: monadTestnet, polling, WalletConnect
│       ├── next.config.ts                       # Next.js config: images, webpack fallbacks
│       ├── tailwind.config.ts                   # Tailwind config
│       ├── tsconfig.json                        # TypeScript config (~~/* alias)
│       ├── package.json                         # @se-2/nextjs dependencies
│       ├── .env.example                         # BACKEND_PRIVATE_KEY, DATACACHE_ADDRESS, etc.
│       └── public/
│           └── team/                            # Team member photos (sofiane.jpg, armand.jpg, noe.jpg)
│
├── backend/                                     # Standalone Hono.js gateway server
│   ├── src/
│   │   ├── index.ts                             # Server setup: CORS, pre-check, x402, routes
│   │   ├── chain.ts                             # viem clients + contract helpers (identical logic)
│   │   ├── events.ts                            # SSE broadcast (streamSSE)
│   │   ├── middleware/
│   │   │   └── x402.ts                          # Thirdweb x402 facilitator middleware
│   │   └── routes/
│   │       └── query.ts                         # Query handler with detectIntent + fetchExternalAPI
│   ├── package.json                             # x402-gateway (hono, thirdweb, viem, x402-hono)
│   ├── tsconfig.json
│   └── .env.example                             # BACKEND_PRIVATE_KEY, SERVER_WALLET, THIRDWEB_SECRET_KEY, etc.
│
├── cli/                                         # Command-line interface
│   ├── src/
│   │   ├── index.ts                             # Commander.js setup: `query` and `stats` commands
│   │   ├── wallet.ts                            # viem clients, contract helpers, getWalletClient
│   │   └── commands.ts                          # queryCommand + statsCommand with ANSI UI
│   ├── bin/
│   │   └── cachemarket                          # Shell script entry point
│   ├── package.json                             # @cachemarket/cli (commander, viem)
│   ├── tsconfig.json
│   └── .env.example                             # PRIVATE_KEY, GROQ_API_KEY
│
└── sdk/                                         # TypeScript SDK
    ├── src/
    │   ├── index.ts                             # Public exports (CacheMarket class + utilities)
    │   ├── client.ts                            # CacheMarket class: hashQuery, checkCache, query, getStats
    │   ├── types.ts                             # CacheMarketConfig, QueryResult, CacheStats, Intent, etc.
    │   ├── chain.ts                             # ChainClient class with retry logic
    │   ├── detect.ts                            # Intent detection (same logic as nextjs/backend)
    │   └── fetchers.ts                          # External API callers (CoinGecko, wttr.in, REST Countries, Groq)
    ├── test/
    │   └── test.ts                              # Integration tests (getStats, hashQuery, checkCache, query)
    ├── package.json                             # @cachemarket/sdk (viem)
    └── tsconfig.json
```

### How the frontend and backend communicate

**Primary path (Next.js API routes — used by default):**

```
Browser (React)
  │
  ├─ POST /api/query     → Query gateway (payment + data)
  ├─ GET  /api/stats      → On-chain statistics
  ├─ GET  /api/events     → SSE live event stream
  └─ GET  /api/tx-status  → Transaction confirmation check
```

The `useGatewayQuery` hook orchestrates the full payment flow:
1. Pre-check: `POST /api/query` without payment → receives 402 with cache status + price
2. Payment: Sends MON via `useSendTransaction` to `SERVER_WALLET`
3. Polling: `GET /api/tx-status?hash=...` every 2.5s (max 20 attempts = 50s)
4. Data: `POST /api/query` with `X-PAYMENT: <txHash>` header → receives data

**Alternative path (standalone backend — port 4402):**

The `backend/` directory is an independent Hono.js server with the same gateway logic. It uses Thirdweb's x402-hono middleware for native x402 payment verification (instead of the manual verification in the Next.js routes). Same routes: `POST /api/query`, `GET /api/events`, `GET /api/stats`, `GET /health`.

### How the blockchain layer integrates

**Smart Contract:** `DataCache.sol` deployed on Monad Testnet at `0xF82441bDCAD5a0BB910798cC3859366cAF2AE413`

All components (frontend, backend, CLI, SDK) share identical contract interaction patterns:

1. **Hash query:** `keccak256(query.toLowerCase().trim())` → bytes32 cache key
2. **Check cache:** `checkCache(queryHash)` → `(bool isCached, string data)` (view, free)
3. **Store result:** `storeResult(queryHash, query, data, seeder)` → writes data on-chain (owner-only, costs gas)
4. **Record hits:** `recordHits(queryHash, count)` → increments hit counter (owner-only)
5. **Get stats:** `getStats()` → `(seeds, hits, queries)` (view, free)

**Chain config:**
- Network: Monad Testnet (chain ID 10143)
- RPC: `https://testnet-rpc.monad.xyz`
- Explorer: `https://testnet.monadexplorer.com`
- Currency: MON
- TTL: 60 seconds (contract default)

**Retry logic:** All on-chain calls use exponential backoff (5-6 retries, 800ms base delay) to handle 429 rate limiting from the RPC.

### External APIs and how they connect

| API | Usage | Auth | Called from |
|-----|-------|------|------------|
| CoinGecko | Crypto prices (ETH, BTC, SOL, etc.) | None (free tier) | `fetchers.ts` in nextjs, backend, CLI, SDK |
| wttr.in | Weather data (US units: °F, mph) | None | `fetchers.ts` in nextjs, backend, CLI, SDK |
| REST Countries v3 | Country info (capital, population, etc.) | None | `fetchers.ts` in nextjs, CLI, SDK |
| Groq (Llama 3.3 70B) | AI fallback for unknown queries | API key (optional) | backend `routes/query.ts`, CLI `commands.ts`, SDK `fetchers.ts` |

All fetchers have retry logic (3 retries, 500ms base delay, retries on 5xx and 429).

---

## 3. Roles & Responsibilities

Based on the `/about` page and git history, the team is:

### Dev A — Sofiane BEN TALEB (Full-Stack & Smart Contracts)
- **GitHub:** [gamween](https://github.com/gamween)
- **Owns:**
  - Smart contract (`DataCache.sol`) + deployment scripts
  - Next.js API routes (`/api/query`, `/api/stats`, `/api/events`, `/api/tx-status`)
  - Gateway utilities (`chain.ts`, `detect.ts`, `fetchers.ts`, `x402.ts`, `events.ts`, `callHistory.ts`)
  - `useGatewayQuery` hook (core payment + query logic)
  - Backend (Hono.js server + x402 middleware)
  - CLI tool
  - SDK
  - Scaffold-ETH configuration and deployment infrastructure
- **Boundary files:** `ScaffoldEthAppWithProviders.tsx` (shared with Dev C for layout/nav), `scaffold.config.ts`

### Dev B — Armand SECHON (Backend & Infrastructure)
- **GitHub:** [STOOOKEEE](https://github.com/STOOOKEEE)
- **Owns:**
  - Backend infrastructure and deployment pipeline
  - Environment configuration and server setup
  - Hono.js server middleware chain
  - x402 payment middleware integration (Thirdweb facilitator)
  - SSE event broadcasting system
  - RPC retry logic and rate-limit handling
- **Boundary files:** `backend/src/index.ts` (shared with Dev A), `.env` configuration

### Dev C — Noe WALES (Frontend & Design)
- **GitHub:** [CHAAIISE](https://github.com/CHAAIISE)
- **Owns:**
  - All page components (`page.tsx`, `about/page.tsx`, `connect/page.tsx`, `dashboard/page.tsx`, `how-it-works/page.tsx`, `dev-tools/page.tsx`, `market/result/page.tsx`)
  - UI components (`MonadMascot.tsx`, `TargetCursor.tsx`, `terminal.tsx`, `card-hover-effect.tsx`, `stateful-button.tsx`)
  - Content components (`HowItWorksContent.tsx`, `DevToolsContent.tsx`, `MarketContent.tsx`)
  - Visual design: shader gradient background, VT323 font, dark theme, animations
  - `ScaffoldEthAppWithProviders.tsx` (layout, navigation logic, provider wiring)
  - `RainbowKitCustomConnectButton/` components
- **Boundary files:** `market/result/page.tsx` (calls `useGatewayQuery` from Dev A), `ScaffoldEthAppWithProviders.tsx` (wraps providers from Dev A's web3 services)

### Shared/boundary files

| File | Shared between | Notes |
|------|---------------|-------|
| `ScaffoldEthAppWithProviders.tsx` | Dev A + Dev C | Dev A set up providers, Dev C built the UI shell |
| `market/result/page.tsx` | Dev A + Dev C | Dev C built the UI, Dev A built `useGatewayQuery` hook it depends on |
| `scaffold.config.ts` | Dev A + Dev B | Dev A wrote chain config, Dev B manages env vars |
| `wagmiConfig.tsx` / `wagmiConnectors.tsx` | Dev A + Dev C | Dev A configured, Dev C uses via `connect/page.tsx` |
| `deployedContracts.ts` | Auto-generated | Generated by `generateTsAbis.js` from Dev A's deployment |

---

## 4. Current State

### Fully implemented and working

- **Smart contract** (`DataCache.sol`): Deployed and operational on Monad Testnet at `0xF82441bDCAD5a0BB910798cC3859366cAF2AE413`
- **Next.js API routes**: All 4 routes functional (`/api/query`, `/api/stats`, `/api/events`, `/api/tx-status`)
- **Landing page** (`/`): Hero, 3 CTA buttons, inline How It Works and Dev Tools sections, live on-chain stats
- **Dashboard** (`/dashboard`): 3 data category cards with dropdown selectors
- **Market result** (`/market/result`): Full 6-state payment flow (pre-check → pay → confirm → result)
- **About page** (`/about`): Team cards with photos, roles, GitHub/LinkedIn links
- **Connect page** (`/connect`): Custom wallet UI with MonadMascot, wagmi connectors
- **How It Works** (`/how-it-works`): SVG diagrams, pricing table, data sources, contract reference
- **Dev Tools** (`/dev-tools`): Animated terminal demo, SDK code example
- **Gateway utilities**: Intent detection, external API fetchers (CoinGecko, wttr.in, REST Countries), payment verification, SSE events, call history
- **Wallet integration**: RainbowKit connect, MetaMask/WalletConnect/Coinbase support, network switching
- **Backend (Hono.js)**: Standalone server with x402 middleware, query processing, SSE
- **CLI**: `cachemarket query "..."` and `cachemarket stats` commands with ANSI-colored output
- **SDK**: `CacheMarket` class with `hashQuery`, `checkCache`, `query`, `getStats` methods + test suite
- **Scaffold-ETH tools**: Debug contracts page, block explorer (Hardhat only)
- **Unit conversion**: All weather data in US mode (Fahrenheit, mph)
- **English-only UI**: All text in English

### Partially implemented

- **Groq AI fallback**: Working in backend and CLI when `GROQ_API_KEY` is set, but not exposed in the Next.js frontend query flow (the `detectIntent` in the frontend doesn't have an "ai" type — it defaults to crypto price for unknown queries)
- **Country queries**: Working in CLI and SDK, but the Next.js frontend `detect.ts` doesn't have explicit country regex patterns — it relies on the backend to detect them
- **SSE live feed**: Broadcasting events works, but the frontend doesn't currently have a visible SSE consumer component on the dashboard (events are emitted but not displayed in real-time on any page)
- **Call history**: `callHistory.ts` stores up to 50 entries in localStorage and dispatches events, but no UI component currently reads or displays this history

### Missing or not yet started

- **Production deployment**: No live URL configured (Vercel deployment supported but not done)
- **Mobile responsiveness**: The `TargetCursor` component detects mobile and hides itself, but overall mobile UX is not optimized
- **Rate limiting on API routes**: No server-side rate limiting (relies on Monad RPC rate limits and payment requirements)
- **Error recovery UI**: If payment succeeds but the query fails after all retries, there's no refund mechanism
- **Mainnet deployment**: Everything targets Monad Testnet only
- **Unit tests**: No frontend tests; SDK has integration tests only
- **CI/CD pipeline**: No automated testing or deployment pipeline

### Known bugs or issues

- **wttr.in rate limiting**: The weather API occasionally returns 429 errors. Retry logic (3 attempts with backoff) handles most cases, but rapid successive queries for different cities can still fail
- **RPC 429 errors**: Monad Testnet RPC has strict rate limits. All on-chain calls use retry with exponential backoff, but under heavy load, operations can still timeout after max retries
- **Nonce issues**: If multiple `storeResult` transactions are sent in quick succession from the backend wallet, nonce conflicts can occur. The retry logic handles this but can cause delays
- **Pre-commit hooks**: Husky + lint-staged is configured but may block commits on unrelated formatting issues
- **Deleted components in git**: Several components are deleted in the current git status (`Footer.tsx`, `Header.tsx`, `SwitchTheme.tsx`, `BuidlGuidlLogo.tsx`, `HowItWorksContent.tsx` in gateway/, `MyCallContent.tsx`, `floating-dock.tsx`) — these were Scaffold-ETH defaults replaced by custom implementations

---

## 5. Dev C Specific Context

### Full list of Dev C's tasks

| Task | Status | Notes |
|------|--------|-------|
| Landing page (`/`) with hero, CTAs, live stats | Done | Shader gradient, Framer Motion animations |
| Inline How It Works section | Done | Toggles on landing page |
| Inline Dev Tools section | Done | Toggles on landing page |
| About page (`/about`) with team cards | Done | Photos, roles, social links |
| Connect page (`/connect`) with MonadMascot | Done | Custom wallet UI, GSAP cursor |
| Dashboard page (`/dashboard`) with MarketContent | Done | 3 category cards with dropdowns |
| Market result page (`/market/result`) | Done | 6-state UI: pre-check → pay → result |
| How It Works standalone page | Done | SVG diagrams, pricing, contract ref |
| Dev Tools standalone page | Done | Terminal animation, SDK code block |
| 404 page | Done | Simple centered layout |
| Global layout and navigation | Done | `ScaffoldEthAppWithProviders.tsx` |
| Custom wallet connect button | Done | `RainbowKitCustomConnectButton/` components |
| MonadMascot SVG component | Done | Mouse-tracking eye movement |
| TargetCursor GSAP component | Done | Crosshair cursor with parallax on hover |
| Terminal typewriter component | Done | Line-by-line typing with color coding |
| Card hover effect component | Done | AnimatePresence background on hover |
| Stateful button component | Done | idle → loading → success states |
| Remove Scaffold-ETH defaults | Done | Deleted Footer, Header, SwitchTheme, BuidlGuidlLogo, floating-dock |
| Dark theme + purple/blue gradient | Done | Consistent across all pages |
| VT323 pixel font for headings | Done | Loaded in `layout.tsx` |
| Call history display UI | Not started | `callHistory.ts` exists but no consumer component |
| SSE live feed dashboard widget | Not started | `events.ts` broadcasts but no listener in UI |
| Mobile layout optimization | Not started | Desktop-first currently |

### Files Dev C owns

```
packages/nextjs/app/page.tsx
packages/nextjs/app/not-found.tsx
packages/nextjs/app/about/page.tsx
packages/nextjs/app/connect/page.tsx
packages/nextjs/app/dashboard/page.tsx
packages/nextjs/app/how-it-works/page.tsx
packages/nextjs/app/dev-tools/page.tsx
packages/nextjs/app/market/result/page.tsx
packages/nextjs/components/ScaffoldEthAppWithProviders.tsx
packages/nextjs/components/MonadMascot.tsx
packages/nextjs/components/TargetCursor.tsx
packages/nextjs/components/content/HowItWorksContent.tsx
packages/nextjs/components/content/DevToolsContent.tsx
packages/nextjs/components/gateway/MarketContent.tsx
packages/nextjs/components/ui/card-hover-effect.tsx
packages/nextjs/components/ui/stateful-button.tsx
packages/nextjs/components/ui/terminal.tsx
packages/nextjs/components/scaffold-eth/RainbowKitCustomConnectButton/ (all files)
```

### Files Dev C shares with Dev A or Dev B

| File | Shared with | How |
|------|------------|-----|
| `ScaffoldEthAppWithProviders.tsx` | Dev A | Dev A's providers (wagmi, RainbowKit), Dev C's layout/nav |
| `market/result/page.tsx` | Dev A | Calls Dev A's `useGatewayQuery` hook |
| `dashboard/page.tsx` | Dev A | Renders `MarketContent` which links to Dev A's API |
| `app/layout.tsx` | Dev A | Dev C owns visual, Dev A owns provider chain |

### Dev C's next steps

1. **Build a call history component**: Read from `callHistory.ts` and display recent queries on the dashboard
2. **Add SSE live feed widget**: Connect to `/api/events` and show real-time cache seeds/hits
3. **Mobile responsive pass**: Ensure all pages work on mobile (the TargetCursor already hides on mobile)
4. **Polish result page**: Add transitions between the 6 states, improve error UX

---

## 6. Key Design Decisions

### Architectural decisions

| Decision | Why |
|----------|-----|
| **Monorepo with Yarn workspaces** | Shares types and contract addresses across frontend, backend, CLI, SDK |
| **Scaffold-ETH 2 as base** | Provides wagmi/RainbowKit boilerplate, debug tools, block explorer out of the box |
| **Next.js API routes as primary gateway** | No separate server needed for deployment; Vercel-compatible |
| **Standalone Hono backend as alternative** | For headless/agent use cases where Next.js isn't needed |
| **x402-inspired payment flow** | Uses HTTP 402 semantics but with direct MON transfers (not stablecoins) |
| **Thirdweb x402 facilitator (backend only)** | Native x402 standard compliance in the standalone backend |
| **Manual payment verification (Next.js)** | Avoids Thirdweb dependency in the main app; verifies tx directly via RPC |
| **On-chain caching** | Data stored in smart contract, not a database — fully transparent and auditable |
| **60-second TTL** | Short enough that data stays fresh, long enough for multiple readers to benefit |
| **keccak256 query hashing** | Deterministic cache keys — identical questions always resolve to the same entry |
| **Intent detection via regex** | Simple, fast, no ML dependencies — works for the 3 supported categories |
| **Free external APIs only** | CoinGecko, wttr.in, REST Countries all require no API keys |
| **Zustand for global state** | Lightweight alternative to Redux; only stores `targetNetwork` |
| **viem over ethers.js** | Type-safe, tree-shakeable, modern Ethereum library |

### Design language rules

- **Dark theme always**: All pages use dark backgrounds (shader gradient or dark containers)
- **Color palette**: Purple (#8d7dca, #606080), black (#212121, #1a1a2e), white/white-alpha for text
- **Font**: VT323 (Google Fonts, pixel/monospace aesthetic) for headings; system sans-serif for body
- **Shader gradient**: Same `ShaderGradient` config on every page (purple/blue animated plane)
- **Animations**: Framer Motion for page transitions and reveals; GSAP for cursor effects
- **Neutral grays**: `text-white/40`, `text-white/60`, `text-white/70`, `text-white/80` for text hierarchy
- **Glass-morphism**: `bg-white/5`, `bg-white/10`, `border-white/10`, `backdrop-blur-sm` on cards
- **English only**: All UI text in English
- **Imperial units**: Weather in Fahrenheit and mph (US mode)
- **No emojis in UI** (except country flags from REST Countries data)

### Component libraries used

| Library | Where used |
|---------|-----------|
| **Framer Motion** | All page animations (fade, slide), AnimatePresence in cards, motion elements |
| **GSAP** | `TargetCursor.tsx` — crosshair cursor with parallax, scaling on click, corner tracking |
| **@shadergradient/react** | Background on every page — animated 3D shader gradient (via Three.js) |
| **DaisyUI** | Scaffold-ETH components (dropdowns, modals, buttons, tooltips) — NOT used in custom pages |
| **Tabler Icons** | Navigation icons, social icons, category icons |
| **Heroicons** | Scaffold-ETH components (arrows, bank, checkmark, etc.) |
| **react-hot-toast** | Toast notifications (success, error, loading) |
| **RainbowKit** | Wallet connection modal and button (used via custom wrapper) |

---

## 7. Onboarding Notes for Another LLM

### What to be careful about

1. **`ScaffoldEthAppWithProviders.tsx` is critical**: This file is the app shell. It wraps all providers and controls navigation (back button, logo link, wallet button, about button). Changes here affect every page. It determines which pages are "Web2" (no wallet needed) vs "Web3" based on `WEB2_PATHS`.

2. **Duplicate logic across packages**: Intent detection (`detect.ts`) and fetchers (`fetchers.ts`) exist in 4 places: `packages/nextjs/utils/gateway/`, `backend/src/routes/query.ts`, `cli/src/commands.ts`, `sdk/src/`. They are similar but not identical. The backend and CLI have inline implementations rather than importing from a shared package.

3. **Two different payment flows**: The Next.js frontend uses manual payment verification (`x402.ts` — reads tx receipt from RPC). The Hono backend uses Thirdweb's x402 facilitator middleware. They serve the same purpose but work differently.

4. **RPC rate limiting is aggressive**: Monad Testnet RPC returns 429 frequently. All chain calls use retry with exponential backoff. If you add new on-chain calls, always use the `withRetry` pattern from `chain.ts`.

5. **Environment variables differ by package**: Each package has its own `.env.example`. The variable names overlap but aren't identical (e.g., `BACKEND_PRIVATE_KEY` vs `PRIVATE_KEY` in CLI). Check the specific `.env.example` for the package you're working on.

6. **`deployedContracts.ts` is auto-generated**: Don't edit it manually. It's created by `scripts-js/generateTsAbis.js` from Foundry deployment artifacts. If the contract changes, redeploy and regenerate.

7. **The landing page uses inline sections, not routes**: Clicking "How It Works" or "Dev Tools" on the landing page toggles inline content (`activeSection` state), NOT navigation. The `/how-it-works` and `/dev-tools` routes exist separately for direct linking.

8. **Git status shows deleted files**: `Footer.tsx`, `Header.tsx`, `SwitchTheme.tsx`, `BuidlGuidlLogo.tsx`, `floating-dock.tsx`, `HowItWorksContent.tsx` (in gateway/), `MyCallContent.tsx` — these are intentionally deleted Scaffold-ETH defaults. Don't recreate them.

9. **Weather is in US units**: All weather data uses Fahrenheit and mph. This was an explicit design decision (commit `a30f9b1`).

### What must never be changed

- **Smart contract address** (`0xF82441bDCAD5a0BB910798cC3859366cAF2AE413`): Hardcoded in 4 packages
- **Query hashing logic**: `keccak256(query.toLowerCase().trim())` — must be identical everywhere or cache lookups break
- **Payment prices**: 0.001 MON (miss) / 0.0001 MON (hit) — hardcoded in `x402.ts` and `useGatewayQuery.ts`
- **Chain ID**: 10143 (Monad Testnet) — referenced across all config files
- **API route paths**: `/api/query`, `/api/stats`, `/api/events`, `/api/tx-status` — the frontend depends on these exact paths
- **SERVER_WALLET address**: Used for payment verification — if changed, all pending payments break
- **Contract ABI**: Must match the deployed contract — changing without redeployment causes runtime errors
- **VT323 font**: Loaded in `layout.tsx`, used across all pages via CSS variable

### Conventions to follow

1. **Styling**: Use Tailwind utility classes. For custom pages use `bg-white/X`, `border-white/X`, `text-white/X` glass-morphism pattern. Don't use DaisyUI classes in custom components (DaisyUI is only for Scaffold-ETH inherited components).

2. **Animations**: Use Framer Motion `motion` components for entrance/exit animations. Use `initial={{ opacity: 0, y: 20 }}` and `animate={{ opacity: 1, y: 0 }}` as the default pattern. Stagger with `transition={{ delay: N }}`.

3. **Shader gradient**: Every page needs the same `ShaderGradientCanvas` + `ShaderGradient` block. Copy from any existing page (e.g., `about/page.tsx`).

4. **"use client"**: All page components that use hooks must have `"use client"` at the top. API routes do not.

5. **Path aliases**: Use `~~/` prefix for imports from project root (configured in `tsconfig.json`).

6. **Icons**: Use `@tabler/icons-react` for new icons. Scaffold-ETH components use `@heroicons/react`.

7. **Error handling**: For on-chain calls, always use try/catch with the retry pattern. Show errors via `notification.error()` or inline error state.

8. **Type safety**: Use viem types (`Address`, `Hash`, `Hex`) for blockchain data. Use explicit interfaces for component props.

---

## Open Questions

1. **Is the standalone Hono backend (`backend/`) actively used in production, or is it only for development/alternative use?** The Next.js API routes seem to be the primary gateway based on the frontend code.

2. **Is Groq AI integration intentionally excluded from the Next.js frontend?** The frontend's `detect.ts` doesn't have an "ai" type — unknown queries default to crypto price. The backend and CLI do support AI queries.

3. **What happened to `MyCallContent.tsx` and `HowItWorksContent.tsx` in `gateway/`?** These files are deleted in git status. Were they replaced by the files in `content/`?

4. **Is there a production deployment target?** The README mentions Vercel support but no live URL is configured.

5. **Who is the contract owner?** The `BACKEND_PRIVATE_KEY` is the key that deployed and owns the DataCache contract. Is this shared across the team or held by one person?

6. **Should the call history and SSE live feed features be built into the dashboard?** The utilities exist (`callHistory.ts`, `events.ts`) but no UI consumes them.

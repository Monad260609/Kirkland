# x402 Universal Access Point — Roadmap Hackathon Monad Blitz

> Un wrapper API ou la fraicheur de la donnee a un prix.
> Tu veux la data en premier ? Tu paies cher. Tu arrives apres ? C'est quasi gratuit.
> Un CDN de donnees payant ou le premier finance le cache pour tout le reseau.

---

## Le Concept en 30 Secondes

```
10h00:00 — Agent A query "ETH price"
           → Donnee pas dans le contrat
           → PAYE CHER ($0.01) ← prix de la fraicheur
           → Backend fetch CoinGecko → "2847.32"
           → Resultat ECRIT ON-CHAIN
           → Agent A recoit la data en premier

10h00:05 — Agent B query "ETH price"
           → Donnee EXISTE dans le contrat
           → PAYE PEU ($0.0001) ← juste du gas
           → Lecture directe du contrat
           → Pas besoin d'appeler CoinGecko

10h01:00 — TTL expire (60s)
           → Donnee marquee comme perimee
           → Le prochain paye a nouveau le prix fort
           → Nouveau cycle
```

**C'est un marche de la fraicheur** : les bots de trading paient cher pour etre premiers, les dashboards paient rien parce que quelqu'un a deja paye.

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────────┐
│   CLI        │     │  Dashboard   │     │   Agent Scripts      │
│   x402q      │     │  Next.js     │     │   (query en boucle)  │
└──────┬───────┘     └──────┬───────┘     └──────────┬───────────┘
       │                    │                        │
       └────────────────────┼────────────────────────┘
                            │
                    SDK — client.ts
                  createGatewayClient()
                            │
                            │ HTTP + x-payment header
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                 NEXT.JS API ROUTES (app/api/)                    │
│                                                                  │
│  1. Recoit la query ("ETH price")                                │
│  2. Hash la query → bytes32                                      │
│  3. Appelle le contrat : checkCache(hash) ?                      │
│                                                                  │
│     ┌─── OUI (pas en cache ou TTL expire) ──────────────────┐   │
│     │                                                        │   │
│     │  → Exige paiement x402 CHER ($0.01)                    │   │
│     │  → Fetch l'API externe (CoinGecko / wttr.in / Groq)   │   │
│     │  → Appelle contrat : storeResult(hash, data)           │   │
│     │  → Retourne la data au client                          │   │
│     │                                                        │   │
│     └────────────────────────────────────────────────────────┘   │
│                                                                  │
│     ┌─── NON (donnee fraiche en cache on-chain) ────────────┐   │
│     │                                                        │   │
│     │  → Paiement x402 PAS CHER ($0.0001) ou gratuit        │   │
│     │  → Appelle contrat : getResult(hash)                   │   │
│     │  → Retourne la data au client                          │   │
│     │  → Pas d'appel API externe                             │   │
│     │                                                        │   │
│     └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  4. Emet un event SSE vers le Dashboard                          │
│                                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      MONAD TESTNET                               │
│                                                                  │
│  ┌──────────────────────────────────────────┐                    │
│  │         DataCache.sol                    │                    │
│  │                                          │                    │
│  │  mapping(bytes32 => CacheEntry) entries   │                    │
│  │                                          │                    │
│  │  struct CacheEntry {                     │                    │
│  │      string data;       // "2847.32"     │                    │
│  │      address seeder;    // qui a paye    │                    │
│  │      uint256 timestamp; // quand         │                    │
│  │      uint256 hits;      // nb de reads   │                    │
│  │      bool exists;       // existe ?      │                    │
│  │  }                                       │                    │
│  │                                          │                    │
│  │  storeResult(hash, data) → write         │                    │
│  │  getResult(hash) → read (view, no tx)    │                    │
│  │  isExpired(hash, ttl) → bool             │                    │
│  │                                          │                    │
│  └──────────────────────────────────────────┘                    │
│                                                                  │
│  + Transactions x402 (via thirdweb facilitator)                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Structure du Projet (Scaffold-ETH 2)

```
monad-blitz-denver/
├── packages/
│   ├── foundry/                              # ← SMART CONTRACTS
│   │   ├── contracts/
│   │   │   └── DataCache.sol                 # Cache on-chain avec TTL et seeder tracking
│   │   ├── script/
│   │   │   ├── Deploy.s.sol                  # Orchestrateur (existe deja)
│   │   │   ├── DeployHelpers.s.sol           # Helpers scaffold (existe deja)
│   │   │   └── DeployDataCache.s.sol         # Deploy notre contrat
│   │   ├── test/
│   │   │   └── DataCache.t.sol
│   │   └── foundry.toml
│   │
│   └── nextjs/                               # ← FRONTEND + API ROUTES
│       ├── app/
│       │   ├── page.tsx                      # Landing page
│       │   ├── dashboard/
│       │   │   └── page.tsx                  # Dashboard principal
│       │   └── api/
│       │       ├── query/route.ts            # POST /api/query (route universelle)
│       │       ├── stats/route.ts            # GET /api/stats (stats on-chain)
│       │       └── events/route.ts           # GET /api/events (SSE live feed)
│       ├── components/
│       │   ├── gateway/
│       │   │   ├── SearchBar.tsx
│       │   │   ├── ResultCard.tsx
│       │   │   ├── LiveFeed.tsx
│       │   │   └── StatsBar.tsx
│       │   └── ...                           # Composants scaffold existants
│       ├── hooks/
│       │   └── gateway/
│       │       ├── useGateway.ts
│       │       └── useLiveFeed.ts
│       ├── utils/
│       │   └── gateway/
│       │       └── chain.ts                  # Client viem → interagir avec DataCache
│       ├── contracts/
│       │   └── deployedContracts.ts          # Auto-genere par scaffold apres deploy
│       └── scaffold.config.ts                # Deja configure pour Monad (chain id 143)
│
├── agents/
│   └── swarm.ts                              # Swarm d'agents pour la demo
│
├── ROADMAP-v3.md
└── package.json                              # Monorepo yarn workspaces
```

---

## PHASE 0 — Setup `[0:00 → 0:20]`

### 0:00 → 0:10 — Comptes et cles

**Objectif** : avoir toutes les cles pretes.

1. **Thirdweb Dashboard** → https://thirdweb.com/dashboard
   - Creer un projet "x402-gateway"
   - Settings → API Keys → copier **Client ID** + **Secret Key**
   - Wallets → Server Wallets → copier l'adresse du **Server Wallet**

2. **Monad Faucet** → https://faucet.monad.xyz
   - Envoyer du MON au Server Wallet (gas pour les tx)
   - Envoyer du MON au deployer scaffold-eth (voir `yarn account`)

3. **Groq** → https://console.groq.com
   - Generer une API key

4. **Creer `.env` dans `packages/foundry/`** (y a deja un `.env.example`) :
   ```env
   ETH_KEYSTORE_ACCOUNT=scaffold-eth-default
   ```

5. **Creer `.env.local` dans `packages/nextjs/`** :
   ```env
   # Thirdweb
   THIRDWEB_SECRET_KEY=sk_xxx
   NEXT_PUBLIC_THIRDWEB_CLIENT_ID=xxx
   SERVER_WALLET=0x...

   # Contrat (rempli apres deploy)
   DATACACHE_ADDRESS=

   # APIs
   GROQ_API_KEY=gsk_xxx

   # Wallet backend (pour ecrire dans le contrat depuis les API routes)
   BACKEND_PRIVATE_KEY=0x...
   ```

### 0:10 → 0:20 — Verifier le setup

```bash
# Le projet est deja init, on verifie que tout marche
yarn install
yarn chain          # lance anvil local pour tester
yarn compile        # verifie que foundry compile

# Dans un autre terminal
yarn start          # lance le frontend Next.js
```

**Checkpoint** : le scaffold tourne, le site s'affiche avec le shader gradient.

---

## PHASE 1 — Smart Contract `[0:20 → 1:00]`

On fait **un seul contrat** : `DataCache.sol`. Pas d'AgentPool (on coupe pour gagner du temps, on pourra l'ajouter plus tard si besoin).

### 0:20 → 0:45 — DataCache.sol

**Objectif** : un contrat qui stocke des resultats de query on-chain, avec un TTL et un seeder.

#### Fichier `packages/foundry/contracts/DataCache.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DataCache {

    // ── Structure d'une entree en cache ───────────────────────
    struct CacheEntry {
        string data;          // Le resultat (ex: "2847.32")
        string query;         // La query originale (ex: "ETH price")
        address seeder;       // Qui a paye le fetch en premier
        uint256 timestamp;    // Quand la donnee a ete ecrite
        uint256 hits;         // Combien de fois lue depuis
        bool exists;          // Existe dans le cache
    }

    // ── Storage ───────────────────────────────────────────────
    mapping(bytes32 => CacheEntry) public entries;

    // Compteurs globaux pour le dashboard
    uint256 public totalSeeds;
    uint256 public totalHits;
    uint256 public totalQueries;

    // TTL par defaut : 60 secondes
    uint256 public defaultTTL = 60;

    // Owner (le backend)
    address public owner;

    // ── Events ────────────────────────────────────────────────
    event DataSeeded(
        bytes32 indexed queryHash,
        string query,
        address indexed seeder,
        string data,
        uint256 timestamp
    );

    event CacheHit(
        bytes32 indexed queryHash,
        address indexed reader,
        uint256 totalHits
    );

    // ── Modifiers ─────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ── Constructor ───────────────────────────────────────────
    constructor(address _owner) {
        owner = _owner;
    }

    // ── Fonctions principales ─────────────────────────────────

    /// @notice Verifie si une query est en cache ET pas expiree
    function checkCache(bytes32 queryHash)
        external
        view
        returns (bool isCached, string memory data)
    {
        CacheEntry storage entry = entries[queryHash];

        if (!entry.exists) {
            return (false, "");
        }

        if (block.timestamp - entry.timestamp > defaultTTL) {
            return (false, "");
        }

        return (true, entry.data);
    }

    /// @notice Stocke un nouveau resultat (appele quand cache miss)
    function storeResult(
        bytes32 queryHash,
        string calldata query,
        string calldata data,
        address seeder
    ) external onlyOwner {
        CacheEntry storage entry = entries[queryHash];

        entry.data = data;
        entry.query = query;
        entry.seeder = seeder;
        entry.timestamp = block.timestamp;
        entry.hits = 0;
        entry.exists = true;

        totalSeeds++;
        totalQueries++;

        emit DataSeeded(queryHash, query, seeder, data, block.timestamp);
    }

    /// @notice Lecture cache — view only, pas de tx, pas de gas pour le reader
    /// Les hits sont trackes off-chain par le backend pour eviter un write on-chain inutile
    function getResult(bytes32 queryHash)
        external
        view
        returns (string memory data, address seeder, uint256 timestamp, uint256 hits)
    {
        CacheEntry storage entry = entries[queryHash];
        require(entry.exists, "Entry does not exist");
        return (entry.data, entry.seeder, entry.timestamp, entry.hits);
    }

    /// @notice Increment hits — appele par le backend quand il veut (batch, async, etc.)
    function recordHits(bytes32 queryHash, uint256 count) external onlyOwner {
        entries[queryHash].hits += count;
        totalHits += count;
        totalQueries += count;

        emit CacheHit(queryHash, address(0), entries[queryHash].hits);
    }

    // ── Fonctions de lecture ──────────────────────────────────

    /// @notice Recupere les details complets d'une entree
    function getEntry(bytes32 queryHash)
        external
        view
        returns (
            string memory data,
            string memory query,
            address seeder,
            uint256 timestamp,
            uint256 hits,
            bool isExpired
        )
    {
        CacheEntry storage entry = entries[queryHash];
        require(entry.exists, "Entry does not exist");

        bool expired = block.timestamp - entry.timestamp > defaultTTL;
        return (entry.data, entry.query, entry.seeder, entry.timestamp, entry.hits, expired);
    }

    /// @notice Stats globales pour le dashboard
    function getStats()
        external
        view
        returns (uint256 seeds, uint256 hits, uint256 queries)
    {
        return (totalSeeds, totalHits, totalQueries);
    }

    // ── Admin ─────────────────────────────────────────────────

    function setTTL(uint256 newTTL) external onlyOwner {
        defaultTTL = newTTL;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
```

**Changements vs roadmap originale :**
- `constructor(address _owner)` au lieu de `constructor()` → compatible avec le pattern scaffold-eth (`new DataCache(deployer)`)
- `getResult()` est maintenant **view** (pas de write on-chain pour un cache read)
- `recordHits()` en batch au lieu de `recordHit()` unitaire → le backend peut batcher les hits periodiquement
- Suppression de `AgentPool.sol` → on le fait que si on a le temps

### 0:45 → 0:55 — Script de deploiement

#### Fichier `packages/foundry/script/DeployDataCache.s.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/DataCache.sol";

contract DeployDataCache is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        DataCache cache = new DataCache(deployer);
        console.log("DataCache deployed at:", address(cache));
    }
}
```

#### Modifier `packages/foundry/script/Deploy.s.sol`

```solidity
//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { DeployDataCache } from "./DeployDataCache.s.sol";

contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        DeployDataCache deployDataCache = new DeployDataCache();
        deployDataCache.run();
    }
}
```

#### Commandes

```bash
# Compiler
yarn compile

# Tester (optionnel si on a le temps)
cd packages/foundry && forge test

# Deployer sur Monad testnet
yarn deploy --network monad

# L'ABI est auto-exportee dans packages/nextjs/contracts/deployedContracts.ts
# → Le front peut lire le contrat directement via les hooks scaffold-eth
```

> **Note** : il faut ajouter le RPC monad dans `foundry.toml` :
> ```toml
> [rpc_endpoints]
> monad = "https://rpc.monad.xyz"
> ```

**Checkpoint Phase 1** : DataCache deploye sur Monad, ABI auto-generee dans le frontend.

---

## PHASE 2 — API Routes Next.js `[1:00 → 2:15]`

On utilise les **API routes Next.js** (`app/api/`) au lieu d'un backend Hono separe. Ca simplifie le deploy (tout est dans un seul service) et ca utilise le monorepo existant.

### 1:00 → 1:20 — Utilitaire blockchain

#### Fichier `packages/nextjs/utils/gateway/chain.ts`

```ts
import { createPublicClient, createWalletClient, http, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Monad chain (deja defini dans scaffold.config.ts, on reutilise)
const monad = {
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.monad.xyz"] },
  },
} as const;

// ABI minimal — juste les fonctions qu'on utilise
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

// Clients
const account = privateKeyToAccount(process.env.BACKEND_PRIVATE_KEY! as `0x${string}`);

export const publicClient = createPublicClient({
  chain: monad,
  transport: http(),
});

export const walletClient = createWalletClient({
  account,
  chain: monad,
  transport: http(),
});

const cacheAddress = process.env.DATACACHE_ADDRESS! as `0x${string}`;

// ── Helpers ───────────────────────────────────────────────────

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

export async function storeResultOnChain(
  queryHash: `0x${string}`,
  query: string,
  data: string,
  seeder: string,
) {
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
```

### 1:20 → 1:50 — Route API principale

#### Fichier `packages/nextjs/app/api/query/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { hashQuery, checkOnChainCache, storeResultOnChain } from "~~/utils/gateway/chain";
import { emitEvent } from "~~/utils/gateway/events";

// ── Detect intent ─────────────────────────────────────────
function detectIntent(input: string): { type: string; param: string } {
  const lower = input.toLowerCase().trim();

  const priceMatch = lower.match(
    /(?:price|prix|cours)\s+(?:of\s+)?(\w+)|(\w+)\s+price|(ethereum|bitcoin|btc|eth|sol|solana)/,
  );
  if (priceMatch) {
    const token = priceMatch[1] || priceMatch[2] || priceMatch[3];
    const map: Record<string, string> = { eth: "ethereum", btc: "bitcoin", sol: "solana" };
    return { type: "price", param: map[token] || token };
  }

  const weatherMatch = lower.match(
    /(?:weather|meteo|temperature|temps)\s+(?:in\s+|a\s+)?(\w+)|(\w+)\s+weather/,
  );
  if (weatherMatch) {
    return { type: "weather", param: weatherMatch[1] || weatherMatch[2] };
  }

  return { type: "ai", param: input };
}

// ── Fetch depuis les APIs externes ────────────────────────
async function fetchFromSource(type: string, param: string): Promise<string> {
  switch (type) {
    case "price": {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${param}&vs_currencies=usd&include_24hr_change=true`,
      );
      const json = await res.json();
      return JSON.stringify(json[param] || { error: "not found" });
    }
    case "weather": {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(param)}?format=j1`);
      const json = await res.json();
      const cur = json.current_condition?.[0];
      return JSON.stringify({
        temperature: cur?.temp_C,
        condition: cur?.weatherDesc?.[0]?.value,
        humidity: cur?.humidity,
      });
    }
    case "ai": {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "Answer concisely in 1-3 sentences." },
            { role: "user", content: param },
          ],
          max_tokens: 150,
        }),
      });
      const json = await res.json();
      return json.choices?.[0]?.message?.content || "No response";
    }
    default:
      return "Unknown query type";
  }
}

// ── POST /api/query ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const { query: input } = await req.json();
  if (!input) return NextResponse.json({ error: "Missing 'query'" }, { status: 400 });

  const intent = detectIntent(input);
  const qHash = hashQuery(input);

  // L'adresse du payer (extraite du header x402 par le middleware)
  const payerAddress = req.headers.get("x-payer") || "0x0000000000000000000000000000000000000000";

  // ── ETAPE 1 : Check le contrat on-chain ────────────────
  const { isCached, data: cachedData } = await checkOnChainCache(qHash);

  if (isCached) {
    // ── CACHE HIT : donnee fraiche on-chain ──────────────
    emitEvent({
      type: "cache_hit",
      query: input,
      user: payerAddress.slice(0, 6) + "..." + payerAddress.slice(-4),
      cost: "$0.0001",
      cached: true,
    });

    return NextResponse.json({
      query: input,
      intent: intent.type,
      data: JSON.parse(cachedData),
      cached: true,
      cost: "$0.0001",
      source: "on-chain cache",
      timestamp: Date.now(),
    });
  }

  // ── CACHE MISS : donnee pas en cache ou expiree ────────
  const freshData = await fetchFromSource(intent.type, intent.param);
  const txHash = await storeResultOnChain(qHash, input, freshData, payerAddress);

  emitEvent({
    type: "query",
    query: input,
    user: payerAddress.slice(0, 6) + "..." + payerAddress.slice(-4),
    cost: "$0.01",
    cached: false,
    source: intent.type,
  });

  return NextResponse.json({
    query: input,
    intent: intent.type,
    data: JSON.parse(freshData),
    cached: false,
    cost: "$0.01",
    seeder: payerAddress,
    txHash,
    source: intent.type,
    timestamp: Date.now(),
  });
}
```

### 1:50 → 2:00 — Route stats

#### Fichier `packages/nextjs/app/api/stats/route.ts`

```ts
import { NextResponse } from "next/server";
import { getOnChainStats } from "~~/utils/gateway/chain";

export async function GET() {
  const stats = await getOnChainStats();
  return NextResponse.json({
    seeds: stats.seeds.toString(),
    hits: stats.hits.toString(),
    queries: stats.queries.toString(),
  });
}
```

### 2:00 → 2:15 — SSE Events

#### Fichier `packages/nextjs/utils/gateway/events.ts`

```ts
interface GatewayEvent {
  type: "query" | "cache_hit";
  query: string;
  user: string;
  cost: string;
  cached: boolean;
  source?: string;
}

const clients = new Set<ReadableStreamDefaultController>();

export function emitEvent(event: GatewayEvent) {
  const data = JSON.stringify({ ...event, timestamp: Date.now() });
  clients.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
    } catch {
      clients.delete(controller);
    }
  });
}

export function addSSEClient(controller: ReadableStreamDefaultController) {
  clients.add(controller);
}

export function removeSSEClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller);
}
```

#### Fichier `packages/nextjs/app/api/events/route.ts`

```ts
import { addSSEClient, removeSSEClient } from "~~/utils/gateway/events";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(controller);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
          removeSSEClient(controller);
        }
      }, 15000);
    },
    cancel(controller: any) {
      removeSSEClient(controller);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

**Tester** :
```bash
# Le frontend tourne deja avec yarn start

# Test direct
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query":"ETH price"}'

# Verifier les stats
curl http://localhost:3000/api/stats
```

**Checkpoint Phase 2** : les API routes check le contrat, ecrivent on-chain, et servent les resultats.

---

## PHASE 3 — Frontend Dashboard `[2:15 → 3:30]`

On utilise le **Next.js existant** avec les composants scaffold-eth (wallet connect, theming, etc. deja la).

### 2:15 → 2:30 — Hooks

#### Fichier `packages/nextjs/hooks/gateway/useLiveFeed.ts`

```ts
import { useState, useEffect } from "react";

export function useLiveFeed() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setEvents((prev) => [event, ...prev].slice(0, 30));
    };
    return () => source.close();
  }, []);

  return events;
}
```

#### Fichier `packages/nextjs/hooks/gateway/useGateway.ts`

```ts
import { useState } from "react";

interface QueryResult {
  query: string;
  intent: string;
  data: any;
  cached: boolean;
  cost: string;
  seeder?: string;
  txHash?: string;
  source: string;
  timestamp: number;
}

export function useGateway() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);

  async function submitQuery(input: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });
      const data = await res.json();
      setResult(data);
      return data;
    } finally {
      setLoading(false);
    }
  }

  return { submitQuery, result, loading };
}
```

### 2:30 → 3:30 — Pages

#### `packages/nextjs/app/page.tsx` — Landing

La landing existe deja avec le shader gradient. On ajoute du contenu par dessus :
- Hero text : "Query anything. Pay for freshness."
- 3 blocs "How it works"
- CTA → `/dashboard`

#### `packages/nextjs/app/dashboard/page.tsx` — Dashboard

Le dashboard principal :
- **StatsBar** : Seeds | Cache Hits | Total Queries (via `/api/stats`)
- **SearchBar** : tape ta query, envoie
- **ResultCard** : montre la data + FRESH/CACHED + cout + tx hash
- **LiveFeed** (colonne droite) : toutes les queries en temps reel via SSE

Les composants scaffold existants (wallet connect, theme, header, footer) sont deja la et fonctionnent.

**Checkpoint Phase 3** : le dashboard est fonctionnel avec les stats on-chain et le live feed SSE.

---

## PHASE 4 — Agents + Demo `[3:30 → 4:30]`

### 3:30 → 3:50 — Swarm d'agents

#### Fichier `agents/swarm.ts`

```ts
// Les agents appellent directement les API routes Next.js

const GATEWAY = process.env.GATEWAY_URL || "http://localhost:3000";

const agents = [
  {
    name: "Price-Bot",
    queries: ["ETH price", "BTC price", "SOL price", "ethereum price", "bitcoin price"],
    delay: 3000,
  },
  {
    name: "Weather-Bot",
    queries: ["Denver weather", "Tokyo weather", "Paris weather", "London weather"],
    delay: 4000,
  },
  {
    name: "AI-Bot",
    queries: ["what is Monad", "explain x402", "define DeFi", "what are micropayments"],
    delay: 5000,
  },
];

async function runAgent(agent: (typeof agents)[number]) {
  console.log(`${agent.name} started`);

  let i = 0;
  while (true) {
    const q = agent.queries[i % agent.queries.length];
    const start = Date.now();

    try {
      const res = await fetch(`${GATEWAY}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const result = await res.json();
      const ms = Date.now() - start;
      const tag = result.cached ? "CACHE" : "FRESH";
      console.log(
        `${agent.name} | ${q.padEnd(20)} | ${tag} | ${result.cost.padEnd(8)} | ${ms}ms`,
      );
    } catch (err: any) {
      console.log(`${agent.name} | ${q.padEnd(20)} | ERROR ${err.message}`);
    }

    i++;
    const jitter = Math.random() * 2000;
    await new Promise((r) => setTimeout(r, agent.delay + jitter));
  }
}

console.log("\nAgent Swarm — x402 Gateway\n");
console.log("-".repeat(70));
Promise.all(agents.map(runAgent));
```

**Lancer** :
```bash
npx tsx agents/swarm.ts
```

### 3:50 → 4:10 — Deploy

| Service | Outil | Commande |
|---|---|---|
| Contrat | Monad | `yarn deploy --network monad` |
| Frontend + API | Vercel | `yarn vercel:yolo` |
| Agents | Terminal local | `npx tsx agents/swarm.ts` |

Apres deploy Vercel, mettre a jour `GATEWAY_URL` dans le swarm pour pointer vers l'URL Vercel.

### 4:10 → 4:30 — Script de demo

**Setup ecran :**
```
┌───────────────────────────────────┬──────────────────────────┐
│                                   │                          │
│         Dashboard Web             │   Terminal : Swarm       │
│    (stats on-chain + live feed)   │                          │
│                                   │                          │
└───────────────────────────────────┴──────────────────────────┘
```

**Script (3 min) :**

**[0:00 - 0:30] Le probleme**
> "Les agents AI ont besoin de data — prix crypto, meteo, reponses LLM. Aujourd'hui chaque API demande une cle, un compte, un abonnement. Un agent autonome ne peut pas gerer ca."

**[0:30 - 1:00] La solution**
> "x402 Gateway : un endpoint unique pour toutes les APIs. Le twist : la fraicheur a un prix. Tu veux la donnee en premier ? Tu paies cher et tu la 'seedes' on-chain sur Monad. Tu arrives apres ? C'est quasi gratuit, tu lis le cache."

**[1:00 - 2:00] Demo live**

Ouvrir le dashboard, taper "ETH price" dans la search bar :
> "Premiere query. Cache miss. Le backend fetch CoinGecko, et le resultat est stocke on-chain dans notre contrat DataCache sur Monad. Ca coute $0.01."

Taper "ETH price" a nouveau :
> "Meme query, quelques secondes plus tard. Cache hit. On-chain. $0.0001. La data etait deja la, payee par le premier user."

Lancer le swarm dans le terminal :
> "Maintenant 3 agents autonomes. Ils query en boucle. Regardez : les premieres queries sont des seeds (cher), puis les suivantes sont des cache hits (pas cher). Le reseau s'auto-optimise."

*Le dashboard s'anime de queries — les juges voient FRESH et CACHED alterner*

**[2:00 - 2:30] L'architecture**
> "Tout est on-chain sur Monad. Le contrat DataCache stocke chaque resultat, track les seeders, gere le TTL. Le frontend est un Next.js avec des API routes qui servent de gateway. Les agents appellent les memes routes."

**[2:30 - 3:00] La vision**
> "C'est un marche de la fraicheur. Les trading bots paient cher pour etre premiers. Les dashboards arrivent apres et paient rien. Plus une donnee est populaire, plus vite elle est seedee, plus vite elle devient gratuite. C'est un CDN de donnees payant, on-chain, sur Monad."

---

## Matrice de Priorites

### MUST — sans ca, pas de projet

- [ ] **DataCache.sol** deploye sur Monad
- [ ] **API route** `/api/query` qui check le contrat + fetch API + store on-chain
- [ ] **Dashboard** avec search bar fonctionnelle → montre FRESH/CACHED
- [ ] **1 query complete end-to-end** : cache miss → seed on-chain → cache hit → lecture on-chain

### SHOULD — rend le projet competitif

- [ ] **x402 middleware** avec paiements reels via thirdweb
- [ ] **Live feed SSE** sur le dashboard
- [ ] **Stats on-chain** affichees (seeds, hits, total)
- [ ] **Swarm** d'au moins 2 agents pour la demo
- [ ] **Pricing differencie** visible : FRESH = cher, CACHED = pas cher

### NICE TO HAVE — wow factor

- [ ] 3+ agents avec queries variees (prix, meteo, AI)
- [ ] Landing page avec le shader gradient + explications
- [ ] `/api/stats` qui lit les stats du contrat
- [ ] Dashboard montre les tx Monad en temps reel
- [ ] Deploy sur Vercel

### COUPER EN PREMIER si manque de temps

- AgentPool.sol (coupe)
- Landing Page (aller direct au dashboard)
- Pricing dynamique x402 (mettre un prix fixe)
- CLI separee (le dashboard remplace)
- Deploy (rester en localhost + ngrok)

---

## Ressources

| Ressource | URL |
|---|---|
| Monad x402 Guide | https://docs.monad.xyz/guides/x402-guide |
| thirdweb x402 | https://portal.thirdweb.com/x402 |
| x402 Protocol | https://github.com/coinbase/x402 |
| Monad Faucet | https://faucet.monad.xyz |
| Foundry Book | https://book.getfoundry.sh |
| viem Docs | https://viem.sh |
| Scaffold-ETH 2 | https://docs.scaffoldeth.io |
| CoinGecko API | https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd |
| wttr.in API | https://wttr.in/denver?format=j1 |
| Groq Console | https://console.groq.com |

# 🌐 x402 Universal Access Point — Roadmap Hackathon Monad Blitz

> Un wrapper API où la fraîcheur de la donnée a un prix.
> Tu veux la data en premier ? Tu paies cher. Tu arrives après ? C'est quasi gratuit.
> Un CDN de données payant où le premier finance le cache pour tout le réseau.

---

## 🧠 Le Concept en 30 Secondes

```
10h00:00 — Agent A query "ETH price"
           → Donnée pas dans le contrat
           → PAYE CHER ($0.01) ← prix de la fraîcheur
           → Backend fetch CoinGecko → "2847.32"
           → Résultat ÉCRIT ON-CHAIN
           → Agent A reçoit la data en premier

10h00:05 — Agent B query "ETH price"
           → Donnée EXISTE dans le contrat
           → PAYE PEU ($0.0001) ← juste du gas
           → Lecture directe du contrat
           → Pas besoin d'appeler CoinGecko

10h01:00 — TTL expiré (60s)
           → Donnée marquée comme périmée
           → Le prochain paye à nouveau le prix fort
           → Nouveau cycle
```

**C'est un marché de la fraîcheur** : les bots de trading paient cher pour être premiers, les dashboards paient rien parce que quelqu'un a déjà payé.

---

## 📐 Architecture

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────────┐
│   CLI        │     │  Dashboard   │     │   Agent Scripts      │
│   x402q      │     │  React Web   │     │   (query en boucle)  │
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
│                      BACKEND — Hono                              │
│                                                                  │
│  1. Reçoit la query ("ETH price")                                │
│  2. Hash la query → bytes32                                      │
│  3. Appelle le contrat : isExpired(hash) ?                       │
│                                                                  │
│     ┌─── OUI (pas en cache ou TTL expiré) ──────────────────┐   │
│     │                                                        │   │
│     │  → Exige paiement x402 CHER ($0.01)                    │   │
│     │  → Fetch l'API externe (CoinGecko / wttr.in / Groq)   │   │
│     │  → Appelle contrat : storeResult(hash, data)           │   │
│     │  → Retourne la data au client                          │   │
│     │                                                        │   │
│     └────────────────────────────────────────────────────────┘   │
│                                                                  │
│     ┌─── NON (donnée fraîche en cache on-chain) ────────────┐   │
│     │                                                        │   │
│     │  → Paiement x402 PAS CHER ($0.0001) ou gratuit        │   │
│     │  → Appelle contrat : getResult(hash)                   │   │
│     │  → Retourne la data au client                          │   │
│     │  → Pas d'appel API externe                             │   │
│     │                                                        │   │
│     └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  4. Émet un event SSE vers le Dashboard                          │
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
│  │      address seeder;    // qui a payé    │                    │
│  │      uint256 timestamp; // quand         │                    │
│  │      uint256 hits;      // nb de reads   │                    │
│  │      bool exists;       // existe ?      │                    │
│  │  }                                       │                    │
│  │                                          │                    │
│  │  storeResult(hash, data) → write         │                    │
│  │  getResult(hash) → read + hits++         │                    │
│  │  isExpired(hash, ttl) → bool             │                    │
│  │                                          │                    │
│  └──────────────────────────────────────────┘                    │
│                                                                  │
│  ┌──────────────────────────────────────────┐                    │
│  │         AgentPool.sol                    │                    │
│  │                                          │                    │
│  │  deposit() → ajouter des fonds           │                    │
│  │  authorizeAgent(addr) → whitelist        │                    │
│  │  spend(amount) → agent débite le pool    │                    │
│  │  getBalance() → solde restant            │                    │
│  │                                          │                    │
│  └──────────────────────────────────────────┘                    │
│                                                                  │
│  + Transactions x402 (via thirdweb facilitator)                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure du Projet

```
x402-gateway/
├── contracts/                            # ← SMART CONTRACTS
│   ├── src/
│   │   ├── DataCache.sol                 # Cache on-chain avec TTL et seeder tracking
│   │   └── AgentPool.sol                 # Budget pool partagé pour agents
│   ├── script/
│   │   └── Deploy.s.sol                  # Script de déploiement Monad testnet
│   ├── test/
│   │   ├── DataCache.t.sol
│   │   └── AgentPool.t.sol
│   └── foundry.toml
├── packages/
│   └── sdk/
│       ├── src/
│       │   ├── client.ts                 # SDK — le cœur
│       │   ├── contracts.ts              # ABI + helpers contrats
│       │   ├── cli.ts                    # CLI — bin "x402q"
│       │   └── types.ts
│       ├── package.json
│       └── tsconfig.json
├── backend/
│   ├── src/
│   │   ├── index.ts                      # Entry Hono
│   │   ├── middleware/
│   │   │   └── x402.ts                  # Payment middleware
│   │   ├── routes/
│   │   │   ├── price.ts                 # /api/price/:token
│   │   │   ├── weather.ts              # /api/weather/:city
│   │   │   ├── ai.ts                   # /api/ai/query
│   │   │   └── query.ts                # /api/query (routeur universel)
│   │   ├── chain.ts                     # Client viem → interagir avec contrats
│   │   ├── events.ts                    # SSE pour live feed
│   │   └── utils.ts
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── ResultCard.tsx
│   │   │   ├── LiveFeed.tsx
│   │   │   └── StatsBar.tsx
│   │   └── hooks/
│   │       ├── useGateway.ts
│   │       └── useLiveFeed.ts
│   ├── package.json
│   └── .env
├── agents/
│   └── swarm.ts
└── README.md
```

---

## ⏱ PHASE 0 — Setup `[0:00 → 0:30]`

### 0:00 → 0:15 — Comptes et clés

**Objectif** : avoir toutes les clés prêtes pour ne plus jamais s'arrêter.

1. **Thirdweb Dashboard** → https://thirdweb.com/dashboard
   - Créer un projet "x402-gateway"
   - Settings → API Keys → copier **Client ID** + **Secret Key**
   - Wallets → Server Wallets → copier l'adresse du **Server Wallet**

2. **Monad Faucet** → https://faucet.monad.xyz
   - Envoyer du MON testnet au Server Wallet (gas pour les tx)
   - Envoyer du MON testnet à un wallet personnel (pour tester comme buyer)

3. **Groq** → https://console.groq.com
   - Générer une API key

4. **Créer `.env`** à la racine :
   ```env
   # Thirdweb
   THIRDWEB_SECRET_KEY=sk_xxx
   NEXT_PUBLIC_CLIENT_ID=xxx
   SERVER_WALLET=0x...

   # Contrats (rempli après déploiement)
   DATACACHE_ADDRESS=
   AGENTPOOL_ADDRESS=

   # APIs
   GROQ_API_KEY=gsk_xxx

   # Monad
   MONAD_RPC=https://testnet-rpc.monad.xyz
   MONAD_CHAIN_ID=10143

   # Wallet backend (pour appeler les contrats)
   BACKEND_PRIVATE_KEY=0x...

   # Wallet test buyer (pour le CLI et agents)
   BUYER_PRIVATE_KEY=0x...
   ```

### 0:15 → 0:30 — Init monorepo

```bash
mkdir x402-gateway && cd x402-gateway

# Contracts
mkdir -p contracts/src contracts/script contracts/test
cd contracts
forge init --no-git --no-commit
cd ..

# Backend
mkdir -p backend/src/middleware backend/src/routes
cd backend
npm init -y
npm install hono @hono/node-server dotenv viem
npm install thirdweb x402-hono
npm install -D typescript @types/node ts-node
npx tsc --init
cd ..

# SDK + CLI
mkdir -p packages/sdk/src
cd packages/sdk
npm init -y
npm install thirdweb commander chalk viem
npm install -D typescript @types/node
npx tsc --init
cd ../..

# Frontend
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install thirdweb viem
npm install -D tailwindcss @tailwindcss/vite
cd ..

# Agents
mkdir agents
```

**✅ Checkpoint** : tous les dossiers existent, les dépendances sont installées.

---

## ⏱ PHASE 1 — Smart Contracts `[0:30 → 1:30]`

C'est la **fondation** du projet. On le fait en premier parce que tout le reste en dépend.

### 0:30 → 1:00 — DataCache.sol

**Objectif** : un contrat qui stocke des résultats de query on-chain, avec un TTL et un seeder.

#### Fichier `contracts/src/DataCache.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DataCache {

    // ── Structure d'une entrée en cache ───────────────────────
    struct CacheEntry {
        string data;          // Le résultat (ex: "2847.32")
        string query;         // La query originale (ex: "ETH price")
        address seeder;       // Qui a payé le fetch en premier
        uint256 timestamp;    // Quand la donnée a été écrite
        uint256 hits;         // Combien de fois lue depuis
        bool exists;          // Existe dans le cache
    }

    // ── Storage ───────────────────────────────────────────────
    mapping(bytes32 => CacheEntry) public entries;

    // Compteurs globaux pour le dashboard
    uint256 public totalSeeds;       // Nombre de premières queries
    uint256 public totalHits;        // Nombre de lectures cache
    uint256 public totalQueries;     // Seeds + hits

    // TTL par défaut : 60 secondes
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

    event DataExpired(
        bytes32 indexed queryHash,
        uint256 previousTimestamp
    );

    // ── Modifiers ─────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ── Constructor ───────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ── Fonctions principales ─────────────────────────────────

    /// @notice Vérifie si une query est en cache ET pas expirée
    /// @param queryHash Le hash keccak256 de la query
    /// @return isCached true si la donnée est fraîche
    /// @return data Le résultat stocké (vide si pas en cache)
    function checkCache(bytes32 queryHash) 
        external 
        view 
        returns (bool isCached, string memory data) 
    {
        CacheEntry storage entry = entries[queryHash];

        if (!entry.exists) {
            return (false, "");
        }

        // Vérifier le TTL
        if (block.timestamp - entry.timestamp > defaultTTL) {
            return (false, "");  // Expiré
        }

        return (true, entry.data);
    }

    /// @notice Stocke un nouveau résultat (appelé quand cache miss)
    /// @param queryHash Le hash de la query
    /// @param query La query en clair (pour les logs)
    /// @param data Le résultat à stocker
    /// @param seeder L'adresse de celui qui a payé
    function storeResult(
        bytes32 queryHash,
        string calldata query,
        string calldata data,
        address seeder
    ) external onlyOwner {
        CacheEntry storage entry = entries[queryHash];

        // Si ça existait mais expiré, reset
        if (entry.exists && block.timestamp - entry.timestamp > defaultTTL) {
            emit DataExpired(queryHash, entry.timestamp);
        }

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

    /// @notice Enregistre une lecture cache (appelé quand cache hit)
    /// @param queryHash Le hash de la query
    /// @param reader L'adresse de celui qui lit
    /// @return data Le résultat stocké
    function recordHit(bytes32 queryHash, address reader)
        external
        onlyOwner
        returns (string memory data)
    {
        CacheEntry storage entry = entries[queryHash];
        require(entry.exists, "Entry does not exist");
        require(
            block.timestamp - entry.timestamp <= defaultTTL,
            "Entry expired"
        );

        entry.hits++;
        totalHits++;
        totalQueries++;

        emit CacheHit(queryHash, reader, entry.hits);

        return entry.data;
    }

    // ── Fonctions de lecture ──────────────────────────────────

    /// @notice Récupère les détails complets d'une entrée
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

    /// @notice Changer le TTL (owner only)
    function setTTL(uint256 newTTL) external onlyOwner {
        defaultTTL = newTTL;
    }

    /// @notice Transférer l'ownership
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
```

**Ce que ce contrat fait :**
- `checkCache(hash)` → le backend appelle ça en premier. Si `true` → cache hit (pas cher). Si `false` → cache miss (cher).
- `storeResult(hash, query, data, seeder)` → écrit la donnée on-chain après un fetch API.
- `recordHit(hash, reader)` → incrémente le compteur et retourne la donnée.
- `getStats()` → pour le dashboard : total seeds, hits, queries.
- TTL de 60 secondes → après expiration, la donnée est considérée périmée, le prochain repaye le prix fort.

### 1:00 → 1:15 — AgentPool.sol

**Objectif** : un pool où des humains déposent des fonds, des agents autorisés dépensent.

#### Fichier `contracts/src/AgentPool.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentPool {

    address public owner;

    // Agents autorisés à dépenser
    mapping(address => bool) public authorizedAgents;

    // Qui a déposé combien (pour tracking)
    mapping(address => uint256) public deposits;

    // Stats
    uint256 public totalDeposited;
    uint256 public totalSpent;
    uint256 public totalQueries;

    // ── Events ────────────────────────────────────────────────
    event Deposited(address indexed depositor, uint256 amount, uint256 newBalance);
    event AgentAuthorized(address indexed agent);
    event AgentRevoked(address indexed agent);
    event QueryPaid(address indexed agent, uint256 cost, bytes32 queryHash, uint256 poolBalance);
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedAgents[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ── Dépôt ─────────────────────────────────────────────────

    /// @notice N'importe qui peut déposer des fonds dans le pool
    function deposit() external payable {
        require(msg.value > 0, "Must send value");

        deposits[msg.sender] += msg.value;
        totalDeposited += msg.value;

        emit Deposited(msg.sender, msg.value, address(this).balance);
    }

    // ── Gestion des agents ────────────────────────────────────

    /// @notice Autoriser un agent à dépenser depuis le pool
    function authorizeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = true;
        emit AgentAuthorized(agent);
    }

    /// @notice Révoquer un agent
    function revokeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = false;
        emit AgentRevoked(agent);
    }

    // ── Dépense ───────────────────────────────────────────────

    /// @notice Un agent autorisé (ou le backend) débite le pool pour payer une query
    /// @param cost Le coût de la query en wei
    /// @param queryHash Le hash de la query (pour les logs)
    function payForQuery(uint256 cost, bytes32 queryHash) external onlyAuthorized {
        require(address(this).balance >= cost, "Pool balance too low");

        totalSpent += cost;
        totalQueries++;

        // Transférer le coût au owner (le backend/service)
        payable(owner).transfer(cost);

        emit QueryPaid(msg.sender, cost, queryHash, address(this).balance);
    }

    // ── Lecture ────────────────────────────────────────────────

    /// @notice Solde actuel du pool
    function getPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Stats pour le dashboard
    function getStats() 
        external 
        view 
        returns (uint256 balance, uint256 deposited, uint256 spent, uint256 queries) 
    {
        return (address(this).balance, totalDeposited, totalSpent, totalQueries);
    }

    // ── Admin ─────────────────────────────────────────────────

    /// @notice Retirer les fonds (urgence seulement)
    function withdraw(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        payable(owner).transfer(amount);
        emit Withdrawn(owner, amount);
    }

    /// @notice Recevoir du MON directement
    receive() external payable {
        deposits[msg.sender] += msg.value;
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value, address(this).balance);
    }
}
```

### 1:15 → 1:30 — Déploiement sur Monad Testnet

#### Fichier `contracts/script/Deploy.s.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/DataCache.sol";
import "../src/AgentPool.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("BACKEND_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);

        DataCache cache = new DataCache();
        console.log("DataCache deployed at:", address(cache));

        AgentPool pool = new AgentPool();
        console.log("AgentPool deployed at:", address(pool));

        vm.stopBroadcast();
    }
}
```

#### Fichier `contracts/foundry.toml`

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
evm_version = "shanghai"

[rpc_endpoints]
monad_testnet = "${MONAD_RPC}"
```

#### Commandes de déploiement

```bash
cd contracts

# Compiler
forge build

# Tester
forge test

# Déployer sur Monad testnet
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $MONAD_RPC \
  --private-key $BACKEND_PRIVATE_KEY \
  --broadcast

# Copier les adresses dans .env
# DATACACHE_ADDRESS=0x...
# AGENTPOOL_ADDRESS=0x...
```

#### Copier les ABIs pour le backend et le SDK

```bash
# Après forge build, les ABIs sont dans contracts/out/
cp contracts/out/DataCache.sol/DataCache.json backend/src/abi/
cp contracts/out/AgentPool.sol/AgentPool.json backend/src/abi/
cp contracts/out/DataCache.sol/DataCache.json packages/sdk/src/abi/
```

**✅ Checkpoint Phase 1** : les deux contrats sont déployés sur Monad testnet, les adresses sont dans `.env`, les ABIs sont copiées.

---

## ⏱ PHASE 2 — Backend + x402 `[1:30 → 3:00]`

### 1:30 → 1:50 — Client blockchain (viem)

**Objectif** : un module qui parle aux smart contracts depuis le backend.

#### Fichier `backend/src/chain.ts`

```ts
import { createPublicClient, createWalletClient, http, keccak256, toHex, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains"; // ou définir custom
import "dotenv/config";

// Si monadTestnet n'existe pas dans viem, définir manuellement :
const monad = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.MONAD_RPC!] },
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
    name: "recordHit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "queryHash", type: "bytes32" },
      { name: "reader", type: "address" },
    ],
    outputs: [{ name: "data", type: "string" }],
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

/// Hasher une query de manière déterministe
export function hashQuery(query: string): `0x${string}` {
  return keccak256(toHex(query.toLowerCase().trim()));
}

/// Vérifier si la query est en cache on-chain
export async function checkOnChainCache(queryHash: `0x${string}`): Promise<{
  isCached: boolean;
  data: string;
}> {
  const result = await publicClient.readContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "checkCache",
    args: [queryHash],
  });
  return { isCached: result[0], data: result[1] };
}

/// Stocker un résultat on-chain (après un cache miss)
export async function storeResultOnChain(
  queryHash: `0x${string}`,
  query: string,
  data: string,
  seeder: string
): Promise<string> {
  const txHash = await walletClient.writeContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "storeResult",
    args: [queryHash, query, data, seeder as `0x${string}`],
  });
  return txHash;
}

/// Enregistrer un cache hit on-chain
export async function recordHitOnChain(
  queryHash: `0x${string}`,
  reader: string
): Promise<string> {
  const txHash = await walletClient.writeContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "recordHit",
    args: [queryHash, reader as `0x${string}`],
  });
  return txHash;
}

/// Lire les stats globales
export async function getOnChainStats(): Promise<{
  seeds: bigint;
  hits: bigint;
  queries: bigint;
}> {
  const result = await publicClient.readContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "getStats",
  });
  return { seeds: result[0], hits: result[1], queries: result[2] };
}
```

### 1:50 → 2:20 — Routes API avec logique on-chain

**Objectif** : chaque route check le contrat d'abord, puis soit lit le cache, soit fetch l'API et stocke.

#### Fichier `backend/src/routes/query.ts` (route universelle)

```ts
import { Hono } from "hono";
import { hashQuery, checkOnChainCache, storeResultOnChain, recordHitOnChain } from "../chain.js";
import { emitEvent } from "../events.js";

const query = new Hono();

// ── Detect intent ─────────────────────────────────────────
function detectIntent(input: string): { type: string; param: string } {
  const lower = input.toLowerCase().trim();

  const priceMatch = lower.match(
    /(?:price|prix|cours)\s+(?:of\s+)?(\w+)|(\w+)\s+price|(ethereum|bitcoin|btc|eth|sol|solana)/
  );
  if (priceMatch) {
    const token = priceMatch[1] || priceMatch[2] || priceMatch[3];
    const map: Record<string, string> = { eth: "ethereum", btc: "bitcoin", sol: "solana" };
    return { type: "price", param: map[token] || token };
  }

  const weatherMatch = lower.match(
    /(?:weather|météo|meteo|temperature|temps)\s+(?:in\s+|à\s+)?(\w+)|(\w+)\s+weather/
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
        `https://api.coingecko.com/api/v3/simple/price?ids=${param}&vs_currencies=usd&include_24hr_change=true`
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

// ── Route principale ──────────────────────────────────────
query.post("/", async (c) => {
  const { query: input } = await c.req.json();
  if (!input) return c.json({ error: "Missing 'query'" }, 400);

  const intent = detectIntent(input);
  const qHash = hashQuery(input);

  // L'adresse du payer (extraite du header x402 par le middleware)
  const payerAddress = c.req.header("x-payer") || "0x0000000000000000000000000000000000000000";

  // ── ÉTAPE 1 : Check le contrat on-chain ────────────────
  const { isCached, data: cachedData } = await checkOnChainCache(qHash);

  if (isCached) {
    // ── CACHE HIT : donnée fraîche on-chain ──────────────
    // Le user a payé PEU (le middleware x402 a appliqué le prix bas)

    // Enregistrer le hit on-chain (hits++ dans le contrat)
    const txHash = await recordHitOnChain(qHash, payerAddress);

    emitEvent({
      type: "cache_hit",
      query: input,
      user: payerAddress.slice(0, 6) + "…" + payerAddress.slice(-4),
      cost: "$0.0001",
      cached: true,
    });

    return c.json({
      query: input,
      intent: intent.type,
      data: JSON.parse(cachedData),
      cached: true,
      cost: "$0.0001",
      txHash,
      source: "on-chain cache",
      timestamp: Date.now(),
    });
  }

  // ── CACHE MISS : donnée pas en cache ou expirée ────────
  // Le user a payé CHER (le middleware x402 a appliqué le prix fort)

  // Fetch depuis l'API externe
  const freshData = await fetchFromSource(intent.type, intent.param);

  // Écrire le résultat on-chain
  const txHash = await storeResultOnChain(qHash, input, freshData, payerAddress);

  emitEvent({
    type: "query",
    query: input,
    user: payerAddress.slice(0, 6) + "…" + payerAddress.slice(-4),
    cost: "$0.01",
    cached: false,
    source: intent.type,
  });

  return c.json({
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
});

export default query;
```

#### Routes spécifiques (même pattern, simplifié)

Les routes `/api/price/:token`, `/api/weather/:city`, `/api/ai/query` suivent exactement le même pattern que `/api/query` mais sans le routeur intelligent. Elles appellent directement la bonne API. Copier le pattern ci-dessus en enlevant `detectIntent`.

### 2:20 → 2:40 — x402 Payment Middleware avec pricing dynamique

**Objectif** : le prix x402 dépend de si la donnée est en cache ou pas.

#### Fichier `backend/src/middleware/x402.ts`

```ts
import { createThirdwebClient } from "thirdweb";
import { facilitator } from "thirdweb/x402";
import { hashQuery, checkOnChainCache } from "../chain.js";

export const thirdwebClient = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

export const twFacilitator = facilitator({
  client: thirdwebClient,
  serverWalletAddress: process.env.SERVER_WALLET!,
});

// ── Middleware custom avec pricing dynamique ───────────────
// Le prix dépend de si la query est en cache on-chain ou pas
export async function dynamicPricingMiddleware(c: any, next: any) {
  // Extraire la query pour calculer le hash
  let queryString = "";

  if (c.req.method === "POST") {
    // Pour /api/query → lire le body
    const body = await c.req.json();
    queryString = body.query || body.prompt || "";
    // Remettre le body pour les handlers suivants
    c.req._body = body;
  } else {
    // Pour GET /api/price/:token → construire la query à partir du path
    queryString = c.req.path;
  }

  if (!queryString) {
    await next();
    return;
  }

  const qHash = hashQuery(queryString);
  const { isCached } = await checkOnChainCache(qHash);

  // Stocker le résultat du check pour que le handler le sache
  c.set("isCached", isCached);
  c.set("queryHash", qHash);

  if (isCached) {
    // CACHE HIT → prix bas
    // Option A : on laisse passer gratuitement
    // Option B : on demande quand même un micro-paiement
    // Pour la démo, Option A est plus simple et plus impressionnant
    await next();
  } else {
    // CACHE MISS → prix élevé, le middleware x402 classique s'applique
    // Ici on appelle le paymentMiddleware thirdweb
    await next();
  }
}
```

**Note** : le pricing dynamique x402 est complexe à setup pendant un hackathon. L'approche la plus pragmatique :
- Cache miss → le middleware x402 classique exige le paiement ($0.01)
- Cache hit → on bypass le middleware x402, la lecture est gratuite ou quasi gratuite
- Le contrat on-chain prouve la différence de traitement

### 2:40 → 3:00 — Assembler le backend + SSE

#### Fichier `backend/src/events.ts`

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
      controller.enqueue(`data: ${data}\n\n`);
    } catch {
      clients.delete(controller);
    }
  });
}

export function sseHandler() {
  return new Response(
    new ReadableStream({
      start(controller) {
        clients.add(controller);
        const heartbeat = setInterval(() => {
          try { controller.enqueue(`: heartbeat\n\n`); }
          catch { clearInterval(heartbeat); clients.delete(controller); }
        }, 15000);
      },
      cancel(controller) { clients.delete(controller); },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
```

#### Fichier `backend/src/index.ts`

```ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import "dotenv/config";

import query from "./routes/query.js";
import { sseHandler } from "./events.js";
import { getOnChainStats } from "./chain.js";

const app = new Hono();
app.use("/*", cors());

// SSE pour le live feed
app.get("/events", (c) => sseHandler());

// Stats on-chain
app.get("/api/stats", async (c) => {
  const stats = await getOnChainStats();
  return c.json({
    seeds: stats.seeds.toString(),
    hits: stats.hits.toString(),
    queries: stats.queries.toString(),
  });
});

// Routes API (avec x402 + logique on-chain)
app.route("/api/query", query);

// Health
app.get("/", (c) => c.json({ status: "ok", service: "x402-gateway" }));

serve({ fetch: app.fetch, port: 3001 });
console.log("🚀 Gateway running on http://localhost:3001");
```

**Tester** :
```bash
# Démarrer le backend
npx ts-node --esm src/index.ts

# Test direct (sans x402 pour l'instant)
curl -X POST http://localhost:3001/api/query \
  -H "Content-Type: application/json" \
  -d '{"query":"ETH price"}'

# Vérifier les stats on-chain
curl http://localhost:3001/api/stats
```

**✅ Checkpoint Phase 2** : le backend check le contrat avant chaque query, écrit les résultats on-chain, et les cache hits lisent directement depuis le contrat.

---

## ⏱ PHASE 3 — SDK + CLI `[3:00 → 3:45]`

### 3:00 → 3:20 — SDK

**Objectif** : une lib que n'importe quel agent importe et utilise en 3 lignes.

#### Fichier `packages/sdk/src/types.ts`

```ts
export interface GatewayConfig {
  privateKey: string;
  gatewayUrl?: string;
  clientId?: string;
}

export interface QueryResult {
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
```

#### Fichier `packages/sdk/src/client.ts`

```ts
import { createThirdwebClient } from "thirdweb";
import { wrapFetchWithPayment } from "thirdweb/x402";
import { privateKeyToAccount } from "thirdweb/wallets";
import type { GatewayConfig, QueryResult } from "./types.js";

const DEFAULT_GATEWAY = "http://localhost:3001";

export function createGatewayClient(config: GatewayConfig) {
  const client = createThirdwebClient({
    clientId: config.clientId || "your-client-id",
  });

  const account = privateKeyToAccount({
    client,
    privateKey: config.privateKey,
  });

  // wrapFetchWithPayment gère tout le flow x402 :
  // requête → reçoit 402 → signe le paiement → retry → reçoit la data
  const fetchWithPay = wrapFetchWithPayment(fetch, client, account);
  const baseUrl = config.gatewayUrl || DEFAULT_GATEWAY;

  return {
    /// Query universelle — "ETH price", "Denver weather", "explain DeFi"
    async query(input: string): Promise<QueryResult> {
      const res = await fetchWithPay(`${baseUrl}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });
      if (!res.ok) throw new Error(`Gateway error: ${res.status}`);
      return res.json();
    },

    /// Stats on-chain
    async stats(): Promise<{ seeds: string; hits: string; queries: string }> {
      const res = await fetch(`${baseUrl}/api/stats`);
      return res.json();
    },

    /// Info
    getWallet() { return account.address; },
  };
}
```

**Usage par un agent :**
```ts
import { createGatewayClient } from "x402-gateway-sdk";

const gw = createGatewayClient({ privateKey: "0x..." });

const result = await gw.query("ETH price");
// result.cached === false → première fois, a payé $0.01
// result.data === { usd: 2847.32, ... }

const result2 = await gw.query("ETH price");
// result2.cached === true → lu depuis le contrat, payé $0.0001
```

### 3:20 → 3:45 — CLI

**Objectif** : `x402q "ETH price"` dans un terminal.

#### Fichier `packages/sdk/src/cli.ts`

```ts
#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { createGatewayClient } from "./client.js";

const program = new Command();

program
  .name("x402q")
  .description("Query any API via x402 Gateway on Monad")
  .version("0.1.0")
  .option("-k, --key <key>", "Wallet private key (or set X402_PRIVATE_KEY)")
  .option("-g, --gateway <url>", "Gateway URL", "http://localhost:3001");

// ── x402q "ETH price" ────────────────────────────────────────
program
  .argument("[query...]", "Free-form query")
  .option("--json", "Output raw JSON")
  .action(async (queryParts, opts) => {
    const input = queryParts.join(" ");
    if (!input) { program.help(); return; }

    const key = opts.key || process.env.X402_PRIVATE_KEY;
    if (!key) {
      console.error(chalk.red("✗ No wallet key. Set X402_PRIVATE_KEY or use --key"));
      process.exit(1);
    }

    const gw = createGatewayClient({
      privateKey: key,
      gatewayUrl: program.opts().gateway,
    });

    console.log(chalk.gray(`\n  ⌕  "${input}"`));
    console.log(chalk.gray(`  ⚡ x402 → Monad...\n`));

    try {
      const start = Date.now();
      const result = await gw.query(input);
      const ms = Date.now() - start;

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      // ── Affichage selon le type ──
      const data = result.data;

      if (result.intent === "price" && data.usd) {
        console.log(chalk.white.bold(`  ${data.token?.toUpperCase() || "TOKEN"}`));
        console.log(chalk.green.bold(`  $${data.usd}`));
        if (data.usd_24h_change) {
          const c = data.usd_24h_change >= 0 ? chalk.green : chalk.red;
          console.log(c(`  ${data.usd_24h_change >= 0 ? "▲" : "▼"} ${data.usd_24h_change.toFixed(2)}%`));
        }
      } else if (result.intent === "weather" && data.temperature) {
        console.log(chalk.yellow.bold(`  ${data.temperature}°C — ${data.condition}`));
      } else if (typeof data === "string") {
        console.log(chalk.white(`  ${data}`));
      } else {
        console.log(chalk.white(`  ${JSON.stringify(data)}`));
      }

      // ── Metadata ──
      console.log();
      const cached = result.cached
        ? chalk.magenta("CACHED (on-chain)")
        : chalk.green("FRESH (seeded)");
      console.log(chalk.gray(`  ${cached}  ·  ${ms}ms  ·  ${result.cost}`));

      if (result.txHash) {
        console.log(chalk.gray(`  tx: ${result.txHash.slice(0, 10)}…${result.txHash.slice(-6)}`));
      }
      if (result.seeder && !result.cached) {
        console.log(chalk.gray(`  seeder: ${result.seeder.slice(0, 6)}…${result.seeder.slice(-4)} (you)`));
      }
      console.log();

    } catch (err: any) {
      console.error(chalk.red(`\n  ✗ ${err.message}\n`));
      process.exit(1);
    }
  });

// ── x402q stats ──────────────────────────────────────────────
program
  .command("stats")
  .description("View on-chain gateway stats")
  .action(async () => {
    const gw = createGatewayClient({
      privateKey: "0x0000000000000000000000000000000000000000000000000000000000000001", // dummy, pas besoin pour stats
      gatewayUrl: program.opts().gateway,
    });
    const s = await gw.stats();
    console.log(chalk.white.bold("\n  📊 x402 Gateway Stats (on-chain)\n"));
    console.log(chalk.green(`  Seeds (cache misses):  ${s.seeds}`));
    console.log(chalk.magenta(`  Hits (cache reads):    ${s.hits}`));
    console.log(chalk.white(`  Total queries:         ${s.queries}`));
    console.log();
  });

program.parse();
```

#### Build + link

```bash
cd packages/sdk
npx tsc

# Ajouter le shebang dans dist/cli.js si nécessaire
# Rendre exécutable
chmod +x dist/cli.js

# Link globalement
npm link

# Tester
x402q "ETH price" --key $BUYER_PRIVATE_KEY
x402q "ETH price" --key $BUYER_PRIVATE_KEY   # ← 2ème fois = CACHED
x402q "Denver weather"
x402q "explain Monad in one sentence"
x402q stats
x402q "BTC price" --json
```

**Résultat attendu :**
```
  ⌕  "ETH price"
  ⚡ x402 → Monad...

  ETHEREUM
  $2,847.32
  ▲ 3.42%

  FRESH (seeded)  ·  342ms  ·  $0.01
  tx: 0x7f3a8b…c1d2e3
  seeder: 0xab12…3f4d (you)
```

```
  ⌕  "ETH price"
  ⚡ x402 → Monad...

  ETHEREUM
  $2,847.32
  ▲ 3.42%

  CACHED (on-chain)  ·  89ms  ·  $0.0001
  tx: 0x9e2c1a…f5b6a7
```

**✅ Checkpoint Phase 3** : le SDK et le CLI fonctionnent. La première query paie cher et seede on-chain. La deuxième lit le cache et paie peu.

---

## ⏱ PHASE 4 — Frontend Dashboard `[3:45 → 5:00]`

### 3:45 → 4:15 — Structure + Hooks

**Objectif** : un dashboard qui montre ce qui se passe en temps réel.

#### Hook SSE — `frontend/src/hooks/useLiveFeed.ts`

```ts
import { useState, useEffect } from "react";

export function useLiveFeed(backendUrl: string) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const source = new EventSource(`${backendUrl}/events`);
    source.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setEvents((prev) => [event, ...prev].slice(0, 30));
    };
    return () => source.close();
  }, [backendUrl]);

  return events;
}
```

#### Hook Stats — `frontend/src/hooks/useStats.ts`

```ts
import { useState, useEffect } from "react";

export function useOnChainStats(backendUrl: string) {
  const [stats, setStats] = useState({ seeds: "0", hits: "0", queries: "0" });

  useEffect(() => {
    const poll = async () => {
      const res = await fetch(`${backendUrl}/api/stats`);
      const data = await res.json();
      setStats(data);
    };
    poll();
    const interval = setInterval(poll, 5000); // Poll toutes les 5s
    return () => clearInterval(interval);
  }, [backendUrl]);

  return stats;
}
```

### 4:15 → 5:00 — Pages

Le dashboard a **deux pages** :

**Landing** (`/`) :
- Hero : "Query anything. Pay for freshness."
- 3 blocs How it works : Query → Pay (cher si premier) → Read (pas cher si déjà fait)
- Aperçu du live feed (embedded)
- CTA → "Launch App"

**Dashboard** (`/app`) :
- **Stats bar** : Seeds | Cache Hits | Total Queries (lues depuis le contrat via `/api/stats`)
- **Search bar** : tape ta query, connecte ton wallet, envoie
- **Result card** : montre la data + FRESH/CACHED + coût + tx hash
- **Live feed** (colonne droite) : toutes les queries en temps réel via SSE

Utiliser le composant React déjà généré (`x402-gateway-app.jsx`) comme base, et remplacer :
- Les données mock par `useLiveFeed()` et `useOnChainStats()`
- Le fake submit par `useFetchWithPayment()` de thirdweb
- Les stats hardcodées par les vraies stats on-chain

**✅ Checkpoint Phase 4** : le dashboard affiche les stats on-chain en temps réel et les queries live via SSE.

---

## ⏱ PHASE 5 — Agents + Demo `[5:00 → 6:00]`

### 5:00 → 5:20 — Swarm d'agents

#### Fichier `agents/swarm.ts`

```ts
import { createGatewayClient } from "../packages/sdk/src/client.js";

const GATEWAY = process.env.GATEWAY_URL || "http://localhost:3001";

const agents = [
  {
    name: "🤖 Price-Bot",
    key: process.env.AGENT1_KEY || process.env.BUYER_PRIVATE_KEY!,
    queries: [
      "ETH price", "BTC price", "SOL price",
      "ethereum price", "bitcoin price",
    ],
    delay: 3000,
  },
  {
    name: "🌤 Weather-Bot",
    key: process.env.AGENT2_KEY || process.env.BUYER_PRIVATE_KEY!,
    queries: [
      "Denver weather", "Tokyo weather", "Paris weather",
      "London weather", "weather in Sydney",
    ],
    delay: 4000,
  },
  {
    name: "🧠 AI-Bot",
    key: process.env.AGENT3_KEY || process.env.BUYER_PRIVATE_KEY!,
    queries: [
      "what is Monad", "explain x402", "define DeFi",
      "what are micropayments", "explain blockchain",
    ],
    delay: 5000,
  },
];

async function runAgent(agent: typeof agents[number]) {
  const gw = createGatewayClient({
    privateKey: agent.key,
    gatewayUrl: GATEWAY,
  });

  console.log(`${agent.name} started — wallet: ${gw.getWallet().slice(0, 8)}…`);

  let i = 0;
  while (true) {
    const q = agent.queries[i % agent.queries.length];
    const start = Date.now();

    try {
      const result = await gw.query(q);
      const ms = Date.now() - start;
      const tag = result.cached ? "📦 CACHE" : "🔥 FRESH";
      console.log(
        `${agent.name} | ${q.padEnd(20)} | ${tag} | ${result.cost.padEnd(8)} | ${ms}ms`
      );
    } catch (err: any) {
      console.log(`${agent.name} | ${q.padEnd(20)} | ❌ ${err.message}`);
    }

    i++;
    const jitter = Math.random() * 2000;
    await new Promise((r) => setTimeout(r, agent.delay + jitter));
  }
}

console.log("\n🚀 Agent Swarm — x402 Gateway\n");
console.log("─".repeat(70));
Promise.all(agents.map(runAgent));
```

**Lancer** :
```bash
npx ts-node --esm agents/swarm.ts
```

**Output attendu :**
```
🚀 Agent Swarm — x402 Gateway

──────────────────────────────────────────────────────────────────────
🤖 Price-Bot started — wallet: 0xab12cd…
🌤 Weather-Bot started — wallet: 0xab12cd…
🧠 AI-Bot started — wallet: 0xab12cd…

🤖 Price-Bot   | ETH price            | 🔥 FRESH | $0.01    | 342ms
🌤 Weather-Bot | Denver weather       | 🔥 FRESH | $0.01    | 289ms
🤖 Price-Bot   | BTC price            | 🔥 FRESH | $0.01    | 311ms
🧠 AI-Bot      | what is Monad        | 🔥 FRESH | $0.01    | 1203ms
🤖 Price-Bot   | ETH price            | 📦 CACHE | $0.0001  | 89ms    ← CACHE HIT
🌤 Weather-Bot | Denver weather       | 📦 CACHE | $0.0001  | 67ms    ← CACHE HIT
🌤 Weather-Bot | Tokyo weather        | 🔥 FRESH | $0.01    | 278ms
🤖 Price-Bot   | SOL price            | 🔥 FRESH | $0.01    | 334ms
🧠 AI-Bot      | explain x402         | 🔥 FRESH | $0.01    | 987ms
🤖 Price-Bot   | ETH price            | 📦 CACHE | $0.0001  | 54ms    ← CACHE HIT
```

### 5:20 → 5:40 — Deploy

| Service | Outil | Commande |
|---|---|---|
| Contrats | Monad Testnet | déjà fait en Phase 1 |
| Backend | ngrok (rapide) | `ngrok http 3001` |
| Frontend | Vercel | `cd frontend && npx vercel` |
| CLI | npm link local | déjà fait en Phase 3 |

Mettre à jour le gateway URL partout après deploy :
```bash
# .env
GATEWAY_URL=https://xxxx.ngrok.io

# CLI
x402q "ETH price" --gateway https://xxxx.ngrok.io
```

### 5:40 → 6:00 — Script de démo

**Setup écran :**
```
┌───────────────────────────────────┬──────────────────────────┐
│                                   │                          │
│         Dashboard Web             │   Terminal 1 : CLI       │
│    (stats on-chain + live feed)   │                          │
│                                   │   Terminal 2 : Swarm     │
│                                   │                          │
└───────────────────────────────────┴──────────────────────────┘
```

**Script (3 min) :**

**[0:00 – 0:30] Le problème**
> "Les agents AI ont besoin de data — prix crypto, météo, réponses LLM. Aujourd'hui chaque API demande une clé, un compte, un abonnement. Un agent autonome ne peut pas gérer ça."

**[0:30 – 1:00] La solution**
> "x402 Gateway : un endpoint unique pour toutes les APIs. Le twist : la fraîcheur a un prix. Tu veux la donnée en premier ? Tu paies cher et tu la 'seedes' on-chain sur Monad. Tu arrives après ? C'est quasi gratuit, tu lis le cache."

**[1:00 – 2:00] Démo live**

Terminal 1 :
```bash
x402q "ETH price"
```
> "Première query. Cache miss. L'agent paie $0.01, le backend fetch CoinGecko, et le résultat est stocké on-chain dans notre contrat DataCache sur Monad."

*Pointer le dashboard → le seed apparaît*

```bash
x402q "ETH price"
```
> "Même query, 30 secondes plus tard. Cache hit. On-chain. $0.0001 au lieu de $0.01. La data était déjà là, payée par le premier user."

*Pointer le dashboard → le cache hit apparaît*

Terminal 2 :
```bash
npx ts-node agents/swarm.ts
```
> "Maintenant 3 agents autonomes. Ils query en boucle. Regardez : les premières queries sont des seeds (cher), puis les suivantes sont des cache hits (pas cher). Le réseau s'auto-optimise."

*Le dashboard explose de queries — les juges voient FRESH et CACHED alterner*

**[2:00 – 2:30] L'architecture**
> "Tout est on-chain. Le contrat DataCache sur Monad stocke chaque résultat, track les seeders, gère le TTL. Le contrat AgentPool permet un budget partagé. Le SDK fait 30 lignes. Le CLI wrappe le SDK."

**[2:30 – 3:00] La vision**
> "C'est un marché de la fraîcheur. Les trading bots paient cher pour être premiers. Les dashboards arrivent après et paient rien. Plus une donnée est populaire, plus vite elle est seedée, plus vite elle devient gratuite. C'est un CDN de données payant, on-chain, sur Monad."

---

## ⚡ Matrice de Priorités

### 🟢 MUST — sans ça, pas de projet

- [ ] **DataCache.sol** déployé sur Monad testnet
- [ ] **Backend** avec au moins `/api/query` qui check le contrat + fetch API + store on-chain
- [ ] **SDK** `createGatewayClient()` fonctionnel
- [ ] **CLI** `x402q "ETH price"` qui marche dans un terminal
- [ ] **1 query complète end-to-end** : cache miss → paiement → seed on-chain → cache hit → lecture on-chain

### 🟡 SHOULD — rend le projet compétitif

- [ ] **AgentPool.sol** déployé
- [ ] **x402 middleware** avec paiements réels via thirdweb
- [ ] **Dashboard** avec live feed SSE + stats on-chain
- [ ] **Swarm** d'au moins 2 agents qui query en boucle
- [ ] **Pricing différencié** visible : FRESH = cher, CACHED = pas cher

### 🔵 NICE TO HAVE — wow factor

- [ ] 3+ agents avec queries variées (prix, météo, AI)
- [ ] CLI coloré avec chalk + output FRESH/CACHED
- [ ] `x402q stats` qui lit les stats du contrat
- [ ] Frontend Landing Page + Dashboard
- [ ] Dashboard montre les tx Monad en temps réel

### 🔴 COUPER EN PREMIER si manque de temps

- AgentPool.sol (garder juste DataCache)
- Landing Page (aller direct au dashboard)
- Pricing dynamique x402 (mettre un prix fixe)
- Deploy (utiliser ngrok + localhost)
- Visualisation fancy

---

## 🔗 Ressources

| Ressource | URL |
|---|---|
| Monad x402 Guide | https://docs.monad.xyz/guides/x402-guide |
| thirdweb x402 | https://portal.thirdweb.com/x402 |
| x402 Protocol | https://github.com/coinbase/x402 |
| Monad Faucet | https://faucet.monad.xyz |
| Foundry Book | https://book.getfoundry.sh |
| viem Docs | https://viem.sh |
| Hono Framework | https://hono.dev |
| Commander.js | https://github.com/tj/commander.js |
| CoinGecko API | https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd |
| wttr.in API | https://wttr.in/denver?format=j1 |
| Groq Console | https://console.groq.com |

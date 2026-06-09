# Stocker des résultats d'API on-chain sur Monad

> Guide pas à pas : de l'appel API jusqu'au stockage on-chain et la relecture.

---

## Le Principe

```
API externe (CoinGecko)          Monad Testnet
        │                              │
        │  { "usd": 2847.32 }         │
        │                              │
        ▼                              ▼
    Backend Node.js             Smart Contract
        │                              │
        │  JSON.stringify()            │  string data
        │  ────────────────────────▶   │  = '{"usd":2847.32}'
        │                              │
        │  JSON.parse()                │
        │  ◀────────────────────────   │  return data
        │                              │
        ▼                              ▼
    Réponse au client           Stocké on-chain
```

Le contrat est un **key-value store bête**. Il ne comprend pas le JSON. Il stocke un `string` et le rend quand on le demande. Toute l'intelligence est côté backend.

---

## Étape 1 — Le Smart Contract

Le contrat stocke un mapping `bytes32 → string`. La clé c'est le hash de la query, la valeur c'est le résultat stringifié.

### `contracts/src/DataCache.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DataCache {

    struct CacheEntry {
        string data;          // '{"usd":2847.32,"usd_24h_change":3.42}'
        string query;         // "eth price"
        address seeder;       // 0xAb12... (qui a payé le fetch)
        uint256 timestamp;    // block.timestamp
        uint256 hits;         // nombre de lectures
        bool exists;
    }

    mapping(bytes32 => CacheEntry) public entries;

    uint256 public defaultTTL = 60; // 60 secondes
    address public owner;

    uint256 public totalSeeds;
    uint256 public totalHits;

    event DataSeeded(bytes32 indexed queryHash, string query, address indexed seeder);
    event CacheHit(bytes32 indexed queryHash, address indexed reader, uint256 hits);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Check si la donnée est en cache et pas expirée
    function checkCache(bytes32 queryHash)
        external
        view
        returns (bool isCached, string memory data)
    {
        CacheEntry storage entry = entries[queryHash];

        // Pas en cache
        if (!entry.exists) return (false, "");

        // Expiré (TTL dépassé)
        if (block.timestamp - entry.timestamp > defaultTTL) return (false, "");

        // En cache et frais
        return (true, entry.data);
    }

    /// @notice Stocker un résultat (appelé après un cache miss)
    function storeResult(
        bytes32 queryHash,
        string calldata query,
        string calldata data,
        address seeder
    ) external onlyOwner {
        entries[queryHash] = CacheEntry({
            data: data,
            query: query,
            seeder: seeder,
            timestamp: block.timestamp,
            hits: 0,
            exists: true
        });

        totalSeeds++;
        emit DataSeeded(queryHash, query, seeder);
    }

    /// @notice Lire depuis le cache (appelé lors d'un cache hit)
    function recordHit(bytes32 queryHash, address reader)
        external
        onlyOwner
        returns (string memory data)
    {
        CacheEntry storage entry = entries[queryHash];
        require(entry.exists, "Not found");
        require(block.timestamp - entry.timestamp <= defaultTTL, "Expired");

        entry.hits++;
        totalHits++;

        emit CacheHit(queryHash, reader, entry.hits);
        return entry.data;
    }

    /// @notice Stats pour le dashboard
    function getStats()
        external
        view
        returns (uint256 seeds, uint256 hits)
    {
        return (totalSeeds, totalHits);
    }

    function setTTL(uint256 newTTL) external onlyOwner {
        defaultTTL = newTTL;
    }
}
```

---

## Étape 2 — Déployer sur Monad Testnet

### Prérequis

```bash
# Installer Foundry si pas fait
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Config Foundry

#### `contracts/foundry.toml`

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
evm_version = "shanghai"

[rpc_endpoints]
monad = "https://testnet-rpc.monad.xyz"
```

### Script de déploiement

#### `contracts/script/Deploy.s.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/DataCache.sol";

contract Deploy is Script {
    function run() external {
        uint256 key = vm.envUint("BACKEND_PRIVATE_KEY");
        vm.startBroadcast(key);

        DataCache cache = new DataCache();
        console.log("DataCache:", address(cache));

        vm.stopBroadcast();
    }
}
```

### Déployer

```bash
cd contracts

# S'assurer que le wallet a du MON testnet depuis https://faucet.monad.xyz

# Compiler
forge build

# Déployer
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $BACKEND_PRIVATE_KEY \
  --broadcast \
  --chain-id 10143

# Output :
# DataCache: 0x1234abcd...
#
# → Copier cette adresse dans .env : DATACACHE_ADDRESS=0x1234abcd...
```

### Vérifier sur l'explorer

Aller sur `https://testnet.monadexplorer.com/address/0x1234abcd...` — le contrat doit apparaître.

---

## Étape 3 — Le Backend parle au contrat

### Installer viem

```bash
cd backend
npm install viem
```

### Définir la chain Monad

Monad n'est pas dans les presets de viem, on la définit manuellement.

#### `backend/src/chain.ts`

```ts
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

// ── 1. Définir la chain Monad ─────────────────────────────

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
});

// ── 2. ABI du contrat (juste les fonctions utilisées) ─────

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
    ],
  },
] as const;

// ── 3. Créer les clients viem ─────────────────────────────

const account = privateKeyToAccount(
  process.env.BACKEND_PRIVATE_KEY! as `0x${string}`
);

// Client pour LIRE le contrat (pas besoin de wallet)
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

// Client pour ÉCRIRE dans le contrat (a besoin du wallet backend)
export const walletClient = createWalletClient({
  account,
  chain: monadTestnet,
  transport: http(),
});

// Adresse du contrat déployé
const cacheAddress = process.env.DATACACHE_ADDRESS! as `0x${string}`;

// ── 4. Fonctions helpers ──────────────────────────────────

/// Hasher une query → bytes32 (déterministe)
///   "ETH price" → 0x8a3f...
///   "eth price" → même hash (on lowercase)
export function hashQuery(query: string): `0x${string}` {
  return keccak256(toHex(query.toLowerCase().trim()));
}

/// LIRE : est-ce que la query est en cache on-chain ?
///   → Appelle checkCache() sur le contrat (gratuit, pas de gas)
///   → Retourne { isCached: true/false, data: "..." }
export async function checkOnChainCache(queryHash: `0x${string}`) {
  const result = await publicClient.readContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "checkCache",
    args: [queryHash],
  });
  return {
    isCached: result[0] as boolean,
    data: result[1] as string,
  };
}

/// ÉCRIRE : stocker un résultat on-chain (après cache miss)
///   → Appelle storeResult() sur le contrat (coûte du gas MON)
///   → Le backend signe la tx avec son wallet
export async function storeResultOnChain(
  queryHash: `0x${string}`,
  query: string,
  data: string,
  seeder: string
) {
  const txHash = await walletClient.writeContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "storeResult",
    args: [queryHash, query, data, seeder as `0x${string}`],
  });
  return txHash;
}

/// ÉCRIRE : enregistrer un cache hit on-chain
///   → Appelle recordHit() sur le contrat (coûte du gas MON)
///   → Incrémente le compteur de hits
///   → Retourne la data stockée
export async function recordHitOnChain(
  queryHash: `0x${string}`,
  reader: string
) {
  const txHash = await walletClient.writeContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "recordHit",
    args: [queryHash, reader as `0x${string}`],
  });
  return txHash;
}

/// LIRE : stats globales
export async function getOnChainStats() {
  const result = await publicClient.readContract({
    address: cacheAddress,
    abi: DATACACHE_ABI,
    functionName: "getStats",
  });
  return {
    seeds: result[0] as bigint,
    hits: result[1] as bigint,
  };
}
```

**Résumé des 4 fonctions :**

| Fonction | Type | Gas (MON) | Quand |
|---|---|---|---|
| `checkOnChainCache()` | READ | Gratuit | Avant chaque query |
| `storeResultOnChain()` | WRITE | Coûte du gas | Cache miss (premier fetch) |
| `recordHitOnChain()` | WRITE | Coûte du gas | Cache hit (lecture) |
| `getOnChainStats()` | READ | Gratuit | Dashboard stats |

---

## Étape 4 — La Route Backend qui fait tout

C'est ici que tout se connecte. La route reçoit une query, check le contrat, et soit fetch + store, soit lit le cache.

#### `backend/src/routes/query.ts`

```ts
import { Hono } from "hono";
import {
  hashQuery,
  checkOnChainCache,
  storeResultOnChain,
  recordHitOnChain,
} from "../chain.js";

const query = new Hono();

query.post("/", async (c) => {
  const { query: input } = await c.req.json();
  if (!input) return c.json({ error: "Missing query" }, 400);

  // ── ÉTAPE A : Hasher la query ──────────────────────────
  //
  //   "ETH price" → keccak256("eth price") → 0x8a3f...
  //
  const queryHash = hashQuery(input);

  // L'adresse du payer (extraite par le middleware x402)
  const payer = c.req.header("x-payer") || "0x0000000000000000000000000000000000000000";


  // ── ÉTAPE B : Check le contrat on-chain ────────────────
  //
  //   publicClient.readContract → checkCache(0x8a3f...)
  //   → { isCached: true/false, data: "..." }
  //   → C'est un READ, gratuit, pas de gas
  //
  const { isCached, data: cachedData } = await checkOnChainCache(queryHash);


  // ═══════════════════════════════════════════════════════
  //   CAS 1 : CACHE HIT — la donnée est fraîche on-chain
  // ═══════════════════════════════════════════════════════

  if (isCached) {
    //
    //   La donnée existe et le TTL n'est pas dépassé.
    //   On la lit depuis le contrat.
    //   Le user paie PEU (ou gratuit).
    //

    // Enregistrer le hit on-chain (hits++ dans le contrat)
    //   → C'est un WRITE, coûte du gas MON
    //   → Le backend signe avec son wallet
    const txHash = await recordHitOnChain(queryHash, payer);

    // cachedData = '{"usd":2847.32,"usd_24h_change":3.42}'
    // On le parse pour renvoyer du JSON propre au client
    const parsed = JSON.parse(cachedData);

    return c.json({
      query: input,
      data: parsed,
      cached: true,
      cost: "$0.0001",
      txHash,
      source: "on-chain cache (Monad)",
    });
  }


  // ═══════════════════════════════════════════════════════
  //   CAS 2 : CACHE MISS — la donnée n'existe pas ou a expiré
  // ═══════════════════════════════════════════════════════

  //
  //   Le user paie CHER ($0.01).
  //   On fetch l'API externe, puis on stocke on-chain.
  //

  // ── Étape C : Fetch l'API externe ──────────────────────
  //
  //   Ici on détermine quelle API appeler en fonction de la query.
  //   Pour simplifier, on montre le cas "price".
  //
  const apiResponse = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true`
  );
  const apiJson = await apiResponse.json();
  // apiJson = { "ethereum": { "usd": 2847.32, "usd_24h_change": 3.42 } }


  // ── Étape D : Stringify le résultat ────────────────────
  //
  //   Le contrat stocke un string.
  //   On convertit le JSON en string.
  //
  const dataString = JSON.stringify(apiJson);
  // dataString = '{"ethereum":{"usd":2847.32,"usd_24h_change":3.42}}'


  // ── Étape E : Écrire on-chain ──────────────────────────
  //
  //   walletClient.writeContract → storeResult(hash, query, data, seeder)
  //   → C'est un WRITE, coûte du gas MON
  //   → Le backend signe la tx avec BACKEND_PRIVATE_KEY
  //   → La tx est envoyée au RPC Monad https://testnet-rpc.monad.xyz
  //   → La tx est minée en ~1 seconde (Monad est rapide)
  //   → Le résultat est maintenant on-chain pour tout le monde
  //
  const txHash = await storeResultOnChain(
    queryHash,        // 0x8a3f...
    input,            // "ETH price"
    dataString,       // '{"ethereum":{"usd":2847.32,...}}'
    payer,            // 0xAb12... (le premier à avoir payé)
  );


  // ── Étape F : Retourner la réponse au client ───────────

  return c.json({
    query: input,
    data: apiJson,            // Le JSON parsé, pas le string
    cached: false,
    cost: "$0.01",
    seeder: payer,            // "C'est toi qui a seedé cette donnée"
    txHash,                   // Le hash de la tx Monad
    explorerUrl: `https://testnet.monadexplorer.com/tx/${txHash}`,
    source: "coingecko → stored on Monad",
  });
});

export default query;
```

---

## Étape 5 — Ce qui se passe on-chain

Après quelques queries, voilà l'état du contrat sur Monad :

```
entries[0x8a3f...] = {
    data:      '{"ethereum":{"usd":2847.32,"usd_24h_change":3.42}}',
    query:     "eth price",
    seeder:    0xAb12...3f4d,
    timestamp: 1739800000,
    hits:      7,
    exists:    true
}

entries[0xb2c1...] = {
    data:      '{"temperature":"12","condition":"Partly Cloudy"}',
    query:     "new york weather",
    seeder:    0xCd34...9e1a,
    timestamp: 1739800030,
    hits:      3,
    exists:    true
}

entries[0xf5e6...] = {
    data:      'Monad is a high-performance EVM L1 with 10k TPS.',
    query:     "what is monad",
    seeder:    0xEf56...7b2c,
    timestamp: 1739800045,
    hits:      12,
    exists:    true
}

totalSeeds = 3     ← 3 queries uniques
totalHits  = 22    ← 22 lectures depuis le cache
```

Chaque `storeResult()` et `recordHit()` génère une **transaction visible** sur `https://testnet.monadexplorer.com`. Les juges peuvent voir :

- L'adresse du contrat
- Chaque tx avec ses paramètres
- Les events `DataSeeded` et `CacheHit`
- Le nombre total de seeds et hits

---

## Résumé du Flow

```
                        Query arrive
                            │
                            ▼
                   hashQuery("ETH price")
                   → 0x8a3f...
                            │
                            ▼
              ┌─── checkCache(0x8a3f...) ───┐
              │        READ (gratuit)        │
              │                              │
         isCached?                      isCached?
           false                          true
              │                              │
              ▼                              ▼
     Payer CHER ($0.01)            Payer PEU ($0.0001)
              │                              │
              ▼                              ▼
      fetch CoinGecko              recordHit(hash, reader)
              │                      WRITE (gas MON)
              ▼                              │
     JSON.stringify(response)                ▼
              │                     Lire entry.data
              ▼                     du contrat
     storeResult(                            │
       hash,                                 ▼
       "eth price",                 JSON.parse(data)
       '{"usd":2847}',                      │
       0xSeeder                              ▼
     )                              Retourner au client
     WRITE (gas MON)                cached: true
              │
              ▼
     Retourner au client
     cached: false
     seeder: 0x...
```

**3 choses à retenir :**

1. **READ = gratuit.** `checkCache()` et `getStats()` ne coûtent pas de gas. C'est juste une lecture.
2. **WRITE = coûte du gas MON.** `storeResult()` et `recordHit()` sont des transactions. Le backend les signe avec `BACKEND_PRIVATE_KEY`. Assure-toi que ce wallet a du MON depuis le faucet.
3. **Le contrat ne comprend pas le JSON.** Il stocke un `string`. Le backend fait `JSON.stringify()` avant d'écrire et `JSON.parse()` après avoir lu.

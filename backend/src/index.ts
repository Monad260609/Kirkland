import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import "dotenv/config";

import { hashQuery, checkOnChainCache, getOnChainStats } from "./chain.js";
import { x402Middleware } from "./middleware/x402.js";
import { sseHandler } from "./events.js";
import query from "./routes/query.js";

const app = new Hono();

// ══════════════════════════════════════════════════════════
//  CORS
// ══════════════════════════════════════════════════════════

app.use("*", cors());

// ══════════════════════════════════════════════════════════
//  PRE-CHECK MIDDLEWARE
//  Verifie le cache on-chain AVANT le middleware x402.
//  Si la query est en cache → bypass le paywall ($0.0001)
//  Si la query n'est PAS en cache → x402 exige $0.01
// ══════════════════════════════════════════════════════════

app.use("/api/query", async (c, next) => {
  // Seul POST est concerne
  if (c.req.method !== "POST") return next();

  try {
    const body = await c.req.json();
    const input: string = body.query;

    if (!input) return next();

    const queryHash = hashQuery(input);
    const result = await checkOnChainCache(queryHash);

    // Stocker les resultats pour eviter un double call dans query.ts
    c.set("parsedBody", body);
    c.set("queryHash", queryHash);
    c.set("isCached", result.isCached);

    if (result.isCached) {
      // Cache HIT → bypass x402, aller directement au handler
      return next();
    }
  } catch {
    // En cas d'erreur, laisser le flow normal (x402 + query)
  }

  return next();
});

// ══════════════════════════════════════════════════════════
//  x402 PAYMENT MIDDLEWARE
//  Applique uniquement aux cache MISS (le pre-check
//  a deja laisse passer les cache hits)
// ══════════════════════════════════════════════════════════

app.use("/api/query", async (c, next) => {
  const isCached = c.get("isCached") as boolean | undefined;

  // Si c'est un cache hit, bypass le paywall x402
  if (isCached === true) {
    return next();
  }

  // Cache miss ou erreur de pre-check → exiger le paiement x402
  return x402Middleware(c, next);
});

// ══════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════

// POST /api/query — route principale (cache hit ou miss)
app.route("/api/query", query);

// GET /api/events — SSE live feed pour le dashboard
app.get("/api/events", sseHandler);

// GET /api/stats — stats globales du cache on-chain
app.get("/api/stats", async (c) => {
  const stats = await getOnChainStats();
  return c.json({
    seeds: stats.seeds.toString(),
    hits: stats.hits.toString(),
    queries: stats.queries.toString(),
  });
});

// GET /health — health check
app.get("/health", (c) => c.json({ status: "ok" }));

// ══════════════════════════════════════════════════════════
//  START SERVER
// ══════════════════════════════════════════════════════════

const port = Number(process.env.PORT) || 4402;

serve({ fetch: app.fetch, port }, () => {
  console.log(`⚡ x402 Gateway running on http://localhost:${port}`);
  console.log(`   POST /api/query   — query the gateway`);
  console.log(`   GET  /api/events  — SSE live feed`);
  console.log(`   GET  /api/stats   — on-chain stats`);
});

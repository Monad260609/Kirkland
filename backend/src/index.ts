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
//  Check the on-chain cache BEFORE the x402 middleware.
//  If the query is cached → bypass the paywall ($0.0001)
//  If the query is NOT cached → x402 requires $0.01
// ══════════════════════════════════════════════════════════

app.use("/api/query", async (c, next) => {
  // Only POST is relevant
  if (c.req.method !== "POST") return next();

  try {
    const body = await c.req.json();
    const input: string = body.query;

    if (!input) return next();

    const queryHash = hashQuery(input);
    const result = await checkOnChainCache(queryHash);

    // Store the results to avoid a double call in query.ts
    c.set("parsedBody", body);
    c.set("queryHash", queryHash);
    c.set("isCached", result.isCached);

    if (result.isCached) {
      // Cache HIT → bypass x402, go directly to handler
      return next();
    }
  } catch {
    // On error, let the normal flow continue (x402 + query)
  }

  return next();
});

// ══════════════════════════════════════════════════════════
//  x402 PAYMENT MIDDLEWARE
//  Only applies to cache MISS (the pre-check
//  already let cache hits through)
// ══════════════════════════════════════════════════════════

app.use("/api/query", async (c, next) => {
  const isCached = c.get("isCached") as boolean | undefined;

  // If it's a cache hit, bypass the x402 paywall
  if (isCached === true) {
    return next();
  }

  // Cache miss or pre-check error → require x402 payment
  return x402Middleware(c, next);
});

// ══════════════════════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════════════════════

// POST /api/query — main route (cache hit or miss)
app.route("/api/query", query);

// GET /api/events — SSE live feed for the dashboard
app.get("/api/events", sseHandler);

// GET /api/stats — global on-chain cache stats
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

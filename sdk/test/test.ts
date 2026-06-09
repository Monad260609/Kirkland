import "dotenv/config";
import { CacheMarket } from "../src/index.js";

const client = new CacheMarket({
  privateKey: process.env.PRIVATE_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
});

// ── helpers ────────────────────────────────────────────────

const pass = (label: string) => console.log(`  ✅ ${label}`);
const fail = (label: string, err: unknown) =>
  console.error(`  ❌ ${label}:`, (err as Error).message);

async function run(label: string, fn: () => Promise<void>) {
  process.stdout.write(`\n▶ ${label}\n`);
  try {
    await fn();
  } catch (err) {
    fail("Unexpected error", err);
  }
}

// ── tests ──────────────────────────────────────────────────

async function main() {
  console.log("\n⬡  Cachemarket SDK — Test Suite\n" + "─".repeat(40));

  // 1. Stats (read-only, no key needed)
  await run("getStats()", async () => {
    const stats = await client.getStats();
    console.log(`     seeds=${stats.seeds}  hits=${stats.hits}  queries=${stats.queries}`);
    pass("getStats returned");
  });

  // 2. hashQuery
  await run("hashQuery()", async () => {
    const h = client.hashQuery("price of ETH");
    if (!h.startsWith("0x") || h.length !== 66) throw new Error("Invalid hash");
    console.log(`     ${h}`);
    pass("hashQuery is valid bytes32");
  });

  // 3. checkCache — lecture seule
  await run("checkCache('price of ETH')", async () => {
    const result = await client.checkCache("price of ETH");
    console.log(`     isCached=${result.isCached}`);
    if (result.isCached) {
      console.log(`     data=`, result.data);
    }
    pass("checkCache returned");
  });

  // 4. query ETH price
  await run("query('price of ETH')", async () => {
    const result = await client.query("price of ETH");
    console.log(`     cached=${result.cached}  source=${result.source}`);
    console.log(`     data=`, result.data);
    if (result.txHash) console.log(`     tx=${result.txHash}`);
    if (!result.data || result.data.usd === undefined)
      throw new Error("Missing usd in data");
    pass(`Price of ETH: $${result.data.usd}`);
  });

  // 5. query weather
  await run("query('weather in New York')", async () => {
    const result = await client.query("weather in New York");
    console.log(`     cached=${result.cached}  source=${result.source}`);
    console.log(`     data=`, result.data);
    pass("Weather fetched");
  });

  // 6. query country
  await run("query('France info')", async () => {
    const result = await client.query("France info");
    console.log(`     cached=${result.cached}`);
    console.log(`     data=`, result.data);
    pass("Country fetched");
  });

  console.log("\n" + "─".repeat(40));
  console.log("✅ Test suite complete\n");
}

main().catch(err => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});

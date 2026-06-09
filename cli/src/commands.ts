import {
  hashQuery,
  checkCache,
  storeResult,
  recordHits,
  getStats,
  getWalletClient,
  CACHE_ADDRESS,
} from "./wallet.js";

// ── ANSI colors ────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  purple: "\x1b[35m",
  white: "\x1b[37m",
};

const EXPLORER_TX = "https://testnet.monadexplorer.com/tx/";
const EXPLORER_ADDR = "https://testnet.monadexplorer.com/address/";

function line(msg = "") { process.stdout.write(msg + "\n"); }
function step(msg: string) { process.stdout.write(`  ${C.dim}›${C.reset} ${msg}\n`); }
function ok(msg: string) { process.stdout.write(`  ${C.green}✓${C.reset} ${msg}\n`); }
function fail(msg: string) { process.stdout.write(`  ${C.red}✗${C.reset} ${msg}\n`); }
function shortTx(h: string) { return h.slice(0, 10) + "…" + h.slice(-6); }

// ── Intent detection ───────────────────────────────────────

type IntentType = "price" | "weather" | "country" | "ai";

function detectIntent(input: string): { type: IntentType; param: string } {
  const lower = input.toLowerCase().trim();

  if (/weather|temperature|forecast/.test(lower)) {
    // \b guards keep city names intact ("Beijing", "Singapore" both contain "in")
    const city = lower
      .replace(/\b(weather|temperature|forecast|in|for)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return { type: "weather", param: city || "new york" };
  }

  if (/price|eth|btc|sol|bitcoin|ethereum|solana|mon|monad/.test(lower)) {
    const tokenMap: Record<string, string> = {
      eth: "ethereum", btc: "bitcoin", sol: "solana",
      mon: "monad", monad: "monad",
      ethereum: "ethereum", bitcoin: "bitcoin", solana: "solana",
    };
    const SKIP = /^(price|of|the|a|an)$/;
    const words = lower.replace(/[?!.,]/g, "").trim().split(/\s+/);
    const token = words.find(w => !SKIP.test(w) && w.length > 1) ?? "ethereum";
    return { type: "price", param: tokenMap[token] ?? token };
  }

  if (/country|nation|population|capital/.test(lower)) {
    const country = lower
      .replace(/country|nation|population|capital|info|of/g, "")
      .trim();
    return { type: "country", param: country || "usa" };
  }

  return { type: "ai", param: input };
}

// ── External API fetchers ──────────────────────────────────

async function fetchData(type: IntentType, param: string): Promise<Record<string, unknown>> {
  if (type === "price") {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${param}&vs_currencies=usd&include_24hr_change=true`,
    );
    const json = await res.json() as Record<string, Record<string, number>>;
    return {
      token: param,
      usd: json[param]?.usd ?? 0,
      usd_24h_change: json[param]?.usd_24h_change ?? 0,
    };
  }

  if (type === "weather") {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(param)}?format=j1`);
    const json = await res.json() as Record<string, unknown>;
    const cur = (json.current_condition as Record<string, unknown>[])?.[0] ?? {};
    const desc = (cur.weatherDesc as { value: string }[])?.[0]?.value ?? "Unknown";
    return {
      city: param,
      temperature: cur.temp_F ?? "N/A",
      condition: desc,
      humidity: cur.humidity ?? "N/A",
      wind_mph: cur.windspeedMiles ?? "N/A",
    };
  }

  if (type === "country") {
    const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(param)}`);
    const json = await res.json() as Record<string, unknown>[];
    const c = json[0] as Record<string, unknown>;
    const name = (c.name as Record<string, unknown>)?.common ?? param;
    const cap = (c.capital as string[])?.[0] ?? "N/A";
    const pop = c.population ?? "N/A";
    const region = c.region ?? "N/A";
    return { name, capital: cap, population: pop, region };
  }

  // AI fallback via Groq
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return { answer: "GROQ_API_KEY not set — AI queries unavailable." };

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Answer concisely in 1-3 sentences." },
        { role: "user", content: param },
      ],
      max_tokens: 150,
    }),
  });
  const json = await res.json() as Record<string, unknown>;
  const choices = json.choices as { message: { content: string } }[];
  return { answer: choices?.[0]?.message?.content ?? "No response" };
}

// ── Display result ─────────────────────────────────────────

function displayData(type: IntentType, data: Record<string, unknown>) {
  line(`${C.bold}${"─".repeat(50)}${C.reset}`);
  line(`${C.bold}${C.white}  Result${C.reset}`);
  line(`${C.dim}${"─".repeat(50)}${C.reset}`);

  if (type === "price") {
    line(`  ${C.bold}Price${C.reset}      ${C.green}$${data.usd}${C.reset}`);
    const change = Number(data.usd_24h_change).toFixed(2);
    const col = Number(change) >= 0 ? C.green : C.red;
    line(`  ${C.bold}24h${C.reset}        ${col}${change}%${C.reset}`);
    line(`  ${C.bold}Token${C.reset}      ${String(data.token).toUpperCase()}`);
  } else if (type === "weather") {
    line(`  ${C.bold}City${C.reset}        ${data.city}`);
    line(`  ${C.bold}Temperature${C.reset} ${C.cyan}${data.temperature}°F${C.reset}`);
    line(`  ${C.bold}Condition${C.reset}   ${data.condition}`);
    line(`  ${C.bold}Humidity${C.reset}    ${data.humidity}%`);
    line(`  ${C.bold}Wind${C.reset}        ${data.wind_mph} mph`);
  } else {
    for (const [k, v] of Object.entries(data)) {
      line(`  ${C.bold}${k}${C.reset}  ${v}`);
    }
  }
}

// ── query command ──────────────────────────────────────────

export async function queryCommand(query: string) {
  line();
  line(`${C.bold}${C.purple}⬡  Cachemarket${C.reset}  ${C.dim}on-chain data protocol${C.reset}`);
  line(`${C.dim}${"─".repeat(50)}${C.reset}`);
  line(`   ${C.bold}Query${C.reset}  ${C.cyan}${query}${C.reset}`);
  line();

  // ── 1. Hash + check on-chain cache ────────────────────
  step("Checking on-chain cache…");
  const qHash = hashQuery(query);
  const { isCached, data: cachedData } = await checkCache(qHash);

  if (isCached) {
    ok(`Cache ${C.green}HIT${C.reset} — data is fresh on-chain`);
    line();

    // Record hit on-chain (non-blocking)
    let hitTx: string | null = null;
    try {
      hitTx = await recordHits(qHash, 1n);
    } catch {
      // best effort
    }

    const parsed = JSON.parse(cachedData) as Record<string, unknown>;
    const { type } = detectIntent(query);
    displayData(type, parsed);

    line();
    line(`${C.dim}${"─".repeat(50)}${C.reset}`);
    line(`  ${C.dim}Status${C.reset}    ${C.green}CACHE HIT${C.reset}`);
    line(`  ${C.dim}Source${C.reset}    on-chain (Monad)`);
    line(`  ${C.dim}Cost${C.reset}      gas only`);
    if (hitTx) line(`  ${C.dim}Hit tx${C.reset}    ${EXPLORER_TX}${hitTx}`);
    line();
    return;
  }

  step(`Cache ${C.yellow}MISS${C.reset} — fetching from external API…`);

  // ── 2. Detect intent + fetch external data ─────────────
  const { type, param } = detectIntent(query);

  let apiData: Record<string, unknown>;
  try {
    apiData = await fetchData(type, param);
  } catch (err: unknown) {
    fail(`Fetch failed: ${(err as Error).message}`);
    process.exit(1);
  }

  ok(`Fetched  ${C.dim}(${type} / ${param})${C.reset}`);

  // ── 3. Store on-chain (owner tx, retry on 429) ────────
  step("Storing result on Monad…");

  let { account } = getWalletClient();
  let txHash = "";
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      txHash = await storeResult(qHash, query, JSON.stringify(apiData), account.address);
      lastErr = null;
      break;
    } catch (err: unknown) {
      lastErr = err as Error;
      if (attempt < 3 && lastErr.message.includes("429")) {
        step(`RPC rate-limited, retrying in ${attempt * 2}s… (${attempt}/3)`);
        await new Promise(r => setTimeout(r, attempt * 2000));
      } else {
        break;
      }
    }
  }
  if (lastErr) {
    fail(`storeResult failed: ${lastErr.message}`);
    process.exit(1);
  }

  ok(`Stored on-chain  ${C.dim}${shortTx(txHash)}${C.reset}`);
  line(`   ${C.dim}${EXPLORER_TX}${txHash}${C.reset}`);

  // ── Display ────────────────────────────────────────────
  line();
  displayData(type, apiData);

  line();
  line(`${C.dim}${"─".repeat(50)}${C.reset}`);
  line(`  ${C.dim}Status${C.reset}    ${C.yellow}CACHE MISS (seeded)${C.reset}`);
  line(`  ${C.dim}Source${C.reset}    ${type} → stored on Monad`);
  line(`  ${C.dim}Seeder${C.reset}    ${account.address}`);
  line(`  ${C.dim}Explorer${C.reset}  ${EXPLORER_TX}${txHash}`);
  line();
}

// ── stats command ──────────────────────────────────────────

export async function statsCommand() {
  line();
  line(`${C.bold}${C.purple}⬡  Cachemarket${C.reset}  ${C.dim}On-Chain Stats${C.reset}`);
  line(`${C.dim}${"─".repeat(40)}${C.reset}`);

  step("Reading contract on Monad Testnet…");

  try {
    const { seeds, hits, queries } = await getStats();
    line();
    line(`  ${C.bold}Total Seeds${C.reset}    ${C.yellow}${seeds.toString()}${C.reset}`);
    line(`  ${C.bold}Cache Hits${C.reset}     ${C.green}${hits.toString()}${C.reset}`);
    line(`  ${C.bold}Total Queries${C.reset}  ${C.cyan}${queries.toString()}${C.reset}`);
    line();
    line(`  ${C.dim}Contract  ${EXPLORER_ADDR}${CACHE_ADDRESS}${C.reset}`);
    line(`  ${C.dim}Network   Monad Testnet (chain 10143)${C.reset}`);
    line();
  } catch (err: unknown) {
    fail(`Contract read failed: ${(err as Error).message}`);
    process.exit(1);
  }
}

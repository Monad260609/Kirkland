/// Retry wrapper for external API calls
async function fetchWithRetry(url: string, retries = 3, baseDelay = 500): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || i === retries) return res;
      // Retry on 5xx or 429
      if (res.status >= 500 || res.status === 429) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
        continue;
      }
      return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
    }
  }
  throw new Error("Unreachable");
}

/// Fetch crypto price from CoinGecko (free, no API key)
export async function fetchPrice(token: string): Promise<string> {
  const res = await fetchWithRetry(
    `https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd&include_24hr_change=true`,
  );
  const json = await res.json();
  const data = json[token];
  if (!data) return JSON.stringify({ error: `Token "${token}" not found` });
  return JSON.stringify(data);
}

/// Fetch weather from wttr.in (free, no API key)
export async function fetchWeather(city: string): Promise<string> {
  const res = await fetchWithRetry(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
  const json = await res.json();
  const cur = json.current_condition?.[0];
  if (!cur) return JSON.stringify({ error: `City "${city}" not found` });
  return JSON.stringify({
    temperature: cur.temp_F,
    condition: cur.weatherDesc?.[0]?.value,
    humidity: cur.humidity,
    feelsLike: cur.FeelsLikeF,
    wind: cur.windspeedMiles,
  });
}

/// Fetch country info from REST Countries (free, no API key)
export async function fetchCountry(country: string): Promise<string> {
  const res = await fetchWithRetry(
    `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fields=name,capital,population,currencies,region,flags`,
  );
  const json = await res.json();
  if (json.status === 404 || json.message) return JSON.stringify({ error: `Country "${country}" not found` });
  const c = json[0];
  const currencyKey = c.currencies ? Object.keys(c.currencies)[0] : null;
  return JSON.stringify({
    name: c.name?.common,
    capital: c.capital?.[0],
    population: c.population,
    currency: currencyKey ? c.currencies[currencyKey].name : null,
    region: c.region,
    flag: c.flags?.emoji,
  });
}

/// Fetch a Uniswap quote (Ethereum mainnet pools, cached on Monad).
/// param shape: "<amountIn>:<tokenIn>:<tokenOut>" e.g. "1:eth:usdc"
export async function fetchSwapQuote(param: string): Promise<string> {
  const [amount, tokenIn, tokenOut] = param.split(":");
  if (!tokenIn || !tokenOut) {
    return JSON.stringify({ error: `Invalid swap param: ${param}` });
  }
  const { fetchUniswapQuote } = await import("./uniswap");
  try {
    const quote = await fetchUniswapQuote(tokenIn, tokenOut, amount || "1");
    return JSON.stringify(quote);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return JSON.stringify({ error: message });
  }
}

/// Route to the right fetcher based on intent type
export async function fetchFromSource(type: string, param: string): Promise<string> {
  switch (type) {
    case "price":
      return fetchPrice(param);
    case "weather":
      return fetchWeather(param);
    case "country":
      return fetchCountry(param);
    case "swap-quote":
      return fetchSwapQuote(param);
    default:
      return JSON.stringify({ error: "Unknown query type" });
  }
}

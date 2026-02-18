/// Fetch crypto price from CoinGecko (free, no API key)
export async function fetchPrice(token: string): Promise<string> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd&include_24hr_change=true`,
  );
  if (!res.ok) return JSON.stringify({ error: `CoinGecko error: ${res.status}` });
  const json = await res.json();
  const data = json[token];
  if (!data) return JSON.stringify({ error: `Token "${token}" not found` });
  return JSON.stringify(data);
}

/// Fetch weather from wttr.in (free, no API key)
/// wttr.in rate-limits aggressively — retry with backoff and send a curl-like User-Agent.
export async function fetchWeather(city: string): Promise<string> {
  const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
  const headers = { "User-Agent": "curl/7.68.0", Accept: "application/json" };
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue;
        }
        return JSON.stringify({ error: `Weather API error: ${res.status}` });
      }

      const text = await res.text();
      if (!text || text.trim().length === 0) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue;
        }
        return JSON.stringify({ error: "Weather API returned empty response (rate limited)" });
      }

      const json = JSON.parse(text);
      const cur = json.current_condition?.[0];
      if (!cur) return JSON.stringify({ error: `City "${city}" not found` });
      return JSON.stringify({
        temperature: cur.temp_F,
        condition: cur.weatherDesc?.[0]?.value,
        humidity: cur.humidity,
        feelsLike: cur.FeelsLikeF,
        wind: cur.windspeedMiles,
      });
    } catch {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      return JSON.stringify({ error: "Weather API unavailable — please try again later" });
    }
  }

  return JSON.stringify({ error: "Weather API unavailable — please try again later" });
}

/// Fetch country info from REST Countries (free, no API key)
export async function fetchCountry(country: string): Promise<string> {
  const res = await fetch(
    `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fields=name,capital,population,currencies,region,flags`,
  );
  if (!res.ok) return JSON.stringify({ error: `Country "${country}" not found` });
  let json;
  try {
    json = await res.json();
  } catch {
    return JSON.stringify({ error: "Country API returned invalid data" });
  }
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

/// Route to the right fetcher based on intent type
export async function fetchFromSource(type: string, param: string): Promise<string> {
  switch (type) {
    case "price":
      return fetchPrice(param);
    case "weather":
      return fetchWeather(param);
    case "country":
      return fetchCountry(param);
    default:
      return JSON.stringify({ error: "Unknown query type" });
  }
}

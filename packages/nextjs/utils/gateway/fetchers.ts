/// Fetch crypto price from CoinGecko (free, no API key)
export async function fetchPrice(token: string): Promise<string> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${token}&vs_currencies=usd&include_24hr_change=true`,
  );
  const json = await res.json();
  const data = json[token];
  if (!data) return JSON.stringify({ error: `Token "${token}" not found` });
  return JSON.stringify(data);
}

/// Fetch weather from wttr.in (free, no API key)
export async function fetchWeather(city: string): Promise<string> {
  const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
  const json = await res.json();
  const cur = json.current_condition?.[0];
  if (!cur) return JSON.stringify({ error: `City "${city}" not found` });
  return JSON.stringify({
    temperature: cur.temp_C,
    condition: cur.weatherDesc?.[0]?.value,
    humidity: cur.humidity,
    feelsLike: cur.FeelsLikeC,
    wind: cur.windspeedKmph,
  });
}

/// Fetch country info from REST Countries (free, no API key)
export async function fetchCountry(country: string): Promise<string> {
  const res = await fetch(
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

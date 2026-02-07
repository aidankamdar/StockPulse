const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

function getApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY is not set");
  return key;
}

interface FinnhubQuote {
  c: number;  // current price
  d: number;  // change
  dp: number; // percent change
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
  t: number;  // timestamp
}

interface FinnhubSearchResult {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

interface FinnhubCompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  finnhubIndustry: string;
  ipo: string;
  logo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
}

async function finnhubFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${FINNHUB_BASE_URL}${endpoint}`);
  url.searchParams.set("token", getApiKey());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 15 } });

  if (!res.ok) {
    throw new Error(`Finnhub API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Get real-time quote for a symbol.
 */
export async function getQuote(symbol: string) {
  const data = await finnhubFetch<FinnhubQuote>("/quote", { symbol });
  return {
    currentPrice: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
  };
}

/**
 * Search for stock symbols.
 */
export async function searchSymbols(query: string) {
  const data = await finnhubFetch<FinnhubSearchResult>("/search", { q: query });
  return data.result
    .filter((r) => r.type === "Common Stock")
    .slice(0, 10)
    .map((r) => ({
      symbol: r.symbol,
      description: r.description,
    }));
}

/**
 * Get company profile.
 */
export async function getCompanyProfile(symbol: string) {
  const data = await finnhubFetch<FinnhubCompanyProfile>("/stock/profile2", {
    symbol,
  });
  return {
    name: data.name,
    industry: data.finnhubIndustry,
    logo: data.logo,
    marketCap: data.marketCapitalization,
    exchange: data.exchange,
    webUrl: data.weburl,
  };
}

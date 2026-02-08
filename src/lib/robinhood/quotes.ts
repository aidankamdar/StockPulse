/**
 * Robinhood free stock data endpoints.
 * These require NO authentication and have no rate limits.
 * Used as the primary source for live quotes, fundamentals, and historicals.
 */

import { z } from "zod";

const BASE_URL = "https://api.robinhood.com";

const HEADERS = {
  Accept: "application/json",
} as const;

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const RobinhoodQuoteSchema = z.object({
  symbol: z.string(),
  last_trade_price: z.string(),
  previous_close: z.string(),
  adjusted_previous_close: z.string().nullable(),
  last_extended_hours_trade_price: z.string().nullable(),
  updated_at: z.string(),
  trading_halted: z.boolean(),
  instrument: z.string(),
});

const RobinhoodFundamentalsSchema = z.object({
  description: z.string().nullable(),
  market_cap: z.string().nullable(),
  pe_ratio: z.string().nullable(),
  dividend_yield: z.string().nullable(),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  ceo: z.string().nullable(),
  num_employees: z.number().nullable(),
  headquarters_city: z.string().nullable(),
  headquarters_state: z.string().nullable(),
  high: z.string().nullable(),
  low: z.string().nullable(),
  open: z.string().nullable(),
  high_52_weeks: z.string().nullable(),
  low_52_weeks: z.string().nullable(),
  volume: z.string().nullable(),
  average_volume: z.string().nullable(),
  average_volume_2_weeks: z.string().nullable(),
});

const HistoricalDataPointSchema = z.object({
  begins_at: z.string(),
  open_price: z.string(),
  close_price: z.string(),
  high_price: z.string(),
  low_price: z.string(),
  volume: z.number(),
  interpolated: z.boolean(),
});

const RobinhoodHistoricalsSchema = z.object({
  symbol: z.string(),
  historicals: z.array(HistoricalDataPointSchema),
  span: z.string(),
  interval: z.string(),
});

// ─── Exported Types ─────────────────────────────────────────────────────────

export type RobinhoodQuote = z.infer<typeof RobinhoodQuoteSchema>;
export type RobinhoodFundamentals = z.infer<typeof RobinhoodFundamentalsSchema>;
export type RobinhoodHistoricals = z.infer<typeof RobinhoodHistoricalsSchema>;
export type HistoricalDataPoint = z.infer<typeof HistoricalDataPointSchema>;

// ─── API Functions ──────────────────────────────────────────────────────────

/**
 * Fetch a live quote for a single symbol. No auth required.
 */
export async function getQuote(symbol: string): Promise<RobinhoodQuote> {
  const res = await fetch(`${BASE_URL}/quotes/${symbol.toUpperCase()}/`, {
    headers: HEADERS,
    next: { revalidate: 15 }, // 15s cache in Next.js
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch quote for ${symbol}: ${res.status}`);
  }

  const data = await res.json();
  return RobinhoodQuoteSchema.parse(data);
}

/**
 * Fetch quotes for multiple symbols in a single request (up to 1630).
 * No auth required.
 */
export async function getBatchQuotes(
  symbols: string[]
): Promise<RobinhoodQuote[]> {
  if (symbols.length === 0) return [];

  // Robinhood supports up to 1630 symbols in one batch
  const batch = symbols.slice(0, 1630).map((s) => s.toUpperCase());
  const res = await fetch(
    `${BASE_URL}/quotes/?symbols=${batch.join(",")}`,
    { headers: HEADERS }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch batch quotes: ${res.status}`);
  }

  const data = await res.json();
  const results = z.array(RobinhoodQuoteSchema).parse(data.results ?? []);
  return results;
}

/**
 * Fetch historical price data. No auth required.
 * @param interval - "5minute" | "10minute" | "day" | "week" | "month"
 * @param span - "day" | "week" | "month" | "3month" | "year" | "5year"
 */
export async function getHistoricals(
  symbol: string,
  interval: "5minute" | "10minute" | "day" | "week" | "month" = "day",
  span: "day" | "week" | "month" | "3month" | "year" | "5year" = "month"
): Promise<RobinhoodHistoricals> {
  const res = await fetch(
    `${BASE_URL}/quotes/historicals/${symbol.toUpperCase()}/?interval=${interval}&span=${span}`,
    { headers: HEADERS }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch historicals for ${symbol}: ${res.status}`
    );
  }

  const data = await res.json();
  return RobinhoodHistoricalsSchema.parse(data);
}

/**
 * Fetch company fundamentals. No auth required.
 */
export async function getFundamentals(
  symbol: string
): Promise<RobinhoodFundamentals> {
  const res = await fetch(
    `${BASE_URL}/fundamentals/${symbol.toUpperCase()}/`,
    { headers: HEADERS }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch fundamentals for ${symbol}: ${res.status}`
    );
  }

  const data = await res.json();
  return RobinhoodFundamentalsSchema.parse(data);
}

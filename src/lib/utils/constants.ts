export const APP_NAME = "StockPulse";

export const MARKET_HOURS = {
  OPEN_HOUR: 9,
  OPEN_MINUTE: 30,
  CLOSE_HOUR: 16,
  CLOSE_MINUTE: 0,
  TIMEZONE: "America/New_York",
} as const;

export const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const CACHE_TIMES = {
  STOCK_QUOTE: 15 * 1000,       // 15 seconds
  PORTFOLIO: 60 * 1000,          // 1 minute
  HISTORICAL: 5 * 60 * 1000,     // 5 minutes
  AI_RESPONSE: 5 * 60 * 1000,    // 5 minutes
} as const;

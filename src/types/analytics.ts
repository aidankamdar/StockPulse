// ─── Performance Periods ────────────────────────────────────────────────────

export type PerformancePeriod = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

// ─── Portfolio Snapshot ─────────────────────────────────────────────────────

export interface SnapshotView {
  id: string;
  date: string;
  totalValue: number;
  totalCostBasis: number;
  totalPnl: number;
  totalPnlPercent: number;
  numPositions: number;
}

// ─── Portfolio Chart ────────────────────────────────────────────────────────

export interface PortfolioChartPoint {
  date: string;
  value: number;
  costBasis: number;
  pnl: number;
}

// ─── Stock Detail ───────────────────────────────────────────────────────────

export interface StockDetail {
  symbol: string;
  lastPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  updatedAt: string;

  // Fundamentals (nullable — may not be available for all symbols)
  description: string | null;
  marketCap: number | null;
  peRatio: number | null;
  dividendYield: number | null;
  sector: string | null;
  industry: string | null;
  ceo: string | null;
  numEmployees: number | null;
  high52Week: number | null;
  low52Week: number | null;
  volume: number | null;
  averageVolume: number | null;
}

// ─── Sector Allocation ──────────────────────────────────────────────────────

export interface SectorAllocation {
  sector: string;
  value: number;
  weight: number;
  positionCount: number;
}

// ─── Gainers / Losers ───────────────────────────────────────────────────────

export interface GainerLoser {
  symbol: string;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

// ─── Stock Historicals ───────────────────────────────────────────────────────

export type HistoricalSpan = "week" | "month" | "3month" | "year" | "5year";
export type HistoricalInterval = "5minute" | "10minute" | "day" | "week" | "month";

export interface StockHistoricalPoint {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface StockHistoricals {
  symbol: string;
  span: string;
  interval: string;
  points: StockHistoricalPoint[];
}

// ─── Period Breakdown ────────────────────────────────────────────────────────

export interface PeriodBreakdownItem {
  label: string;
  startValue: number;
  endValue: number;
  absoluteReturn: number;
  percentReturn: number;
}

// ─── Watchlist ──────────────────────────────────────────────────────────────

export interface WatchlistItemView {
  id: string;
  symbol: string;
  targetBuyPrice: number | null;
  notes: string | null;
  createdAt: string;
}

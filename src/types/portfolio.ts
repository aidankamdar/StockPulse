export interface PortfolioSummary {
  id: string;
  name: string;
  totalValue: number;
  totalCostBasis: number;
  totalPnl: number;
  totalPnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
  positionCount: number;
  cashBalance: number;
  lastSyncedAt: string | null;
}

export interface PositionView {
  id: string;
  symbol: string;
  quantity: number;
  averageCostBasis: number;
  totalCostBasis: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  sector: string | null;
  lastSyncedAt: string | null;
}

export interface TransactionView {
  id: string;
  symbol: string;
  type: "BUY" | "SELL" | "DIVIDEND";
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  fees: number;
  executedAt: string;
  notes: string | null;
  source: "ROBINHOOD_SYNC" | "PLAID_SYNC" | "MANUAL" | "CSV_IMPORT";
}

export interface VisibilitySettings {
  show_positions: boolean;
  show_pnl: boolean;
  show_trades: boolean;
  show_value: boolean;
}

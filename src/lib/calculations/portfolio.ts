/**
 * Portfolio calculation functions.
 * All monetary math uses number type but rounds to 4 decimal places
 * to match the Decimal(x, 4) database precision.
 */

// ─── Rounding ────────────────────────────────────────────────────────────────

export function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ─── Position Calculations ───────────────────────────────────────────────────

export interface PositionInput {
  quantity: number;
  averageCostBasis: number;
  currentPrice: number;
}

export interface PositionMetrics {
  totalCostBasis: number;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

/**
 * Calculate P&L metrics for a single position.
 */
export function calculatePositionMetrics(
  input: PositionInput
): PositionMetrics {
  const totalCostBasis = round4(input.quantity * input.averageCostBasis);
  const currentValue = round4(input.quantity * input.currentPrice);
  const unrealizedPnl = round4(currentValue - totalCostBasis);
  const unrealizedPnlPercent =
    totalCostBasis !== 0
      ? round4((unrealizedPnl / totalCostBasis) * 100)
      : 0;

  return {
    totalCostBasis,
    currentValue,
    unrealizedPnl,
    unrealizedPnlPercent,
  };
}

// ─── Portfolio Summary ───────────────────────────────────────────────────────

export interface PortfolioPositionInput {
  quantity: number;
  averageCostBasis: number;
  currentPrice: number;
  previousClose?: number;
}

export interface PortfolioSummaryMetrics {
  totalValue: number;
  totalCostBasis: number;
  totalPnl: number;
  totalPnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

/**
 * Calculate aggregate portfolio summary from all positions.
 */
export function calculatePortfolioSummary(
  positions: PortfolioPositionInput[]
): PortfolioSummaryMetrics {
  let totalValue = 0;
  let totalCostBasis = 0;
  let dayChange = 0;
  let previousTotalValue = 0;

  for (const pos of positions) {
    const posValue = pos.quantity * pos.currentPrice;
    const posCost = pos.quantity * pos.averageCostBasis;

    totalValue += posValue;
    totalCostBasis += posCost;

    if (pos.previousClose !== undefined) {
      const prevValue = pos.quantity * pos.previousClose;
      previousTotalValue += prevValue;
      dayChange += posValue - prevValue;
    }
  }

  totalValue = round4(totalValue);
  totalCostBasis = round4(totalCostBasis);

  const totalPnl = round4(totalValue - totalCostBasis);
  const totalPnlPercent =
    totalCostBasis !== 0
      ? round4((totalPnl / totalCostBasis) * 100)
      : 0;

  dayChange = round4(dayChange);
  const dayChangePercent =
    previousTotalValue !== 0
      ? round4((dayChange / previousTotalValue) * 100)
      : 0;

  return {
    totalValue,
    totalCostBasis,
    totalPnl,
    totalPnlPercent,
    dayChange,
    dayChangePercent,
  };
}

// ─── Cost Basis ──────────────────────────────────────────────────────────────

export interface TradeInput {
  type: "BUY" | "SELL";
  quantity: number;
  pricePerUnit: number;
  fees: number;
}

/**
 * Calculate average cost basis from a series of trades (simple average method).
 * Returns the new average cost per share after all trades.
 */
export function calculateAverageCostBasis(trades: TradeInput[]): {
  averageCost: number;
  totalShares: number;
  totalInvested: number;
} {
  let totalShares = 0;
  let totalInvested = 0;

  for (const trade of trades) {
    if (trade.type === "BUY") {
      const cost = trade.quantity * trade.pricePerUnit + trade.fees;
      totalShares += trade.quantity;
      totalInvested += cost;
    } else if (trade.type === "SELL") {
      if (totalShares <= 0) continue;

      // Reduce proportionally
      const avgCost = totalInvested / totalShares;
      const sharesReduced = Math.min(trade.quantity, totalShares);
      totalInvested -= sharesReduced * avgCost;
      totalShares -= sharesReduced;
    }
  }

  totalShares = round4(Math.max(totalShares, 0));
  totalInvested = round4(Math.max(totalInvested, 0));

  const averageCost = totalShares > 0 ? round4(totalInvested / totalShares) : 0;

  return { averageCost, totalShares, totalInvested };
}

// ─── Weight / Allocation ─────────────────────────────────────────────────────

/**
 * Calculate position weight as percentage of total portfolio.
 */
export function calculateWeight(
  positionValue: number,
  totalPortfolioValue: number
): number {
  if (totalPortfolioValue <= 0) return 0;
  return round4((positionValue / totalPortfolioValue) * 100);
}

// ─── Realized P&L ────────────────────────────────────────────────────────────

/**
 * Calculate realized P&L for a sell transaction.
 */
export function calculateRealizedPnl(
  sellQuantity: number,
  sellPrice: number,
  averageCostBasis: number,
  fees: number = 0
): number {
  const proceeds = sellQuantity * sellPrice - fees;
  const costBasis = sellQuantity * averageCostBasis;
  return round4(proceeds - costBasis);
}

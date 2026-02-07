import {
  round4,
  round2,
  calculatePositionMetrics,
  calculatePortfolioSummary,
  calculateAverageCostBasis,
  calculateWeight,
  calculateRealizedPnl,
} from "./portfolio";

// ─── Rounding ────────────────────────────────────────────────────────────────

describe("round4", () => {
  it("rounds to 4 decimal places", () => {
    expect(round4(1.23456789)).toBe(1.2346);
    expect(round4(0.00001)).toBe(0);
    expect(round4(100)).toBe(100);
  });

  it("handles negative numbers", () => {
    expect(round4(-1.23456)).toBe(-1.2346);
  });

  it("handles zero", () => {
    expect(round4(0)).toBe(0);
  });
});

describe("round2", () => {
  it("rounds to 2 decimal places", () => {
    expect(round2(1.2345)).toBe(1.23);
    expect(round2(1.235)).toBe(1.24);
  });
});

// ─── Position Metrics ────────────────────────────────────────────────────────

describe("calculatePositionMetrics", () => {
  it("calculates basic position P&L", () => {
    const result = calculatePositionMetrics({
      quantity: 10,
      averageCostBasis: 100,
      currentPrice: 120,
    });

    expect(result.totalCostBasis).toBe(1000);
    expect(result.currentValue).toBe(1200);
    expect(result.unrealizedPnl).toBe(200);
    expect(result.unrealizedPnlPercent).toBe(20);
  });

  it("calculates loss correctly", () => {
    const result = calculatePositionMetrics({
      quantity: 5,
      averageCostBasis: 200,
      currentPrice: 150,
    });

    expect(result.totalCostBasis).toBe(1000);
    expect(result.currentValue).toBe(750);
    expect(result.unrealizedPnl).toBe(-250);
    expect(result.unrealizedPnlPercent).toBe(-25);
  });

  it("handles fractional shares", () => {
    const result = calculatePositionMetrics({
      quantity: 0.5,
      averageCostBasis: 100,
      currentPrice: 100,
    });

    expect(result.totalCostBasis).toBe(50);
    expect(result.currentValue).toBe(50);
    expect(result.unrealizedPnl).toBe(0);
    expect(result.unrealizedPnlPercent).toBe(0);
  });

  it("handles zero cost basis", () => {
    const result = calculatePositionMetrics({
      quantity: 10,
      averageCostBasis: 0,
      currentPrice: 50,
    });

    expect(result.totalCostBasis).toBe(0);
    expect(result.currentValue).toBe(500);
    expect(result.unrealizedPnl).toBe(500);
    expect(result.unrealizedPnlPercent).toBe(0); // can't calc % with 0 cost
  });
});

// ─── Portfolio Summary ───────────────────────────────────────────────────────

describe("calculatePortfolioSummary", () => {
  it("aggregates multiple positions", () => {
    const result = calculatePortfolioSummary([
      { quantity: 10, averageCostBasis: 100, currentPrice: 120 },
      { quantity: 20, averageCostBasis: 50, currentPrice: 55 },
    ]);

    expect(result.totalValue).toBe(2300); // 1200 + 1100
    expect(result.totalCostBasis).toBe(2000); // 1000 + 1000
    expect(result.totalPnl).toBe(300);
    expect(result.totalPnlPercent).toBe(15);
  });

  it("handles empty portfolio", () => {
    const result = calculatePortfolioSummary([]);

    expect(result.totalValue).toBe(0);
    expect(result.totalCostBasis).toBe(0);
    expect(result.totalPnl).toBe(0);
    expect(result.totalPnlPercent).toBe(0);
    expect(result.dayChange).toBe(0);
    expect(result.dayChangePercent).toBe(0);
  });

  it("calculates day change when previousClose provided", () => {
    const result = calculatePortfolioSummary([
      {
        quantity: 10,
        averageCostBasis: 100,
        currentPrice: 105,
        previousClose: 100,
      },
    ]);

    expect(result.dayChange).toBe(50); // 10 * (105 - 100)
    expect(result.dayChangePercent).toBe(5); // 50 / 1000 * 100
  });

  it("handles single position", () => {
    const result = calculatePortfolioSummary([
      { quantity: 1, averageCostBasis: 500, currentPrice: 500 },
    ]);

    expect(result.totalValue).toBe(500);
    expect(result.totalPnl).toBe(0);
    expect(result.totalPnlPercent).toBe(0);
  });
});

// ─── Average Cost Basis ──────────────────────────────────────────────────────

describe("calculateAverageCostBasis", () => {
  it("calculates cost from a single buy", () => {
    const result = calculateAverageCostBasis([
      { type: "BUY", quantity: 10, pricePerUnit: 100, fees: 0 },
    ]);

    expect(result.averageCost).toBe(100);
    expect(result.totalShares).toBe(10);
    expect(result.totalInvested).toBe(1000);
  });

  it("includes fees in cost basis", () => {
    const result = calculateAverageCostBasis([
      { type: "BUY", quantity: 10, pricePerUnit: 100, fees: 10 },
    ]);

    expect(result.averageCost).toBe(101); // (1000 + 10) / 10
    expect(result.totalInvested).toBe(1010);
  });

  it("averages multiple buys at different prices", () => {
    const result = calculateAverageCostBasis([
      { type: "BUY", quantity: 10, pricePerUnit: 100, fees: 0 },
      { type: "BUY", quantity: 10, pricePerUnit: 200, fees: 0 },
    ]);

    expect(result.averageCost).toBe(150); // (1000 + 2000) / 20
    expect(result.totalShares).toBe(20);
    expect(result.totalInvested).toBe(3000);
  });

  it("handles partial sell", () => {
    const result = calculateAverageCostBasis([
      { type: "BUY", quantity: 10, pricePerUnit: 100, fees: 0 },
      { type: "SELL", quantity: 5, pricePerUnit: 150, fees: 0 },
    ]);

    expect(result.totalShares).toBe(5);
    expect(result.averageCost).toBe(100); // cost basis stays the same
    expect(result.totalInvested).toBe(500); // 5 shares at $100
  });

  it("handles full sell (all shares sold)", () => {
    const result = calculateAverageCostBasis([
      { type: "BUY", quantity: 10, pricePerUnit: 100, fees: 0 },
      { type: "SELL", quantity: 10, pricePerUnit: 150, fees: 0 },
    ]);

    expect(result.totalShares).toBe(0);
    expect(result.averageCost).toBe(0);
    expect(result.totalInvested).toBe(0);
  });

  it("handles oversell gracefully", () => {
    const result = calculateAverageCostBasis([
      { type: "BUY", quantity: 5, pricePerUnit: 100, fees: 0 },
      { type: "SELL", quantity: 10, pricePerUnit: 150, fees: 0 },
    ]);

    expect(result.totalShares).toBe(0);
    expect(result.totalInvested).toBe(0);
  });

  it("handles empty trades array", () => {
    const result = calculateAverageCostBasis([]);

    expect(result.averageCost).toBe(0);
    expect(result.totalShares).toBe(0);
    expect(result.totalInvested).toBe(0);
  });

  it("handles buy-sell-buy sequence", () => {
    const result = calculateAverageCostBasis([
      { type: "BUY", quantity: 10, pricePerUnit: 100, fees: 0 },
      { type: "SELL", quantity: 10, pricePerUnit: 150, fees: 0 },
      { type: "BUY", quantity: 5, pricePerUnit: 200, fees: 0 },
    ]);

    expect(result.totalShares).toBe(5);
    expect(result.averageCost).toBe(200);
    expect(result.totalInvested).toBe(1000);
  });
});

// ─── Weight ──────────────────────────────────────────────────────────────────

describe("calculateWeight", () => {
  it("calculates percentage correctly", () => {
    expect(calculateWeight(500, 2000)).toBe(25);
  });

  it("returns 0 when portfolio value is 0", () => {
    expect(calculateWeight(100, 0)).toBe(0);
  });

  it("handles 100% weight", () => {
    expect(calculateWeight(1000, 1000)).toBe(100);
  });
});

// ─── Realized P&L ────────────────────────────────────────────────────────────

describe("calculateRealizedPnl", () => {
  it("calculates profit on sell", () => {
    const result = calculateRealizedPnl(10, 150, 100);
    expect(result).toBe(500); // (10 * 150) - (10 * 100) = 500
  });

  it("calculates loss on sell", () => {
    const result = calculateRealizedPnl(10, 80, 100);
    expect(result).toBe(-200); // (10 * 80) - (10 * 100) = -200
  });

  it("accounts for fees", () => {
    const result = calculateRealizedPnl(10, 150, 100, 5);
    expect(result).toBe(495); // (10 * 150 - 5) - (10 * 100) = 495
  });

  it("handles break-even", () => {
    const result = calculateRealizedPnl(10, 100, 100);
    expect(result).toBe(0);
  });
});

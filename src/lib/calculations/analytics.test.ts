import {
  calculateSectorAllocation,
  calculateTopGainersLosers,
  filterSnapshotsByPeriod,
  calculatePeriodReturn,
  getPeriodCutoffDate,
} from "./analytics";

import type { PositionView } from "@/types/portfolio";
import type { SnapshotView } from "@/types/analytics";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const mockPositions: PositionView[] = [
  {
    id: "1",
    symbol: "AAPL",
    quantity: 10,
    averageCostBasis: 150,
    totalCostBasis: 1500,
    currentPrice: 180,
    currentValue: 1800,
    unrealizedPnl: 300,
    unrealizedPnlPercent: 20,
    sector: "Technology",
    lastSyncedAt: null,
  },
  {
    id: "2",
    symbol: "MSFT",
    quantity: 5,
    averageCostBasis: 300,
    totalCostBasis: 1500,
    currentPrice: 350,
    currentValue: 1750,
    unrealizedPnl: 250,
    unrealizedPnlPercent: 16.6667,
    sector: "Technology",
    lastSyncedAt: null,
  },
  {
    id: "3",
    symbol: "JPM",
    quantity: 20,
    averageCostBasis: 140,
    totalCostBasis: 2800,
    currentPrice: 160,
    currentValue: 3200,
    unrealizedPnl: 400,
    unrealizedPnlPercent: 14.2857,
    sector: "Financial Services",
    lastSyncedAt: null,
  },
  {
    id: "4",
    symbol: "XOM",
    quantity: 15,
    averageCostBasis: 100,
    totalCostBasis: 1500,
    currentPrice: 90,
    currentValue: 1350,
    unrealizedPnl: -150,
    unrealizedPnlPercent: -10,
    sector: "Energy",
    lastSyncedAt: null,
  },
  {
    id: "5",
    symbol: "UNKNOWN",
    quantity: 100,
    averageCostBasis: 10,
    totalCostBasis: 1000,
    currentPrice: 8,
    currentValue: 800,
    unrealizedPnl: -200,
    unrealizedPnlPercent: -20,
    sector: null,
    lastSyncedAt: null,
  },
];

const mockSnapshots: SnapshotView[] = [
  {
    id: "s1",
    date: "2025-01-01",
    totalValue: 10000,
    totalCostBasis: 9000,
    totalPnl: 1000,
    totalPnlPercent: 11.1111,
    numPositions: 5,
  },
  {
    id: "s2",
    date: "2025-01-15",
    totalValue: 10500,
    totalCostBasis: 9000,
    totalPnl: 1500,
    totalPnlPercent: 16.6667,
    numPositions: 5,
  },
  {
    id: "s3",
    date: "2025-02-01",
    totalValue: 11000,
    totalCostBasis: 9000,
    totalPnl: 2000,
    totalPnlPercent: 22.2222,
    numPositions: 5,
  },
  {
    id: "s4",
    date: "2025-06-01",
    totalValue: 12000,
    totalCostBasis: 9500,
    totalPnl: 2500,
    totalPnlPercent: 26.3158,
    numPositions: 6,
  },
  {
    id: "s5",
    date: "2025-12-01",
    totalValue: 13000,
    totalCostBasis: 9500,
    totalPnl: 3500,
    totalPnlPercent: 36.8421,
    numPositions: 6,
  },
];

// ─── Sector Allocation ──────────────────────────────────────────────────────

describe("calculateSectorAllocation", () => {
  it("groups positions by sector with correct weights", () => {
    const result = calculateSectorAllocation(mockPositions);

    // Total value = 1800 + 1750 + 3200 + 1350 + 800 = 8900
    expect(result).toHaveLength(4); // Technology, Financial Services, Energy, Other

    const tech = result.find((s) => s.sector === "Technology")!;
    expect(tech.value).toBeCloseTo(3550, 2);
    expect(tech.weight).toBeCloseTo((3550 / 8900) * 100, 2);
    expect(tech.positionCount).toBe(2);

    const finance = result.find((s) => s.sector === "Financial Services")!;
    expect(finance.value).toBeCloseTo(3200, 2);
    expect(finance.positionCount).toBe(1);

    const other = result.find((s) => s.sector === "Other")!;
    expect(other.value).toBeCloseTo(800, 2);
    expect(other.positionCount).toBe(1);
  });

  it("sorts by weight descending", () => {
    const result = calculateSectorAllocation(mockPositions);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.weight).toBeLessThanOrEqual(result[i - 1]!.weight);
    }
  });

  it("returns empty array for no positions", () => {
    expect(calculateSectorAllocation([])).toEqual([]);
  });

  it("returns empty array when total value is zero", () => {
    const zeroPositions: PositionView[] = [
      {
        ...mockPositions[0]!,
        currentValue: 0,
      },
    ];
    expect(calculateSectorAllocation(zeroPositions)).toEqual([]);
  });

  it("handles all positions in same sector", () => {
    const sameSector = mockPositions.map((p) => ({
      ...p,
      sector: "Technology",
    }));
    const result = calculateSectorAllocation(sameSector);
    expect(result).toHaveLength(1);
    expect(result[0]!.weight).toBeCloseTo(100, 2);
  });
});

// ─── Gainers & Losers ───────────────────────────────────────────────────────

describe("calculateTopGainersLosers", () => {
  it("returns gainers sorted by P&L percent descending", () => {
    const { gainers } = calculateTopGainersLosers(mockPositions);

    expect(gainers.length).toBeGreaterThan(0);
    for (const g of gainers) {
      expect(g.unrealizedPnlPercent).toBeGreaterThan(0);
    }
    // First gainer should have highest P&L %
    expect(gainers[0]!.unrealizedPnlPercent).toBeGreaterThanOrEqual(
      gainers[gainers.length - 1]!.unrealizedPnlPercent
    );
  });

  it("returns losers sorted by P&L percent ascending (worst first)", () => {
    const { losers } = calculateTopGainersLosers(mockPositions);

    expect(losers.length).toBeGreaterThan(0);
    for (const l of losers) {
      expect(l.unrealizedPnlPercent).toBeLessThan(0);
    }
    // First loser should have worst (most negative) P&L %
    expect(losers[0]!.unrealizedPnlPercent).toBeLessThanOrEqual(
      losers[losers.length - 1]!.unrealizedPnlPercent
    );
  });

  it("respects the limit parameter", () => {
    const { gainers } = calculateTopGainersLosers(mockPositions, 1);
    expect(gainers).toHaveLength(1);
    expect(gainers[0]!.symbol).toBe("AAPL"); // 20% gain is highest
  });

  it("returns empty arrays for no positions", () => {
    const { gainers, losers } = calculateTopGainersLosers([]);
    expect(gainers).toEqual([]);
    expect(losers).toEqual([]);
  });

  it("handles all gainers (no losers)", () => {
    const allGainers = mockPositions.filter((p) => p.unrealizedPnl > 0);
    const { gainers, losers } = calculateTopGainersLosers(allGainers);
    expect(gainers.length).toBeGreaterThan(0);
    expect(losers).toEqual([]);
  });

  it("handles all losers (no gainers)", () => {
    const allLosers = mockPositions.filter((p) => p.unrealizedPnl < 0);
    const { gainers, losers } = calculateTopGainersLosers(allLosers);
    expect(gainers).toEqual([]);
    expect(losers.length).toBeGreaterThan(0);
  });
});

// ─── getPeriodCutoffDate ────────────────────────────────────────────────────

describe("getPeriodCutoffDate", () => {
  const fixedDate = new Date("2025-06-15T12:00:00Z");

  it("1W returns 7 days ago", () => {
    const cutoff = getPeriodCutoffDate("1W", fixedDate);
    expect(cutoff.toISOString().split("T")[0]).toBe("2025-06-08");
  });

  it("1M returns 1 month ago", () => {
    const cutoff = getPeriodCutoffDate("1M", fixedDate);
    expect(cutoff.toISOString().split("T")[0]).toBe("2025-05-15");
  });

  it("3M returns 3 months ago", () => {
    const cutoff = getPeriodCutoffDate("3M", fixedDate);
    expect(cutoff.toISOString().split("T")[0]).toBe("2025-03-15");
  });

  it("6M returns 6 months ago", () => {
    const cutoff = getPeriodCutoffDate("6M", fixedDate);
    expect(cutoff.toISOString().split("T")[0]).toBe("2024-12-15");
  });

  it("1Y returns 1 year ago", () => {
    const cutoff = getPeriodCutoffDate("1Y", fixedDate);
    expect(cutoff.toISOString().split("T")[0]).toBe("2024-06-15");
  });

  it("ALL returns epoch", () => {
    const cutoff = getPeriodCutoffDate("ALL", fixedDate);
    expect(cutoff.getTime()).toBe(0);
  });
});

// ─── filterSnapshotsByPeriod ────────────────────────────────────────────────

describe("filterSnapshotsByPeriod", () => {
  it("ALL returns all snapshots", () => {
    const result = filterSnapshotsByPeriod(mockSnapshots, "ALL");
    expect(result).toHaveLength(mockSnapshots.length);
  });

  it("filters to correct period range", () => {
    // Snapshots: Jan 1, Jan 15, Feb 1, Jun 1, Dec 1
    // 6M from Dec 1 = Jun 1, so should include Jun 1 and Dec 1
    // But filterSnapshotsByPeriod uses "now" not last snapshot date
    // So it depends on when we run. Let's test with a fixed approach.
    const recentSnapshots: SnapshotView[] = [
      { ...mockSnapshots[0]!, date: "2025-12-01" },
      { ...mockSnapshots[1]!, date: "2025-12-15" },
      { ...mockSnapshots[2]!, date: "2026-01-01" },
      { ...mockSnapshots[3]!, date: "2026-01-15" },
      { ...mockSnapshots[4]!, date: "2026-02-01" },
    ];

    // 1M from "now" (Feb 7, 2026) = Jan 7, 2026
    const result = filterSnapshotsByPeriod(recentSnapshots, "1M");
    // Should include Jan 15 and Feb 1 (Jan 1 is before Jan 7)
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.every((s) => new Date(s.date) >= new Date("2026-01-07"))).toBe(true);
  });

  it("returns empty array for empty input", () => {
    expect(filterSnapshotsByPeriod([], "1M")).toEqual([]);
  });
});

// ─── calculatePeriodReturn ──────────────────────────────────────────────────

describe("calculatePeriodReturn", () => {
  it("calculates return from first to last snapshot", () => {
    const result = calculatePeriodReturn(mockSnapshots);
    // First: 10000, Last: 13000
    expect(result.absoluteReturn).toBeCloseTo(3000, 2);
    expect(result.percentReturn).toBeCloseTo(30, 2);
  });

  it("returns zero for empty snapshots", () => {
    const result = calculatePeriodReturn([]);
    expect(result.absoluteReturn).toBe(0);
    expect(result.percentReturn).toBe(0);
  });

  it("returns zero for single snapshot", () => {
    const result = calculatePeriodReturn([mockSnapshots[0]!]);
    expect(result.absoluteReturn).toBe(0);
    expect(result.percentReturn).toBe(0);
  });

  it("handles negative returns", () => {
    const declining: SnapshotView[] = [
      { ...mockSnapshots[0]!, totalValue: 10000 },
      { ...mockSnapshots[1]!, totalValue: 8000 },
    ];
    const result = calculatePeriodReturn(declining);
    expect(result.absoluteReturn).toBeCloseTo(-2000, 2);
    expect(result.percentReturn).toBeCloseTo(-20, 2);
  });

  it("handles zero starting value", () => {
    const fromZero: SnapshotView[] = [
      { ...mockSnapshots[0]!, totalValue: 0 },
      { ...mockSnapshots[1]!, totalValue: 5000 },
    ];
    const result = calculatePeriodReturn(fromZero);
    expect(result.absoluteReturn).toBeCloseTo(5000, 2);
    expect(result.percentReturn).toBe(0); // Can't calculate percent from 0
  });
});

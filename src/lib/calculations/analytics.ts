/**
 * Analytics calculation functions.
 * Pure functions for sector allocation, gainers/losers, snapshot filtering.
 */

import { round4 } from "./portfolio";

import type { PositionView } from "@/types/portfolio";
import type {
  SectorAllocation,
  GainerLoser,
  SnapshotView,
  PerformancePeriod,
} from "@/types/analytics";

// ─── Sector Allocation ──────────────────────────────────────────────────────

/**
 * Group positions by sector and calculate weight of each sector.
 * Positions without a sector are grouped as "Other".
 */
export function calculateSectorAllocation(
  positions: PositionView[]
): SectorAllocation[] {
  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);

  if (totalValue <= 0) return [];

  const sectorMap = new Map<
    string,
    { value: number; count: number }
  >();

  for (const pos of positions) {
    const sector = pos.sector || "Other";
    const existing = sectorMap.get(sector) ?? { value: 0, count: 0 };
    existing.value += pos.currentValue;
    existing.count += 1;
    sectorMap.set(sector, existing);
  }

  const allocations: SectorAllocation[] = [];

  for (const [sector, { value, count }] of sectorMap) {
    allocations.push({
      sector,
      value: round4(value),
      weight: round4((value / totalValue) * 100),
      positionCount: count,
    });
  }

  // Sort by weight descending
  allocations.sort((a, b) => b.weight - a.weight);

  return allocations;
}

// ─── Gainers & Losers ───────────────────────────────────────────────────────

/**
 * Returns top N gainers and losers sorted by unrealized P&L percent.
 */
export function calculateTopGainersLosers(
  positions: PositionView[],
  limit: number = 5
): { gainers: GainerLoser[]; losers: GainerLoser[] } {
  const mapped: GainerLoser[] = positions.map((p) => ({
    symbol: p.symbol,
    currentValue: p.currentValue,
    unrealizedPnl: p.unrealizedPnl,
    unrealizedPnlPercent: p.unrealizedPnlPercent,
  }));

  // Sort by P&L percent descending
  const sorted = [...mapped].sort(
    (a, b) => b.unrealizedPnlPercent - a.unrealizedPnlPercent
  );

  const gainers = sorted
    .filter((p) => p.unrealizedPnlPercent > 0)
    .slice(0, limit);

  const losers = sorted
    .filter((p) => p.unrealizedPnlPercent < 0)
    .reverse()
    .slice(0, limit);

  return { gainers, losers };
}

// ─── Snapshot Filtering ─────────────────────────────────────────────────────

/**
 * Returns the cutoff date for a given performance period.
 */
export function getPeriodCutoffDate(
  period: PerformancePeriod,
  now: Date = new Date()
): Date {
  const cutoff = new Date(now);

  switch (period) {
    case "1W":
      cutoff.setDate(cutoff.getDate() - 7);
      break;
    case "1M":
      cutoff.setMonth(cutoff.getMonth() - 1);
      break;
    case "3M":
      cutoff.setMonth(cutoff.getMonth() - 3);
      break;
    case "6M":
      cutoff.setMonth(cutoff.getMonth() - 6);
      break;
    case "1Y":
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      break;
    case "ALL":
      return new Date(0); // Beginning of time
  }

  return cutoff;
}

/**
 * Filter snapshots to a specific time period.
 */
export function filterSnapshotsByPeriod(
  snapshots: SnapshotView[],
  period: PerformancePeriod
): SnapshotView[] {
  if (period === "ALL") return snapshots;

  const cutoff = getPeriodCutoffDate(period);

  return snapshots.filter((s) => new Date(s.date) >= cutoff);
}

// ─── Period Return ──────────────────────────────────────────────────────────

/**
 * Calculate return over a period from first to last snapshot.
 * Returns absolute and percentage return.
 */
export function calculatePeriodReturn(snapshots: SnapshotView[]): {
  absoluteReturn: number;
  percentReturn: number;
} {
  if (snapshots.length < 2) {
    return { absoluteReturn: 0, percentReturn: 0 };
  }

  const first = snapshots[0]!;
  const last = snapshots[snapshots.length - 1]!;

  const absoluteReturn = round4(last.totalValue - first.totalValue);
  const percentReturn =
    first.totalValue > 0
      ? round4(((last.totalValue - first.totalValue) / first.totalValue) * 100)
      : 0;

  return { absoluteReturn, percentReturn };
}

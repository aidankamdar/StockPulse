"use client";

import { useState } from "react";
import { BarChart3, PieChart as PieChartIcon, Calendar } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodSelector } from "@/components/charts/period-selector";
import { PortfolioPerformanceChart } from "@/components/charts/portfolio-performance-chart";
import { SectorAllocationChart } from "@/components/charts/sector-allocation-chart";
import { GainersLosersCard } from "@/components/charts/gainers-losers-card";
import { usePortfolios, usePositions } from "@/hooks/use-portfolio";
import { usePortfolioSnapshots } from "@/hooks/use-analytics";
import {
  calculateSectorAllocation,
  calculateTopGainersLosers,
  calculatePeriodReturn,
  calculatePeriodBreakdown,
} from "@/lib/calculations/analytics";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

import type { PerformancePeriod, PortfolioChartPoint, PeriodBreakdownItem } from "@/types/analytics";
import type { PositionView } from "@/types/portfolio";

export function AnalyticsClient() {
  const [period, setPeriod] = useState<PerformancePeriod>("1M");
  const [breakdownGroupBy, setBreakdownGroupBy] = useState<"week" | "month">("month");

  const { data: portfolios, isLoading: portfoliosLoading } = usePortfolios();
  const portfolioId = portfolios?.[0]?.id;

  const { data: snapshots, isLoading: snapshotsLoading } =
    usePortfolioSnapshots(portfolioId, period);

  const { data: positions, isLoading: positionsLoading } =
    usePositions(portfolioId);

  // ─── Derived data ───────────────────────────────────────────────────────────

  const chartData: PortfolioChartPoint[] = (snapshots ?? []).map((s) => ({
    date: s.date,
    value: s.totalValue,
    costBasis: s.totalCostBasis,
    pnl: s.totalPnl,
  }));

  const periodReturn = snapshots?.length
    ? calculatePeriodReturn(snapshots)
    : { absoluteReturn: 0, percentReturn: 0 };

  const typedPositions: PositionView[] = positions ?? [];

  const sectorAllocation = calculateSectorAllocation(typedPositions);
  const { gainers, losers } = calculateTopGainersLosers(typedPositions, 5);

  // Use ALL-time snapshots for breakdown (so all weeks/months are visible regardless of chart period)
  const { data: allSnapshots } = usePortfolioSnapshots(portfolioId, "ALL");
  const periodBreakdown: PeriodBreakdownItem[] = allSnapshots?.length
    ? calculatePeriodBreakdown(allSnapshots, breakdownGroupBy)
    : [];

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (portfoliosLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[300px] w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    );
  }

  if (!portfolioId) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          No portfolio found. Add trades or connect your investment account to
          see analytics.
        </p>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Performance Chart */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Portfolio Performance
            </CardTitle>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </CardHeader>
        <CardContent>
          {snapshotsLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <PortfolioPerformanceChart data={chartData} />
          )}
        </CardContent>
      </Card>

      {/* Period Return Summary */}
      {snapshots && snapshots.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                {period} Return
              </p>
              <p
                className={`text-2xl font-bold ${
                  periodReturn.absoluteReturn >= 0
                    ? "text-success"
                    : "text-loss"
                }`}
              >
                {formatCurrency(periodReturn.absoluteReturn)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                {period} Return %
              </p>
              <p
                className={`text-2xl font-bold ${
                  periodReturn.percentReturn >= 0
                    ? "text-success"
                    : "text-loss"
                }`}
              >
                {formatPercent(periodReturn.percentReturn)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Gainers & Losers */}
      {!positionsLoading && typedPositions.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <GainersLosersCard
            title="Top Gainers"
            items={gainers}
            type="gainers"
          />
          <GainersLosersCard
            title="Top Losers"
            items={losers}
            type="losers"
          />
        </div>
      )}

      {/* Weekly / Monthly Gains & Losses */}
      {periodBreakdown.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Gains &amp; Losses by Period
            </CardTitle>
            <div className="flex gap-1">
              {(["week", "month"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setBreakdownGroupBy(g)}
                  className={`rounded px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    breakdownGroupBy === g
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {g === "week" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                      Period
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                      Start Value
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                      End Value
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                      Return
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
                      Return %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {periodBreakdown.slice(0, 12).map((item) => (
                    <tr
                      key={item.label}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-sm font-medium">
                        {item.label}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(item.startValue)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(item.endValue)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right text-sm tabular-nums font-medium",
                          item.absoluteReturn >= 0 ? "text-success" : "text-loss"
                        )}
                      >
                        {item.absoluteReturn >= 0 ? "+" : ""}
                        {formatCurrency(item.absoluteReturn)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right text-sm tabular-nums font-medium",
                          item.percentReturn >= 0 ? "text-success" : "text-loss"
                        )}
                      >
                        {item.percentReturn >= 0 ? "+" : ""}
                        {formatPercent(item.percentReturn)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sector Allocation */}
      {!positionsLoading && typedPositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChartIcon className="h-5 w-5" />
              Sector Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SectorAllocationChart data={sectorAllocation} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

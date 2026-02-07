"use client";

import { usePortfolios, usePositions, useRobinhoodSync } from "@/hooks/use-portfolio";
import { PortfolioSummaryBar } from "@/components/portfolio/portfolio-summary-bar";
import { PositionTable } from "@/components/portfolio/position-table";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";
import type { PositionView } from "@/types/portfolio";

export function DashboardClient() {
  const { data: portfolios, isLoading: portfoliosLoading } = usePortfolios();
  const primaryPortfolio = portfolios?.[0];

  const { data: positions, isLoading: positionsLoading } = usePositions(
    primaryPortfolio?.id
  );

  const sync = useRobinhoodSync();

  const isLoading = portfoliosLoading || positionsLoading;

  // Calculate summary from positions
  const positionViews: PositionView[] = (positions ?? []).map(
    (p: Record<string, unknown>) => ({
      id: p.id as string,
      symbol: p.symbol as string,
      quantity: p.quantity as number,
      averageCostBasis: p.average_cost_basis as number,
      totalCostBasis: p.total_cost_basis as number,
      currentPrice: p.current_price as number,
      currentValue: p.current_value as number,
      unrealizedPnl: p.unrealized_pnl as number,
      unrealizedPnlPercent: p.unrealized_pnl_percent as number,
      sector: (p.sector as string) ?? null,
      lastSyncedAt: (p.last_synced_at as string) ?? null,
    })
  );

  const totalValue = positionViews.reduce((s, p) => s + p.currentValue, 0);
  const totalCostBasis = positionViews.reduce(
    (s, p) => s + p.totalCostBasis,
    0
  );
  const totalPnl = totalValue - totalCostBasis;
  const totalPnlPercent =
    totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    );
  }

  if (!primaryPortfolio) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h2 className="text-lg font-semibold">Get started</h2>
        <p className="mt-2 text-muted-foreground">
          Sync your Robinhood account to see your portfolio, or add trades
          manually.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`}
            />
            {sync.isPending ? "Syncing..." : "Sync Robinhood"}
          </Button>
        </div>
        {sync.isError && (
          <p className="mt-3 text-sm text-destructive">
            {sync.error.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sync button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {positionViews[0]?.lastSyncedAt && (
            <span>
              Last synced {formatRelativeTime(positionViews[0].lastSyncedAt)}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`}
          />
          {sync.isPending ? "Syncing..." : "Sync"}
        </Button>
      </div>

      {/* Summary cards */}
      <PortfolioSummaryBar
        totalValue={totalValue}
        dayChange={0}
        dayChangePercent={0}
        totalPnl={totalPnl}
        totalPnlPercent={totalPnlPercent}
        positionCount={positionViews.length}
      />

      {/* Positions table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Positions</h2>
        <PositionTable positions={positionViews} />
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";

import { usePortfolios, usePositions, usePlaidSync, usePlaidStatus } from "@/hooks/use-portfolio";
import { PortfolioSummaryBar } from "@/components/portfolio/portfolio-summary-bar";
import { PositionTable } from "@/components/portfolio/position-table";
import { AddTransactionDialog } from "@/components/portfolio/add-transaction-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Plus, Link as LinkIcon } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";

import type { PositionView } from "@/types/portfolio";

const ALL_PORTFOLIOS = "__all__";

export function DashboardClient() {
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(ALL_PORTFOLIOS);

  const { data: portfolios, isLoading: portfoliosLoading } = usePortfolios();

  // Determine which portfolio(s) to show positions for
  const activePortfolioIds = useMemo(() => {
    if (!portfolios) return [];
    if (selectedPortfolioId === ALL_PORTFOLIOS) {
      return portfolios.map((p: Record<string, unknown>) => p.id as string);
    }
    return [selectedPortfolioId];
  }, [portfolios, selectedPortfolioId]);

  // For the "Add Trade" dialog, pick the first selected portfolio
  const primaryPortfolioId = activePortfolioIds[0] as string | undefined;

  // Fetch positions for the first active portfolio (when "All", merge below)
  const firstPortfolio = portfolios?.[0];
  const secondPortfolio = portfolios?.[1];

  const { data: positions1, isLoading: pos1Loading } = usePositions(
    selectedPortfolioId === ALL_PORTFOLIOS
      ? firstPortfolio?.id
      : selectedPortfolioId
  );
  const { data: positions2, isLoading: pos2Loading } = usePositions(
    selectedPortfolioId === ALL_PORTFOLIOS ? secondPortfolio?.id : undefined
  );

  const { data: plaidStatus } = usePlaidStatus();
  const sync = usePlaidSync();

  const isLoading = portfoliosLoading || pos1Loading || (selectedPortfolioId === ALL_PORTFOLIOS && pos2Loading);
  const isPlaidConnected = plaidStatus?.connected === true;

  // Merge positions from all active portfolios
  const positionViews: PositionView[] = useMemo(() => {
    const allPositions = [
      ...(positions1 ?? []),
      ...(selectedPortfolioId === ALL_PORTFOLIOS ? (positions2 ?? []) : []),
    ];
    return allPositions.map((p: Record<string, unknown>) => ({
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
    }));
  }, [positions1, positions2, selectedPortfolioId]);

  // Calculate aggregate totals
  const totalValue = useMemo(() => {
    const positionsTotal = positionViews.reduce((s, p) => s + p.currentValue, 0);
    // Add cash balance from selected portfolios
    const cashTotal = (portfolios ?? [])
      .filter((p: Record<string, unknown>) =>
        selectedPortfolioId === ALL_PORTFOLIOS || p.id === selectedPortfolioId
      )
      .reduce((s: number, p: Record<string, unknown>) => s + (Number(p.cash_balance) || 0), 0);
    return positionsTotal + cashTotal;
  }, [positionViews, portfolios, selectedPortfolioId]);

  const totalCostBasis = positionViews.reduce((s, p) => s + p.totalCostBasis, 0);
  const totalPnl = totalValue - totalCostBasis;
  const totalPnlPercent = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;

  const cashBalance = useMemo(() => {
    return (portfolios ?? [])
      .filter((p: Record<string, unknown>) =>
        selectedPortfolioId === ALL_PORTFOLIOS || p.id === selectedPortfolioId
      )
      .reduce((s: number, p: Record<string, unknown>) => s + (Number(p.cash_balance) || 0), 0);
  }, [portfolios, selectedPortfolioId]);

  const handleSync = () => {
    sync.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(
          `Synced ${data.positions} position${data.positions !== 1 ? "s" : ""}, ${data.transactions_synced} transaction${data.transactions_synced !== 1 ? "s" : ""}`
        );
      },
      onError: (error) => {
        toast.error(`Sync failed: ${error.message}`);
      },
    });
  };

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

  // Empty state — portfolio exists but no positions yet
  if (positionViews.length === 0) {
    const hasConnectedButEmpty = isPlaidConnected && positionViews.length === 0;

    return (
      <div className="space-y-4">
        {/* Portfolio switcher even in empty state */}
        {portfolios && portfolios.length > 1 && (
          <div className="flex items-center gap-2">
            <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select portfolio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PORTFOLIOS}>All Portfolios</SelectItem>
                {portfolios.map((p: Record<string, unknown>) => (
                  <SelectItem key={p.id as string} value={p.id as string}>
                    {p.name as string}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">Get started</h2>
          <p className="mt-2 text-muted-foreground">
            {hasConnectedButEmpty
              ? "No holdings found in your connected account. Your brokerage may only contain cash, or the sync may still be processing. Try syncing again or check Settings."
              : isPlaidConnected
                ? "Your investment account is connected. Sync to import your positions, or add a trade manually."
                : "Connect your investment account in Settings, or add your first trade manually."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button onClick={() => setShowAddTrade(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Trade
            </Button>
            {isPlaidConnected ? (
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={sync.isPending}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`}
                />
                {sync.isPending ? "Syncing..." : "Sync Portfolio"}
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <a href="/settings">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Connect Account
                </a>
              </Button>
            )}
          </div>
          {sync.isError && (
            <p className="mt-3 text-sm text-destructive">
              {sync.error.message}
            </p>
          )}

          {primaryPortfolioId && (
            <AddTransactionDialog
              portfolioId={primaryPortfolioId}
              open={showAddTrade}
              onClose={() => setShowAddTrade(false)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Portfolio switcher */}
          {portfolios && portfolios.length > 1 && (
            <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select portfolio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PORTFOLIOS}>All Portfolios</SelectItem>
                {portfolios.map((p: Record<string, unknown>) => (
                  <SelectItem key={p.id as string} value={p.id as string}>
                    {p.name as string}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="text-sm text-muted-foreground">
            {plaidStatus?.last_synced_at && (
              <span>
                Last synced {formatRelativeTime(plaidStatus.last_synced_at)}
              </span>
            )}
            {!plaidStatus?.last_synced_at && positionViews[0]?.lastSyncedAt && (
              <span>
                Last synced {formatRelativeTime(positionViews[0].lastSyncedAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowAddTrade(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Trade
          </Button>
          {isPlaidConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={sync.isPending}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${sync.isPending ? "animate-spin" : ""}`}
              />
              {sync.isPending ? "Syncing..." : "Sync"}
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <PortfolioSummaryBar
        totalValue={totalValue}
        dayChange={0}
        dayChangePercent={0}
        totalPnl={totalPnl}
        totalPnlPercent={totalPnlPercent}
        positionCount={positionViews.length}
        cashBalance={cashBalance}
      />

      {/* Positions table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Positions</h2>
        <PositionTable positions={positionViews} />
      </div>

      {/* Add trade dialog */}
      {primaryPortfolioId && (
        <AddTransactionDialog
          portfolioId={primaryPortfolioId}
          open={showAddTrade}
          onClose={() => setShowAddTrade(false)}
        />
      )}
    </div>
  );
}

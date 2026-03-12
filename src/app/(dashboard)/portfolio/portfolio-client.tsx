"use client";

import { useState, useMemo } from "react";
import { Search, RefreshCw, Plus, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

import { usePortfolios, usePositions, usePlaidSync, usePlaidStatus } from "@/hooks/use-portfolio";
import { PortfolioSummaryBar } from "@/components/portfolio/portfolio-summary-bar";
import { PositionTable } from "@/components/portfolio/position-table";
import { AddTransactionDialog } from "@/components/portfolio/add-transaction-dialog";
import { SectorAllocationChart } from "@/components/charts/sector-allocation-chart";
import { calculateSectorAllocation } from "@/lib/calculations/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRelativeTime } from "@/lib/utils/format";

import type { PositionView } from "@/types/portfolio";

const ALL_PORTFOLIOS = "__all__";

export function PortfolioClient() {
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(ALL_PORTFOLIOS);

  const { data: portfolios, isLoading: portfoliosLoading } = usePortfolios();

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

  const primaryPortfolioId = useMemo(() => {
    if (!portfolios) return undefined;
    if (selectedPortfolioId === ALL_PORTFOLIOS) return portfolios[0]?.id;
    return selectedPortfolioId;
  }, [portfolios, selectedPortfolioId]);

  // Merge positions from active portfolios
  const positionViews: PositionView[] = useMemo(
    () => {
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
    },
    [positions1, positions2, selectedPortfolioId]
  );

  // Filter by search term
  const filteredPositions = useMemo(() => {
    if (!search.trim()) return positionViews;
    const term = search.toLowerCase();
    return positionViews.filter(
      (p) =>
        p.symbol.toLowerCase().includes(term) ||
        (p.sector && p.sector.toLowerCase().includes(term))
    );
  }, [positionViews, search]);

  // Summary calculations (include cash)
  const cashBalance = useMemo(() => {
    return (portfolios ?? [])
      .filter((p: Record<string, unknown>) =>
        selectedPortfolioId === ALL_PORTFOLIOS || p.id === selectedPortfolioId
      )
      .reduce((s: number, p: Record<string, unknown>) => s + (Number(p.cash_balance) || 0), 0);
  }, [portfolios, selectedPortfolioId]);

  const positionsTotal = positionViews.reduce((s, p) => s + p.currentValue, 0);
  const totalValue = positionsTotal + cashBalance;
  const totalCostBasis = positionViews.reduce((s, p) => s + p.totalCostBasis, 0);
  const totalPnl = totalValue - totalCostBasis;
  const totalPnlPercent =
    totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;

  const sectorAllocation = calculateSectorAllocation(positionViews);

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
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!primaryPortfolioId) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No portfolio found. Connect your investment account or add a trade.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by symbol or sector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowAddTrade(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Trade
          </Button>
          {isPlaidConnected ? (
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
          ) : (
            <Button variant="outline" size="sm" asChild>
              <a href="/settings">
                <LinkIcon className="mr-2 h-4 w-4" />
                Connect Account
              </a>
            </Button>
          )}
        </div>
      </div>

      {plaidStatus?.last_synced_at && (
        <p className="text-xs text-muted-foreground">
          Last synced {formatRelativeTime(plaidStatus.last_synced_at)}
        </p>
      )}

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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Positions table (2/3) */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">
            Positions
            {search && ` (${filteredPositions.length} of ${positionViews.length})`}
          </h2>
          <PositionTable positions={filteredPositions} showWeight />
        </div>

        {/* Sector pie (1/3) */}
        {sectorAllocation.length > 0 && (
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sector Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <SectorAllocationChart data={sectorAllocation} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {sync.isError && (
        <p className="text-sm text-destructive">{sync.error.message}</p>
      )}

      <AddTransactionDialog
        portfolioId={primaryPortfolioId}
        open={showAddTrade}
        onClose={() => setShowAddTrade(false)}
      />
    </div>
  );
}

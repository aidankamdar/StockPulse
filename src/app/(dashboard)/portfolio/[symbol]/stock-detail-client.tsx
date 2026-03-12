"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";

import { useStockDetail, useStockHistoricals } from "@/hooks/use-analytics";
import { usePortfolios, usePositions } from "@/hooks/use-portfolio";
import { useTransactions } from "@/hooks/use-transactions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceChangeIndicator } from "@/components/shared/price-change-indicator";
import { StockPriceChart } from "@/components/charts/stock-price-chart";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate,
} from "@/lib/utils/format";

import type { HistoricalSpan, HistoricalInterval } from "@/types/analytics";

const CHART_PERIODS: {
  label: string;
  span: HistoricalSpan;
  interval: HistoricalInterval;
}[] = [
  { label: "1W", span: "week", interval: "day" },
  { label: "1M", span: "month", interval: "day" },
  { label: "3M", span: "3month", interval: "day" },
  { label: "1Y", span: "year", interval: "week" },
];

import type { PositionView } from "@/types/portfolio";

interface StockDetailClientProps {
  symbol: string;
}

export function StockDetailClient({ symbol }: StockDetailClientProps) {
  const [chartPeriodIndex, setChartPeriodIndex] = useState(1); // default 1M
  const selectedPeriod = CHART_PERIODS[chartPeriodIndex]!;

  const { data: stockDetail, isLoading: stockLoading } = useStockDetail(symbol);
  const { data: historicals, isLoading: historicalsLoading } = useStockHistoricals(
    symbol,
    selectedPeriod.span,
    selectedPeriod.interval
  );

  const { data: portfolios } = usePortfolios();
  const portfolioId = portfolios?.[0]?.id;

  const { data: positions } = usePositions(portfolioId);
  const { data: txData } = useTransactions(portfolioId);

  // Find user's position in this stock
  const position: PositionView | undefined = useMemo(() => {
    if (!positions) return undefined;
    const raw = positions.find(
      (p: Record<string, unknown>) => (p.symbol as string) === symbol
    );
    if (!raw) return undefined;
    return {
      id: raw.id as string,
      symbol: raw.symbol as string,
      quantity: raw.quantity as number,
      averageCostBasis: raw.average_cost_basis as number,
      totalCostBasis: raw.total_cost_basis as number,
      currentPrice: raw.current_price as number,
      currentValue: raw.current_value as number,
      unrealizedPnl: raw.unrealized_pnl as number,
      unrealizedPnlPercent: raw.unrealized_pnl_percent as number,
      sector: (raw.sector as string) ?? null,
      lastSyncedAt: (raw.last_synced_at as string) ?? null,
    };
  }, [positions, symbol]);

  // Filter transactions for this symbol
  const symbolTransactions = useMemo(() => {
    const all = txData?.data ?? [];
    return all
      .filter(
        (tx: { symbol: string }) => tx.symbol === symbol
      )
      .slice(0, 10);
  }, [txData, symbol]);

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href="/portfolio"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Portfolio
      </Link>

      {/* Stock Header */}
      {stockLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-6 w-48" />
        </div>
      ) : stockDetail ? (
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{symbol}</h1>
            {stockDetail.sector && (
              <Badge variant="secondary">{stockDetail.sector}</Badge>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums">
              {formatCurrency(stockDetail.lastPrice)}
            </span>
            <PriceChangeIndicator
              value={stockDetail.change}
              percent={stockDetail.changePercent}
              size="lg"
            />
          </div>
          {stockDetail.updatedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Updated {formatDate(stockDetail.updatedAt)}
            </p>
          )}
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-bold">{symbol}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stock data unavailable
          </p>
        </div>
      )}

      {/* Price Chart */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Price History
          </CardTitle>
          <div className="flex gap-1">
            {CHART_PERIODS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setChartPeriodIndex(i)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  i === chartPeriodIndex
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {historicalsLoading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <StockPriceChart
              data={historicals?.points ?? []}
              isPositive={(stockDetail?.changePercent ?? 0) >= 0}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Position + Transactions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Your Position */}
          {position ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Shares</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatNumber(
                        position.quantity,
                        position.quantity % 1 !== 0 ? 4 : 0
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Cost</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatCurrency(position.averageCostBasis)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Market Value
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatCurrency(position.currentValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Return
                    </p>
                    <PriceChangeIndicator
                      value={position.unrealizedPnl}
                      percent={position.unrealizedPnlPercent}
                      size="lg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-6">
                <p className="text-sm text-muted-foreground">
                  You don&apos;t hold any shares of {symbol}.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Trade History for this Symbol */}
          {symbolTransactions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Trade History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                          Type
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                          Shares
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                          Price
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {symbolTransactions.map(
                        (tx: {
                          id: string;
                          executed_at: string;
                          type: string;
                          quantity: number;
                          price_per_unit: number;
                          total_amount: number;
                        }) => (
                          <tr
                            key={tx.id}
                            className="border-b border-border last:border-0"
                          >
                            <td className="px-3 py-2 text-sm tabular-nums">
                              {formatDate(tx.executed_at)}
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                variant={
                                  tx.type === "BUY"
                                    ? "success"
                                    : tx.type === "SELL"
                                      ? "loss"
                                      : "secondary"
                                }
                              >
                                {tx.type}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right text-sm tabular-nums">
                              {formatNumber(tx.quantity, tx.quantity % 1 !== 0 ? 4 : 0)}
                            </td>
                            <td className="px-3 py-2 text-right text-sm tabular-nums">
                              {formatCurrency(tx.price_per_unit)}
                            </td>
                            <td className="px-3 py-2 text-right text-sm tabular-nums font-medium">
                              {formatCurrency(tx.total_amount)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Company Info */}
        <div>
          {stockLoading ? (
            <Card>
              <CardContent className="space-y-3 py-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ) : stockDetail ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Company Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stockDetail.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {stockDetail.description.length > 300
                      ? `${stockDetail.description.slice(0, 300)}...`
                      : stockDetail.description}
                  </p>
                )}

                <Separator />

                <div className="space-y-3">
                  {stockDetail.marketCap && (
                    <InfoRow
                      icon={<DollarSign className="h-4 w-4" />}
                      label="Market Cap"
                      value={formatLargeNumber(stockDetail.marketCap)}
                    />
                  )}
                  {stockDetail.peRatio && (
                    <InfoRow
                      icon={<BarChart3 className="h-4 w-4" />}
                      label="P/E Ratio"
                      value={formatNumber(stockDetail.peRatio, 2)}
                    />
                  )}
                  {stockDetail.dividendYield != null &&
                    stockDetail.dividendYield > 0 && (
                      <InfoRow
                        icon={<DollarSign className="h-4 w-4" />}
                        label="Div Yield"
                        value={formatPercent(stockDetail.dividendYield).replace("+", "")}
                      />
                    )}
                  {stockDetail.industry && (
                    <InfoRow
                      icon={<Building2 className="h-4 w-4" />}
                      label="Industry"
                      value={stockDetail.industry}
                    />
                  )}
                  {stockDetail.ceo && (
                    <InfoRow
                      icon={<Users className="h-4 w-4" />}
                      label="CEO"
                      value={stockDetail.ceo}
                    />
                  )}
                  {stockDetail.numEmployees && (
                    <InfoRow
                      icon={<Users className="h-4 w-4" />}
                      label="Employees"
                      value={formatNumber(stockDetail.numEmployees, 0)}
                    />
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  {stockDetail.high52Week && (
                    <InfoRow
                      icon={<TrendingUp className="h-4 w-4" />}
                      label="52W High"
                      value={formatCurrency(stockDetail.high52Week)}
                    />
                  )}
                  {stockDetail.low52Week && (
                    <InfoRow
                      icon={<TrendingDown className="h-4 w-4" />}
                      label="52W Low"
                      value={formatCurrency(stockDetail.low52Week)}
                    />
                  )}
                  {stockDetail.volume && (
                    <InfoRow
                      icon={<BarChart3 className="h-4 w-4" />}
                      label="Volume"
                      value={formatLargeNumber(stockDetail.volume)}
                    />
                  )}
                  {stockDetail.averageVolume && (
                    <InfoRow
                      icon={<BarChart3 className="h-4 w-4" />}
                      label="Avg Volume"
                      value={formatLargeNumber(stockDetail.averageVolume)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function formatLargeNumber(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toString();
}

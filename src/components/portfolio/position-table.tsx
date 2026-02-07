"use client";

import { cn } from "@/lib/utils/cn";
import { PriceChangeIndicator } from "@/components/shared/price-change-indicator";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import type { PositionView } from "@/types/portfolio";

interface PositionTableProps {
  positions: PositionView[];
}

export function PositionTable({ positions }: PositionTableProps) {
  if (positions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No positions yet. Sync your Robinhood account or add a trade to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Symbol
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Shares
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Price
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Avg Cost
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Value
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                P&L
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => (
              <tr
                key={pos.id}
                className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div>
                    <span className="font-semibold">{pos.symbol}</span>
                    {pos.sector && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {pos.sector}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatNumber(pos.quantity, pos.quantity % 1 !== 0 ? 4 : 0)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(pos.currentPrice)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(pos.averageCostBasis)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatCurrency(pos.currentValue)}
                </td>
                <td className="px-4 py-3 text-right">
                  <PriceChangeIndicator
                    value={pos.unrealizedPnl}
                    percent={pos.unrealizedPnlPercent}
                    showIcon={false}
                    size="sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

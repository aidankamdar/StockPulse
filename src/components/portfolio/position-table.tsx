"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { PriceChangeIndicator } from "@/components/shared/price-change-indicator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils/format";
import type { PositionView } from "@/types/portfolio";

interface PositionTableProps {
  positions: PositionView[];
  showWeight?: boolean;
}

export function PositionTable({ positions, showWeight = false }: PositionTableProps) {
  const router = useRouter();

  const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);

  if (positions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          No positions yet. Connect your investment account or add a trade to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Symbol
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Shares
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Price
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Avg Cost
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Value
              </th>
              {showWeight && (
                <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  Weight
                </th>
              )}
              <th className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                P&L
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const weight = totalValue > 0 ? (pos.currentValue / totalValue) * 100 : 0;
              return (
                <tr
                  key={pos.id}
                  onClick={() => router.push(`/portfolio/${pos.symbol}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{pos.symbol}</span>
                      {pos.sector && (
                        <Badge variant="secondary" className="text-[10px]">
                          {pos.sector}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatNumber(pos.quantity, pos.quantity % 1 !== 0 ? 4 : 0)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatCurrency(pos.currentPrice)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatCurrency(pos.averageCostBasis)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium">
                    {formatCurrency(pos.currentValue)}
                  </td>
                  {showWeight && (
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {formatPercent(weight).replace("+", "")}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <PriceChangeIndicator
                      value={pos.unrealizedPnl}
                      percent={pos.unrealizedPnlPercent}
                      showIcon={false}
                      size="sm"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

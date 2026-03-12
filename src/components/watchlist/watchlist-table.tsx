"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";

import { useRemoveFromWatchlist } from "@/hooks/use-watchlist";
import { PriceChangeIndicator } from "@/components/shared/price-change-indicator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils/format";

import type { WatchlistItemView } from "@/types/analytics";
import type { WatchlistQuote } from "@/hooks/use-watchlist";

interface WatchlistTableProps {
  items: WatchlistItemView[];
  quotes: Record<string, WatchlistQuote>;
  quotesLoading?: boolean;
}

function computeVsTarget(
  lastPrice: number,
  targetBuyPrice: number
): number {
  if (targetBuyPrice === 0) return 0;
  return ((lastPrice - targetBuyPrice) / targetBuyPrice) * 100;
}

export function WatchlistTable({ items, quotes, quotesLoading }: WatchlistTableProps) {
  const removeItem = useRemoveFromWatchlist();

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Your watchlist is empty. Add stocks you&apos;re interested in to
          track them.
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
                Current Price
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Target Price
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                vs Target
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Notes
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Added
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const quote = quotes[item.symbol];
              const vsTarget =
                quote && item.targetBuyPrice
                  ? computeVsTarget(quote.lastPrice, item.targetBuyPrice)
                  : null;

              return (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/portfolio/${item.symbol}`}
                      className="font-semibold hover:text-primary transition-colors"
                    >
                      {item.symbol}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {quotesLoading && !quote ? (
                      <Skeleton className="ml-auto h-5 w-24" />
                    ) : quote ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="tabular-nums font-medium">
                          {formatCurrency(quote.lastPrice)}
                        </span>
                        <PriceChangeIndicator
                          value={quote.change}
                          percent={quote.changePercent}
                          size="sm"
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {item.targetBuyPrice
                      ? formatCurrency(item.targetBuyPrice)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {quotesLoading && !quote ? (
                      <Skeleton className="ml-auto h-5 w-16" />
                    ) : vsTarget !== null ? (
                      <span
                        className={
                          vsTarget > 0
                            ? "text-loss font-medium"
                            : vsTarget < 0
                              ? "text-success font-medium"
                              : "text-muted-foreground"
                        }
                      >
                        {formatPercent(vsTarget)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-[250px] truncate">
                    {item.notes ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem.mutate(item.id)}
                      disabled={removeItem.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

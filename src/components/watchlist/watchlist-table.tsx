"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";

import { useRemoveFromWatchlist } from "@/hooks/use-watchlist";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";

import type { WatchlistItemView } from "@/types/analytics";

interface WatchlistTableProps {
  items: WatchlistItemView[];
}

export function WatchlistTable({ items }: WatchlistTableProps) {
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
                Target Price
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
            {items.map((item) => (
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
                <td className="px-4 py-3 text-right tabular-nums">
                  {item.targetBuyPrice
                    ? formatCurrency(item.targetBuyPrice)
                    : "—"}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, Eye } from "lucide-react";

import { useWatchlist, useWatchlistQuotes } from "@/hooks/use-watchlist";
import { WatchlistTable } from "@/components/watchlist/watchlist-table";
import { AddToWatchlistDialog } from "@/components/watchlist/add-to-watchlist-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchlistPage() {
  const [showAdd, setShowAdd] = useState(false);
  const { data: watchlist, isLoading } = useWatchlist();
  const symbols = (watchlist ?? []).map((item) => item.symbol);
  const { quotes, isLoading: quotesLoading } = useWatchlistQuotes(symbols);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Watchlist</h1>
          <p className="text-muted-foreground">
            Stocks you&apos;re tracking
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Stock
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <>
          {watchlist && watchlist.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              Tracking {watchlist.length} stock{watchlist.length !== 1 ? "s" : ""}
            </div>
          )}
          <WatchlistTable
            items={watchlist ?? []}
            quotes={quotes}
            quotesLoading={quotesLoading}
          />
        </>
      )}

      <AddToWatchlistDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
      />
    </div>
  );
}

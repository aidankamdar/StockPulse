"use client";

import { useState, useEffect, useCallback } from "react";
import { useAddToWatchlist } from "@/hooks/use-watchlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Search, Loader2 } from "lucide-react";

interface SearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

interface AddToWatchlistDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddToWatchlistDialog({
  open,
  onClose,
}: AddToWatchlistDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [notes, setNotes] = useState("");

  const addToWatchlist = useAddToWatchlist();

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/stocks/search?q=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const json = await res.json();
          setResults(json.data?.slice(0, 8) ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    setQuery("");
    setResults([]);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedSymbol) return;

      addToWatchlist.mutate(
        {
          symbol: selectedSymbol.toUpperCase(),
          target_buy_price: targetPrice
            ? parseFloat(targetPrice)
            : undefined,
          notes: notes || undefined,
        },
        {
          onSuccess: () => {
            setSelectedSymbol("");
            setTargetPrice("");
            setNotes("");
            onClose();
          },
        }
      );
    },
    [selectedSymbol, targetPrice, notes, addToWatchlist, onClose]
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Add to Watchlist</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {addToWatchlist.isError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {addToWatchlist.error.message}
                </div>
              )}

              {/* Symbol search */}
              {!selectedSymbol ? (
                <div className="space-y-2">
                  <Label>Search Stock</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by symbol or name..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-9"
                      autoFocus
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {results.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-md border">
                      {results.map((r) => (
                        <button
                          key={r.symbol}
                          type="button"
                          onClick={() => handleSelect(r.displaySymbol || r.symbol)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                        >
                          <span className="font-semibold">
                            {r.displaySymbol || r.symbol}
                          </span>
                          <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {r.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-md bg-muted p-3">
                  <span className="font-semibold">{selectedSymbol}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSymbol("")}
                  >
                    Change
                  </Button>
                </div>
              )}

              {/* Target price */}
              <div className="space-y-2">
                <Label htmlFor="target-price">Target Buy Price (optional)</Label>
                <Input
                  id="target-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="150.00"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="watchlist-notes">Notes (optional)</Label>
                <Input
                  id="watchlist-notes"
                  placeholder="Why are you watching this stock?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!selectedSymbol || addToWatchlist.isPending}
              >
                {addToWatchlist.isPending ? "Adding..." : "Add to Watchlist"}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </>
  );
}

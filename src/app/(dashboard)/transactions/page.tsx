"use client";

import { useState, useMemo } from "react";
import { Search, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";

import { usePortfolios } from "@/hooks/use-portfolio";
import { useTransactions } from "@/hooks/use-transactions";
import { AddTransactionDialog } from "@/components/portfolio/add-transaction-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

type TxType = "ALL" | "BUY" | "SELL" | "DIVIDEND";
type SortDir = "desc" | "asc";

interface TxRow {
  id: string;
  executed_at: string;
  type: string;
  symbol: string;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  notes: string | null;
}

export default function TransactionsPage() {
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TxType>("ALL");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: portfolios, isLoading: portfoliosLoading } = usePortfolios();
  const primaryPortfolio = portfolios?.[0];

  const { data: txData, isLoading: txLoading } = useTransactions(
    primaryPortfolio?.id
  );

  const allTransactions: TxRow[] = txData?.data ?? [];
  const isLoading = portfoliosLoading || txLoading;

  const filtered = useMemo(() => {
    let rows = [...allTransactions];

    if (typeFilter !== "ALL") {
      rows = rows.filter((tx) => tx.type === typeFilter);
    }

    if (symbolFilter.trim()) {
      const query = symbolFilter.trim().toUpperCase();
      rows = rows.filter((tx) => tx.symbol.includes(query));
    }

    rows.sort((a, b) => {
      const diff =
        new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime();
      return sortDir === "desc" ? -diff : diff;
    });

    return rows;
  }, [allTransactions, typeFilter, symbolFilter, sortDir]);

  const TYPE_OPTIONS: TxType[] = ["ALL", "BUY", "SELL", "DIVIDEND"];

  const typeBadgeClass = (type: string) => {
    if (type === "BUY") return "bg-green-500/10 text-green-500";
    if (type === "SELL") return "bg-red-500/10 text-red-500";
    return "bg-blue-500/10 text-blue-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Your trade history</p>
        </div>
        <Button onClick={() => setShowAddTrade(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Trade
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by symbol…"
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          className="ml-auto flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:ml-0"
        >
          {sortDir === "desc" ? (
            <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUp className="h-3.5 w-3.5" />
          )}
          Date {sortDir === "desc" ? "Newest" : "Oldest"}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {allTransactions.length === 0
              ? 'No transactions yet. Click "Add Trade" to record your first trade.'
              : "No transactions match your filters."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    <button
                      onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Date
                      <ArrowUpDown className="h-3.5 w-3.5" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Type
                  </th>
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
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm tabular-nums">
                      {new Date(tx.executed_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(tx.type)}`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{tx.symbol}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {tx.quantity}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(tx.price_per_unit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(tx.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                      {tx.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length < allTransactions.length && (
            <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              Showing {filtered.length} of {allTransactions.length} transactions
            </div>
          )}
        </div>
      )}

      {primaryPortfolio && (
        <AddTransactionDialog
          portfolioId={primaryPortfolio.id}
          open={showAddTrade}
          onClose={() => setShowAddTrade(false)}
        />
      )}
    </div>
  );
}

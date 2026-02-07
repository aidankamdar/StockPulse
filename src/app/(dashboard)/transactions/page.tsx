"use client";

import { useState } from "react";

import { usePortfolios } from "@/hooks/use-portfolio";
import { useTransactions } from "@/hooks/use-transactions";
import { AddTransactionDialog } from "@/components/portfolio/add-transaction-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

export default function TransactionsPage() {
  const [showAddTrade, setShowAddTrade] = useState(false);

  const { data: portfolios, isLoading: portfoliosLoading } = usePortfolios();
  const primaryPortfolio = portfolios?.[0];

  const { data: txData, isLoading: txLoading } = useTransactions(
    primaryPortfolio?.id
  );

  const transactions = txData?.data ?? [];
  const isLoading = portfoliosLoading || txLoading;

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

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            No transactions yet. Click &quot;Add Trade&quot; to record your
            first trade.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Date
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
                {transactions.map(
                  (tx: {
                    id: string;
                    executed_at: string;
                    type: string;
                    symbol: string;
                    quantity: number;
                    price_per_unit: number;
                    total_amount: number;
                    notes: string | null;
                  }) => (
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
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            tx.type === "BUY"
                              ? "bg-green-500/10 text-green-500"
                              : tx.type === "SELL"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-blue-500/10 text-blue-500"
                          }`}
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
                  )
                )}
              </tbody>
            </table>
          </div>
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

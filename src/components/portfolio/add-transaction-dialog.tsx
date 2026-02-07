"use client";

import { useState } from "react";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface AddTransactionDialogProps {
  portfolioId: string;
  open: boolean;
  onClose: () => void;
}

export function AddTransactionDialog({
  portfolioId,
  open,
  onClose,
}: AddTransactionDialogProps) {
  const [symbol, setSymbol] = useState("");
  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [fees, setFees] = useState("0");
  const [executedAt, setExecutedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState("");

  const createTx = useCreateTransaction();

  if (!open) return null;

  const totalAmount =
    (parseFloat(quantity) || 0) * (parseFloat(pricePerUnit) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    createTx.mutate(
      {
        portfolio_id: portfolioId,
        symbol: symbol.toUpperCase(),
        type,
        quantity: parseFloat(quantity),
        price_per_unit: parseFloat(pricePerUnit),
        total_amount: totalAmount,
        fees: parseFloat(fees) || 0,
        executed_at: new Date(executedAt).toISOString(),
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setSymbol("");
          setQuantity("");
          setPricePerUnit("");
          setFees("0");
          setNotes("");
          onClose();
        },
      }
    );
  }

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
            <CardTitle>Add Transaction</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {createTx.isError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {createTx.error.message}
                </div>
              )}

              {/* Type toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === "BUY" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setType("BUY")}
                >
                  Buy
                </Button>
                <Button
                  type="button"
                  variant={type === "SELL" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setType("SELL")}
                >
                  Sell
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Shares</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="any"
                    min="0.0001"
                    placeholder="10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Share</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="150.00"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fees">Fees</Label>
                  <Input
                    id="fees"
                    type="number"
                    step="0.01"
                    min="0"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={executedAt}
                    onChange={(e) => setExecutedAt(e.target.value)}
                    required
                  />
                </div>
              </div>

              {totalAmount > 0 && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <span className="text-muted-foreground">Total: </span>
                  <span className="font-semibold">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="Why did you make this trade?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createTx.isPending}
              >
                {createTx.isPending
                  ? "Adding..."
                  : `Add ${type === "BUY" ? "Buy" : "Sell"} Transaction`}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </>
  );
}

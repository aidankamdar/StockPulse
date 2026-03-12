"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PriceChangeIndicator } from "@/components/shared/price-change-indicator";
import { formatCurrency } from "@/lib/utils/format";
import { DollarSign, TrendingUp, BarChart3, Layers, Banknote } from "lucide-react";

interface PortfolioSummaryBarProps {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalPnl: number;
  totalPnlPercent: number;
  positionCount: number;
  cashBalance?: number;
}

export function PortfolioSummaryBar({
  totalValue,
  dayChange,
  dayChangePercent,
  totalPnl,
  totalPnlPercent,
  positionCount,
  cashBalance,
}: PortfolioSummaryBarProps) {
  const cards = [
    {
      title: "Total Value",
      icon: DollarSign,
      value: formatCurrency(totalValue),
      change: null,
    },
    {
      title: "Day Change",
      icon: TrendingUp,
      value: null,
      change: { value: dayChange, percent: dayChangePercent },
    },
    {
      title: "Total P&L",
      icon: BarChart3,
      value: null,
      change: { value: totalPnl, percent: totalPnlPercent },
    },
    {
      title: "Positions",
      icon: Layers,
      value: positionCount.toString(),
      change: null,
    },
  ];

  // Add cash card if there's a cash balance
  if (cashBalance !== undefined && cashBalance > 0) {
    cards.push({
      title: "Cash",
      icon: Banknote,
      value: formatCurrency(cashBalance),
      change: null,
    });
  }

  const gridCols = cards.length > 4 ? "lg:grid-cols-5" : "lg:grid-cols-4";

  return (
    <div className={`grid gap-4 md:grid-cols-2 ${gridCols}`}>
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{card.title}</p>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2">
              {card.value && (
                <p className="text-2xl font-bold">{card.value}</p>
              )}
              {card.change && (
                <PriceChangeIndicator
                  value={card.change.value}
                  percent={card.change.percent}
                  size="lg"
                />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

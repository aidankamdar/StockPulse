"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

import type { GainerLoser } from "@/types/analytics";

export interface GainersLosersCardProps {
  title: string;
  items: GainerLoser[];
  type: "gainers" | "losers";
}

export function GainersLosersCard({
  title,
  items,
  type,
}: GainersLosersCardProps) {
  const Icon = type === "gainers" ? TrendingUp : TrendingDown;
  const colorClass = type === "gainers" ? "text-success" : "text-loss";
  const badgeVariant = type === "gainers" ? "success" : "loss";

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className={`h-4 w-4 ${colorClass}`} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No {type} to display.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${colorClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.symbol}
              href={`/portfolio/${item.symbol}`}
              className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{item.symbol}</span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(item.currentValue)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${colorClass}`}>
                  {formatCurrency(item.unrealizedPnl)}
                </span>
                <Badge variant={badgeVariant}>
                  {formatPercent(item.unrealizedPnlPercent)}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

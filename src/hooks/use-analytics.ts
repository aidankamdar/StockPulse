"use client";

import { useQuery } from "@tanstack/react-query";
import { CACHE_TIMES } from "@/lib/utils/constants";

import type { SnapshotView, StockDetail, PerformancePeriod } from "@/types/analytics";

// ─── Fetch portfolio snapshots ──────────────────────────────────────────────

async function fetchSnapshots(
  portfolioId: string,
  period: PerformancePeriod
): Promise<SnapshotView[]> {
  const res = await fetch(
    `/api/portfolio/snapshots?portfolio_id=${portfolioId}&period=${period}`
  );
  if (!res.ok) throw new Error("Failed to fetch snapshots");
  const json = await res.json();
  return json.data;
}

export function usePortfolioSnapshots(
  portfolioId: string | undefined,
  period: PerformancePeriod = "1M"
) {
  return useQuery({
    queryKey: ["snapshots", portfolioId, period],
    queryFn: () => fetchSnapshots(portfolioId!, period),
    enabled: !!portfolioId,
    staleTime: CACHE_TIMES.HISTORICAL,
  });
}

// ─── Fetch stock detail ─────────────────────────────────────────────────────

async function fetchStockDetail(symbol: string): Promise<StockDetail> {
  const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Failed to fetch stock detail for ${symbol}`);
  const json = await res.json();
  return json.data;
}

export function useStockDetail(symbol: string | undefined) {
  return useQuery({
    queryKey: ["stock-detail", symbol],
    queryFn: () => fetchStockDetail(symbol!),
    enabled: !!symbol,
    staleTime: CACHE_TIMES.STOCK_QUOTE,
  });
}

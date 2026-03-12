"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CACHE_TIMES } from "@/lib/utils/constants";

// ─── Fetch portfolios ────────────────────────────────────────────────────────

async function fetchPortfolios() {
  const res = await fetch("/api/portfolio");
  if (!res.ok) throw new Error("Failed to fetch portfolios");
  const json = await res.json();
  return json.data;
}

export function usePortfolios() {
  return useQuery({
    queryKey: ["portfolios"],
    queryFn: fetchPortfolios,
    staleTime: CACHE_TIMES.PORTFOLIO,
  });
}

// ─── Fetch positions ─────────────────────────────────────────────────────────

async function fetchPositions(portfolioId: string) {
  const res = await fetch(`/api/positions?portfolio_id=${portfolioId}`);
  if (!res.ok) throw new Error("Failed to fetch positions");
  const json = await res.json();
  return json.data;
}

export function usePositions(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ["positions", portfolioId],
    queryFn: () => fetchPositions(portfolioId!),
    enabled: !!portfolioId,
    staleTime: CACHE_TIMES.PORTFOLIO,
  });
}

// ─── Plaid sync ─────────────────────────────────────────────────────────────

async function triggerPlaidSync() {
  const res = await fetch("/api/plaid/sync", { method: "POST" });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error?.message ?? "Sync failed");
  }
  return res.json();
}

export function usePlaidSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: triggerPlaidSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["plaid-status"] });
    },
  });
}

// ─── Plaid status ───────────────────────────────────────────────────────────

async function fetchPlaidStatus() {
  const res = await fetch("/api/plaid/status");
  if (!res.ok) throw new Error("Failed to check Plaid status");
  const json = await res.json();
  return json.data;
}

export function usePlaidStatus() {
  return useQuery({
    queryKey: ["plaid-status"],
    queryFn: fetchPlaidStatus,
    staleTime: CACHE_TIMES.PORTFOLIO,
  });
}


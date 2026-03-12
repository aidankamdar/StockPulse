"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CACHE_TIMES } from "@/lib/utils/constants";

import type { WatchlistItemView } from "@/types/analytics";

// ─── Fetch watchlist ────────────────────────────────────────────────────────

async function fetchWatchlist(): Promise<WatchlistItemView[]> {
  const res = await fetch("/api/watchlist");
  if (!res.ok) throw new Error("Failed to fetch watchlist");
  const json = await res.json();
  return json.data;
}

export function useWatchlist() {
  return useQuery({
    queryKey: ["watchlist"],
    queryFn: fetchWatchlist,
    staleTime: CACHE_TIMES.PORTFOLIO,
  });
}

// ─── Add to watchlist ───────────────────────────────────────────────────────

interface AddWatchlistInput {
  symbol: string;
  target_buy_price?: number;
  notes?: string;
}

async function addToWatchlist(input: AddWatchlistInput): Promise<WatchlistItemView> {
  const res = await fetch("/api/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error?.message ?? "Failed to add to watchlist");
  }
  const json = await res.json();
  return json.data;
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addToWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

// ─── Remove from watchlist ──────────────────────────────────────────────────

async function removeFromWatchlist(id: string): Promise<void> {
  const res = await fetch(`/api/watchlist?id=${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error?.message ?? "Failed to remove from watchlist");
  }
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeFromWatchlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

// ─── Update watchlist item ──────────────────────────────────────────────────

interface UpdateWatchlistInput {
  id: string;
  target_buy_price?: number | null;
  notes?: string | null;
}

async function updateWatchlistItem(input: UpdateWatchlistInput): Promise<WatchlistItemView> {
  const { id, ...body } = input;
  const res = await fetch(`/api/watchlist?id=${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error?.message ?? "Failed to update watchlist item");
  }
  const json = await res.json();
  return json.data;
}

export function useUpdateWatchlistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWatchlistItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });
}

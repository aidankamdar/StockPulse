"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateTransactionInput } from "@/lib/validators/transaction";
import { CACHE_TIMES } from "@/lib/utils/constants";

// ─── Fetch transactions ──────────────────────────────────────────────────────

async function fetchTransactions(portfolioId: string, cursor?: string) {
  const params = new URLSearchParams({ portfolio_id: portfolioId });
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/transactions?${params}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export function useTransactions(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ["transactions", portfolioId],
    queryFn: () => fetchTransactions(portfolioId!),
    enabled: !!portfolioId,
    staleTime: CACHE_TIMES.PORTFOLIO,
  });
}

// ─── Create transaction ──────────────────────────────────────────────────────

async function createTransaction(input: CreateTransactionInput) {
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error?.message ?? "Failed to create transaction");
  }
  return res.json();
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

import { z } from "zod";

export const createWatchlistItemSchema = z.object({
  symbol: z.string().min(1, "Symbol is required").max(10).toUpperCase(),
  target_buy_price: z.number().positive("Target price must be positive").optional(),
  notes: z.string().max(500).optional(),
});

export type CreateWatchlistItemInput = z.infer<typeof createWatchlistItemSchema>;

export const updateWatchlistItemSchema = z.object({
  id: z.string().uuid(),
  target_buy_price: z.number().positive("Target price must be positive").nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type UpdateWatchlistItemInput = z.infer<typeof updateWatchlistItemSchema>;

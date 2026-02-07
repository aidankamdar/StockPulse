import { z } from "zod";

export const createTransactionSchema = z.object({
  portfolio_id: z.string().uuid(),
  symbol: z.string().min(1).max(10).toUpperCase(),
  type: z.enum(["BUY", "SELL", "DIVIDEND"]),
  quantity: z.number().positive("Quantity must be positive"),
  price_per_unit: z.number().nonnegative("Price must be non-negative"),
  total_amount: z.number().nonnegative("Total must be non-negative"),
  fees: z.number().nonnegative().default(0),
  executed_at: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

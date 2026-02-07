import { z } from "zod";

export const createPortfolioSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;

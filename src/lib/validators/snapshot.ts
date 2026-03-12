import { z } from "zod";

export const snapshotQuerySchema = z.object({
  portfolio_id: z.string().uuid("Invalid portfolio ID"),
  period: z
    .enum(["1W", "1M", "3M", "6M", "1Y", "ALL"])
    .default("1M"),
});

export type SnapshotQueryInput = z.infer<typeof snapshotQuerySchema>;

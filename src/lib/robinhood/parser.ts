import { z } from "zod";

// ─── Raw JSON schemas from Python scripts ────────────────────────────────────

const RobinhoodPositionSchema = z.object({
  symbol: z.string(),
  quantity: z.number(),
  average_buy_price: z.number(),
  current_price: z.number(),
  current_value: z.number(),
  total_cost: z.number(),
  unrealized_pnl: z.number(),
  unrealized_pnl_percent: z.number(),
  instrument_id: z.string().optional(),
});

const RobinhoodAccountSchema = z.object({
  equity: z.string().nullable(),
  extended_hours_equity: z.string().nullable(),
  market_value: z.string().nullable(),
  cash: z.string().nullable(),
  buying_power: z.string().nullable(),
  portfolio_cash: z.string().nullable(),
});

export const RobinhoodPortfolioSchema = z.object({
  account: RobinhoodAccountSchema,
  positions: z.array(RobinhoodPositionSchema),
});

const RobinhoodOrderSchema = z.object({
  robinhood_order_id: z.string(),
  symbol: z.string(),
  type: z.enum(["BUY", "SELL", "DIVIDEND"]),
  quantity: z.number(),
  price_per_unit: z.number(),
  total_amount: z.number(),
  fees: z.number(),
  executed_at: z.string().nullable(),
});

export const RobinhoodOrdersSchema = z.object({
  orders: z.array(RobinhoodOrderSchema),
  dividends: z.array(RobinhoodOrderSchema),
});

const RobinhoodErrorSchema = z.object({
  error: z.string(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type RobinhoodPortfolio = z.infer<typeof RobinhoodPortfolioSchema>;
export type RobinhoodPosition = z.infer<typeof RobinhoodPositionSchema>;
export type RobinhoodOrders = z.infer<typeof RobinhoodOrdersSchema>;
export type RobinhoodOrder = z.infer<typeof RobinhoodOrderSchema>;

// ─── Parsing ─────────────────────────────────────────────────────────────────

export function parseRobinhoodOutput<T>(
  raw: string,
  schema: z.ZodType<T>
): { data: T } | { error: string } {
  try {
    const json = JSON.parse(raw);

    // Check for error response
    const errorResult = RobinhoodErrorSchema.safeParse(json);
    if (errorResult.success) {
      return { error: errorResult.data.error };
    }

    const result = schema.safeParse(json);
    if (!result.success) {
      return { error: `Invalid response format: ${result.error.message}` };
    }

    return { data: result.data };
  } catch {
    return { error: `Failed to parse JSON output: ${raw.slice(0, 200)}` };
  }
}

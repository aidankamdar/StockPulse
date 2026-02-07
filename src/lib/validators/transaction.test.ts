import { createTransactionSchema } from "./transaction";

describe("createTransactionSchema", () => {
  const validInput = {
    portfolio_id: "550e8400-e29b-41d4-a716-446655440000",
    symbol: "AAPL",
    type: "BUY" as const,
    quantity: 10,
    price_per_unit: 150.5,
    total_amount: 1505,
    fees: 0,
    executed_at: "2026-01-15T10:30:00.000Z",
  };

  it("accepts valid input", () => {
    const result = createTransactionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("uppercases symbol", () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      symbol: "aapl",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.symbol).toBe("AAPL");
    }
  });

  it("accepts optional notes", () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      notes: "Bought the dip",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing symbol", () => {
    const { symbol, ...rest } = validInput;
    const result = createTransactionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      quantity: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      price_per_unit: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      type: "TRANSFER",
    });
    expect(result.success).toBe(false);
  });

  it("accepts SELL type", () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      type: "SELL",
    });
    expect(result.success).toBe(true);
  });

  it("accepts DIVIDEND type", () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      type: "DIVIDEND",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for portfolio_id", () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      portfolio_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("defaults fees to 0", () => {
    const { fees, ...rest } = validInput;
    const result = createTransactionSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fees).toBe(0);
    }
  });
});

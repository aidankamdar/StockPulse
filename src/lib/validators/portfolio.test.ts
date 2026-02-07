import { createPortfolioSchema } from "./portfolio";

describe("createPortfolioSchema", () => {
  it("accepts valid input", () => {
    const result = createPortfolioSchema.safeParse({ name: "My Portfolio" });
    expect(result.success).toBe(true);
  });

  it("accepts input with description", () => {
    const result = createPortfolioSchema.safeParse({
      name: "Growth",
      description: "Long-term growth stocks",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createPortfolioSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = createPortfolioSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 chars", () => {
    const result = createPortfolioSchema.safeParse({
      name: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects description over 500 chars", () => {
    const result = createPortfolioSchema.safeParse({
      name: "Test",
      description: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description at exactly 500 chars", () => {
    const result = createPortfolioSchema.safeParse({
      name: "Test",
      description: "a".repeat(500),
    });
    expect(result.success).toBe(true);
  });
});

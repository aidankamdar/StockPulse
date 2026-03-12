/**
 * Prisma seed script.
 * Creates a test user, portfolio, positions, transactions, and watchlist items.
 *
 * Usage: npx prisma db seed
 * (runs via the `prisma.seed` config in package.json)
 */

import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient();

// Stable test UUIDs so re-seeding is idempotent
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const TEST_PORTFOLIO_ID = "00000000-0000-0000-0000-000000000002";

async function main() {
  console.log("🌱 Seeding database...");

  // ─── User ──────────────────────────────────────────────────────────────────
  const user = await db.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: {
      id: TEST_USER_ID,
      email: "dev@stockpulse.local",
      display_name: "Dev User",
      username: "devuser",
      bio: "Test account for local development",
      is_portfolio_public: false,
      plaid_connected: false,
    },
  });
  console.log(`✅ User: ${user.email}`);

  // ─── Portfolio ─────────────────────────────────────────────────────────────
  const portfolio = await db.portfolio.upsert({
    where: { id: TEST_PORTFOLIO_ID },
    update: {},
    create: {
      id: TEST_PORTFOLIO_ID,
      user_id: user.id,
      name: "My Portfolio",
      description: "Seed portfolio for local development",
      source: "MANUAL",
      is_public: false,
    },
  });
  console.log(`✅ Portfolio: ${portfolio.name}`);

  // ─── Positions ─────────────────────────────────────────────────────────────
  const positionData = [
    {
      symbol: "AAPL",
      quantity: 10,
      average_cost_basis: 155.42,
      total_cost_basis: 1554.2,
      current_price: 185.63,
      current_value: 1856.3,
      unrealized_pnl: 302.1,
      unrealized_pnl_percent: 19.44,
      sector: "Technology",
    },
    {
      symbol: "MSFT",
      quantity: 5,
      average_cost_basis: 310.0,
      total_cost_basis: 1550.0,
      current_price: 378.85,
      current_value: 1894.25,
      unrealized_pnl: 344.25,
      unrealized_pnl_percent: 22.21,
      sector: "Technology",
    },
    {
      symbol: "NVDA",
      quantity: 3,
      average_cost_basis: 450.0,
      total_cost_basis: 1350.0,
      current_price: 875.4,
      current_value: 2626.2,
      unrealized_pnl: 1276.2,
      unrealized_pnl_percent: 94.53,
      sector: "Technology",
    },
    {
      symbol: "GOOGL",
      quantity: 8,
      average_cost_basis: 138.5,
      total_cost_basis: 1108.0,
      current_price: 152.19,
      current_value: 1217.52,
      unrealized_pnl: 109.52,
      unrealized_pnl_percent: 9.88,
      sector: "Communication Services",
    },
    {
      symbol: "JPM",
      quantity: 12,
      average_cost_basis: 185.0,
      total_cost_basis: 2220.0,
      current_price: 176.8,
      current_value: 2121.6,
      unrealized_pnl: -98.4,
      unrealized_pnl_percent: -4.43,
      sector: "Financials",
    },
  ];

  for (const pos of positionData) {
    await db.position.upsert({
      where: {
        portfolio_id_symbol: {
          portfolio_id: portfolio.id,
          symbol: pos.symbol,
        },
      },
      update: {
        current_price: pos.current_price,
        current_value: pos.current_value,
        unrealized_pnl: pos.unrealized_pnl,
        unrealized_pnl_percent: pos.unrealized_pnl_percent,
      },
      create: {
        portfolio_id: portfolio.id,
        ...pos,
        last_synced_at: new Date(),
      },
    });
  }
  console.log(`✅ Positions: ${positionData.length} upserted`);

  // ─── Transactions ──────────────────────────────────────────────────────────
  // Only create if none exist (avoid duplicates on re-seed)
  const existingTxCount = await db.transaction.count({
    where: { portfolio_id: portfolio.id },
  });

  if (existingTxCount === 0) {
    const now = new Date();
    const daysAgo = (n: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - n);
      return d;
    };

    const transactions = [
      { symbol: "AAPL", type: "BUY" as const, quantity: 10, price_per_unit: 155.42, total_amount: 1554.2, executed_at: daysAgo(180), notes: "Initial position" },
      { symbol: "MSFT", type: "BUY" as const, quantity: 5, price_per_unit: 310.0, total_amount: 1550.0, executed_at: daysAgo(150), notes: "Cloud growth play" },
      { symbol: "NVDA", type: "BUY" as const, quantity: 3, price_per_unit: 450.0, total_amount: 1350.0, executed_at: daysAgo(120), notes: "AI chip leader" },
      { symbol: "GOOGL", type: "BUY" as const, quantity: 8, price_per_unit: 138.5, total_amount: 1108.0, executed_at: daysAgo(100), notes: "Undervalued vs peers" },
      { symbol: "JPM", type: "BUY" as const, quantity: 12, price_per_unit: 185.0, total_amount: 2220.0, executed_at: daysAgo(90), notes: "Financials diversification" },
      { symbol: "AAPL", type: "DIVIDEND" as const, quantity: 10, price_per_unit: 0.24, total_amount: 2.4, executed_at: daysAgo(60), notes: null },
      { symbol: "MSFT", type: "DIVIDEND" as const, quantity: 5, price_per_unit: 0.75, total_amount: 3.75, executed_at: daysAgo(45), notes: null },
      { symbol: "GOOGL", type: "SELL" as const, quantity: 2, price_per_unit: 148.0, total_amount: 296.0, executed_at: daysAgo(30), notes: "Trimmed position — took partial profits" },
      { symbol: "GOOGL", type: "BUY" as const, quantity: 2, price_per_unit: 140.0, total_amount: 280.0, executed_at: daysAgo(20), notes: "Bought back on dip" },
      { symbol: "JPM", type: "DIVIDEND" as const, quantity: 12, price_per_unit: 1.15, total_amount: 13.8, executed_at: daysAgo(10), notes: null },
    ];

    await db.transaction.createMany({
      data: transactions.map((tx) => ({
        ...tx,
        portfolio_id: portfolio.id,
        source: "MANUAL" as const,
        fees: 0,
      })),
    });
    console.log(`✅ Transactions: ${transactions.length} created`);
  } else {
    console.log(`⏭️  Transactions: ${existingTxCount} already exist, skipping`);
  }

  // ─── Watchlist ─────────────────────────────────────────────────────────────
  const watchlistItems = [
    { symbol: "AMD", target_buy_price: 140.0, notes: "Waiting for pullback" },
    { symbol: "META", target_buy_price: null, notes: "Watching AI monetization progress" },
    { symbol: "AMZN", target_buy_price: 180.0, notes: "AWS margin expansion story" },
  ];

  for (const item of watchlistItems) {
    await db.watchlist.upsert({
      where: { user_id_symbol: { user_id: user.id, symbol: item.symbol } },
      update: {},
      create: {
        user_id: user.id,
        ...item,
      },
    });
  }
  console.log(`✅ Watchlist: ${watchlistItems.length} items upserted`);

  // ─── Portfolio Snapshots ───────────────────────────────────────────────────
  const existingSnapshots = await db.portfolioSnapshot.count({
    where: { portfolio_id: portfolio.id },
  });

  if (existingSnapshots === 0) {
    const snapshotData = [];
    const totalCostBasis = 7782.2; // sum of all cost basis above

    // Generate 30 daily snapshots ending today
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      // Simulate gradual growth with some noise
      const growthFactor = 1 + (29 - i) * 0.003 + (Math.sin(i) * 0.005);
      const totalValue = Math.round(totalCostBasis * growthFactor * 100) / 100;
      const totalPnl = totalValue - totalCostBasis;
      const totalPnlPercent = (totalPnl / totalCostBasis) * 100;

      snapshotData.push({
        portfolio_id: portfolio.id,
        date,
        total_value: totalValue,
        total_cost_basis: totalCostBasis,
        total_pnl: Math.round(totalPnl * 100) / 100,
        total_pnl_percent: Math.round(totalPnlPercent * 10000) / 10000,
        num_positions: 5,
      });
    }

    await db.portfolioSnapshot.createMany({ data: snapshotData });
    console.log(`✅ Snapshots: ${snapshotData.length} days created`);
  } else {
    console.log(`⏭️  Snapshots: ${existingSnapshots} already exist, skipping`);
  }

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

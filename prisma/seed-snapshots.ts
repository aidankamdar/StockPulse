import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const connectionString = rawUrl.replace(/[?&]sslmode=[^&]+/, "");
  const pool = new pg.Pool({
    connectionString,
    ssl: rawUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const portfolioId = await resolvePortfolioId(prisma);
    console.log(`Seeding snapshots for portfolio: ${portfolioId}`);

    const snapshots = generateSnapshots(portfolioId);
    console.log(`Generated ${snapshots.length} snapshot records (skipping weekends)`);

    let upserted = 0;
    for (const snapshot of snapshots) {
      await prisma.portfolioSnapshot.upsert({
        where: {
          portfolio_id_date: {
            portfolio_id: snapshot.portfolio_id,
            date: snapshot.date,
          },
        },
        update: {
          total_value: snapshot.total_value,
          total_cost_basis: snapshot.total_cost_basis,
          total_pnl: snapshot.total_pnl,
          total_pnl_percent: snapshot.total_pnl_percent,
          num_positions: snapshot.num_positions,
        },
        create: snapshot,
      });
      upserted++;
    }

    console.log(`Upserted ${upserted} portfolio snapshots successfully.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function resolvePortfolioId(prisma: PrismaClient): Promise<string> {
  // Accept portfolio_id as CLI argument
  const cliArg = process.argv[2];
  if (cliArg) {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: cliArg },
    });
    if (!portfolio) {
      throw new Error(`Portfolio not found with id: ${cliArg}`);
    }
    return portfolio.id;
  }

  // Otherwise, find the first user's first portfolio
  const user = await prisma.user.findFirst({
    orderBy: { created_at: "asc" },
  });
  if (!user) {
    throw new Error("No users found in the database. Create a user first.");
  }

  const portfolio = await prisma.portfolio.findFirst({
    where: { user_id: user.id },
    orderBy: { created_at: "asc" },
  });
  if (!portfolio) {
    throw new Error(
      `No portfolios found for user ${user.email}. Create a portfolio first.`
    );
  }

  return portfolio.id;
}

interface SnapshotRecord {
  portfolio_id: string;
  date: Date;
  total_value: Decimal;
  total_cost_basis: Decimal;
  total_pnl: Decimal;
  total_pnl_percent: Decimal;
  num_positions: number;
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function generateSnapshots(portfolioId: string): SnapshotRecord[] {
  const DAYS = 90;
  const BASE_VALUE = 1500;
  const COST_BASIS = 1500;
  const MIN_POSITIONS = 3;
  const MAX_POSITIONS = 5;
  const DAILY_CHANGE_MIN = -0.03;
  const DAILY_CHANGE_MAX = 0.03;
  const UPWARD_BIAS = 0.002;

  const snapshots: SnapshotRecord[] = [];
  let currentValue = BASE_VALUE;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - DAYS);

  for (let i = 0; i <= DAYS; i++) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + i);

    if (isWeekend(date)) {
      continue;
    }

    // Apply random daily change with upward bias
    if (i > 0) {
      const dailyChange =
        DAILY_CHANGE_MIN +
        Math.random() * (DAILY_CHANGE_MAX - DAILY_CHANGE_MIN) +
        UPWARD_BIAS;
      currentValue = currentValue * (1 + dailyChange);
    }

    const totalPnl = currentValue - COST_BASIS;
    const totalPnlPercent = (totalPnl / COST_BASIS) * 100;
    const numPositions =
      MIN_POSITIONS + Math.floor(Math.random() * (MAX_POSITIONS - MIN_POSITIONS + 1));

    snapshots.push({
      portfolio_id: portfolioId,
      date,
      total_value: new Decimal(currentValue.toFixed(4)),
      total_cost_basis: new Decimal(COST_BASIS.toFixed(4)),
      total_pnl: new Decimal(totalPnl.toFixed(4)),
      total_pnl_percent: new Decimal(totalPnlPercent.toFixed(4)),
      num_positions: numPositions,
    });
  }

  return snapshots;
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});

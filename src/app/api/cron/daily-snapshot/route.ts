import { NextRequest, NextResponse } from "next/server";
import { requireDatabase } from "@/lib/prisma/client";
import { verifyCronSecret } from "@/lib/cron/auth";
import { calculatePortfolioSummary } from "@/lib/calculations/portfolio";

import type { PortfolioPositionInput } from "@/lib/calculations/portfolio";

/**
 * POST /api/cron/daily-snapshot
 * Creates a daily snapshot for all portfolios with positions.
 * Protected by CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 }
    );
  }

  try {
    const db = requireDatabase();

    // Get all portfolios that have positions
    const portfolios = await db.portfolio.findMany({
      where: {
        positions: { some: {} },
      },
      include: {
        positions: {
          select: {
            quantity: true,
            average_cost_basis: true,
            current_price: true,
          },
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let snapshotsCreated = 0;

    for (const portfolio of portfolios) {
      const positionInputs: PortfolioPositionInput[] = portfolio.positions.map(
        (p) => ({
          quantity: Number(p.quantity),
          averageCostBasis: Number(p.average_cost_basis),
          currentPrice: Number(p.current_price),
        })
      );

      const summary = calculatePortfolioSummary(positionInputs);

      // Upsert — if snapshot already exists for today, update it
      await db.portfolioSnapshot.upsert({
        where: {
          portfolio_id_date: {
            portfolio_id: portfolio.id,
            date: today,
          },
        },
        update: {
          total_value: summary.totalValue,
          total_cost_basis: summary.totalCostBasis,
          total_pnl: summary.totalPnl,
          total_pnl_percent: summary.totalPnlPercent,
          num_positions: portfolio.positions.length,
        },
        create: {
          portfolio_id: portfolio.id,
          date: today,
          total_value: summary.totalValue,
          total_cost_basis: summary.totalCostBasis,
          total_pnl: summary.totalPnl,
          total_pnl_percent: summary.totalPnlPercent,
          num_positions: portfolio.positions.length,
        },
      });

      snapshotsCreated++;
    }

    return NextResponse.json({
      data: {
        message: `Created ${snapshotsCreated} snapshot(s)`,
        date: today.toISOString().split("T")[0],
        portfolios_processed: portfolios.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Snapshot creation failed";
    console.error("[cron/daily-snapshot]", message);

    return NextResponse.json(
      { error: { code: "SNAPSHOT_FAILED", message } },
      { status: 500 }
    );
  }
}

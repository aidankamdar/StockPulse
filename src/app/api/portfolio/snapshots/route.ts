import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDatabase } from "@/lib/prisma/client";
import { snapshotQuerySchema } from "@/lib/validators/snapshot";
import { filterSnapshotsByPeriod } from "@/lib/calculations/analytics";

import type { SnapshotView, PerformancePeriod } from "@/types/analytics";

// GET /api/portfolio/snapshots?portfolio_id=xxx&period=1M
export async function GET(request: NextRequest) {
  try {
    const db = requireDatabase();

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    // Parse and validate query params
    const portfolioId = request.nextUrl.searchParams.get("portfolio_id") ?? "";
    const period = (request.nextUrl.searchParams.get("period") ?? "1M") as PerformancePeriod;

    const validation = snapshotQuerySchema.safeParse({
      portfolio_id: portfolioId,
      period,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.issues[0]?.message ?? "Invalid input",
          },
        },
        { status: 400 }
      );
    }

    // Verify portfolio ownership
    const portfolio = await db.portfolio.findFirst({
      where: { id: validation.data.portfolio_id, user_id: user.id },
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Portfolio not found" } },
        { status: 404 }
      );
    }

    // Fetch all snapshots ordered by date
    const snapshots = await db.portfolioSnapshot.findMany({
      where: { portfolio_id: portfolio.id },
      orderBy: { date: "asc" },
    });

    // Map to SnapshotView
    const views: SnapshotView[] = snapshots.map((s) => ({
      id: s.id,
      date: s.date.toISOString().split("T")[0]!,
      totalValue: Number(s.total_value),
      totalCostBasis: Number(s.total_cost_basis),
      totalPnl: Number(s.total_pnl),
      totalPnlPercent: Number(s.total_pnl_percent),
      numPositions: s.num_positions,
    }));

    // Filter by period
    const filtered = filterSnapshotsByPeriod(views, validation.data.period);

    return NextResponse.json({ data: filtered });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch snapshots";
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message } },
      { status: 500 }
    );
  }
}

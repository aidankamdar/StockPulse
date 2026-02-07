import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

// GET /api/positions?portfolio_id=xxx - List positions for a portfolio
export async function GET(request: NextRequest) {
  try {
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

    const portfolioId = request.nextUrl.searchParams.get("portfolio_id");

    if (!portfolioId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "portfolio_id is required" } },
        { status: 400 }
      );
    }

    // Verify portfolio belongs to user
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, user_id: user.id },
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Portfolio not found" } },
        { status: 404 }
      );
    }

    const positions = await prisma.position.findMany({
      where: { portfolio_id: portfolioId },
      orderBy: { current_value: "desc" },
    });

    const data = positions.map((pos) => ({
      id: pos.id,
      symbol: pos.symbol,
      quantity: Number(pos.quantity),
      average_cost_basis: Number(pos.average_cost_basis),
      total_cost_basis: Number(pos.total_cost_basis),
      current_price: Number(pos.current_price),
      current_value: Number(pos.current_value),
      unrealized_pnl: Number(pos.unrealized_pnl),
      unrealized_pnl_percent: Number(pos.unrealized_pnl_percent),
      sector: pos.sector,
      last_synced_at: pos.last_synced_at,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch positions";
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message } },
      { status: 500 }
    );
  }
}

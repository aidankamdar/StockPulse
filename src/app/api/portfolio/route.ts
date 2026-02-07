import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDatabase } from "@/lib/prisma/client";
import { createPortfolioSchema } from "@/lib/validators/portfolio";

// GET /api/portfolio - List user's portfolios with position summaries
export async function GET() {
  try {
    const db = requireDatabase();

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

    let portfolios = await db.portfolio.findMany({
      where: { user_id: user.id },
      include: {
        positions: true,
      },
      orderBy: { created_at: "asc" },
    });

    // Auto-create a default portfolio on first visit
    if (portfolios.length === 0) {
      const newPortfolio = await db.portfolio.create({
        data: {
          user_id: user.id,
          name: "My Portfolio",
          source: "MANUAL",
        },
        include: { positions: true },
      });
      portfolios = [newPortfolio];
    }

    const data = portfolios.map((p) => {
      const totalValue = p.positions.reduce(
        (sum, pos) => sum + Number(pos.current_value),
        0
      );
      const totalCostBasis = p.positions.reduce(
        (sum, pos) => sum + Number(pos.total_cost_basis),
        0
      );
      const totalPnl = totalValue - totalCostBasis;
      const totalPnlPercent =
        totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        source: p.source,
        is_public: p.is_public,
        position_count: p.positions.length,
        total_value: totalValue,
        total_cost_basis: totalCostBasis,
        total_pnl: totalPnl,
        total_pnl_percent: totalPnlPercent,
        created_at: p.created_at,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch portfolios";
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message } },
      { status: 500 }
    );
  }
}

// POST /api/portfolio - Create a new portfolio
export async function POST(request: Request) {
  try {
    const db = requireDatabase();

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

    const body = await request.json();
    const parsed = createPortfolioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const portfolio = await db.portfolio.create({
      data: {
        user_id: user.id,
        name: parsed.data.name,
        description: parsed.data.description,
      },
    });

    return NextResponse.json({ data: portfolio }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create portfolio";
    return NextResponse.json(
      { error: { code: "CREATE_FAILED", message } },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { createTransactionSchema } from "@/lib/validators/transaction";
import {
  calculateAverageCostBasis,
  calculatePositionMetrics,
} from "@/lib/calculations/portfolio";

// GET /api/transactions?portfolio_id=xxx&cursor=xxx&limit=20
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
    const cursor = request.nextUrl.searchParams.get("cursor");
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") ?? "20"),
      100
    );

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

    const transactions = await prisma.transaction.findMany({
      where: {
        portfolio_id: portfolioId,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { executed_at: "desc" },
      take: limit + 1,
    });

    const hasMore = transactions.length > limit;
    const data = transactions.slice(0, limit).map((tx) => ({
      id: tx.id,
      symbol: tx.symbol,
      type: tx.type,
      quantity: Number(tx.quantity),
      price_per_unit: Number(tx.price_per_unit),
      total_amount: Number(tx.total_amount),
      fees: Number(tx.fees),
      executed_at: tx.executed_at,
      notes: tx.notes,
      source: tx.source,
    }));

    return NextResponse.json({
      data,
      meta: {
        cursor: hasMore ? data[data.length - 1]?.id ?? null : null,
        has_more: hasMore,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch transactions";
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message } },
      { status: 500 }
    );
  }
}

// POST /api/transactions - Create a manual transaction
export async function POST(request: Request) {
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

    const body = await request.json();
    const parsed = createTransactionSchema.safeParse(body);

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

    // Verify portfolio belongs to user
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: parsed.data.portfolio_id, user_id: user.id },
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Portfolio not found" } },
        { status: 404 }
      );
    }

    // Create the transaction
    const transaction = await prisma.transaction.create({
      data: {
        portfolio_id: parsed.data.portfolio_id,
        symbol: parsed.data.symbol,
        type: parsed.data.type,
        quantity: parsed.data.quantity,
        price_per_unit: parsed.data.price_per_unit,
        total_amount: parsed.data.total_amount,
        fees: parsed.data.fees,
        executed_at: new Date(parsed.data.executed_at),
        notes: parsed.data.notes,
        source: "MANUAL",
      },
    });

    // Recalculate position from all trades for this symbol
    const allTrades = await prisma.transaction.findMany({
      where: {
        portfolio_id: parsed.data.portfolio_id,
        symbol: parsed.data.symbol,
      },
      orderBy: { executed_at: "asc" },
    });

    const trades = allTrades
      .filter((t) => t.type === "BUY" || t.type === "SELL")
      .map((t) => ({
        type: t.type as "BUY" | "SELL",
        quantity: Number(t.quantity),
        pricePerUnit: Number(t.price_per_unit),
        fees: Number(t.fees),
      }));

    const { averageCost, totalShares, totalInvested } =
      calculateAverageCostBasis(trades);

    if (totalShares > 0) {
      // Get current price from existing position or use last trade price
      const existingPosition = await prisma.position.findUnique({
        where: {
          portfolio_id_symbol: {
            portfolio_id: parsed.data.portfolio_id,
            symbol: parsed.data.symbol,
          },
        },
      });

      const currentPrice = existingPosition
        ? Number(existingPosition.current_price)
        : parsed.data.price_per_unit;

      const metrics = calculatePositionMetrics({
        quantity: totalShares,
        averageCostBasis: averageCost,
        currentPrice,
      });

      await prisma.position.upsert({
        where: {
          portfolio_id_symbol: {
            portfolio_id: parsed.data.portfolio_id,
            symbol: parsed.data.symbol,
          },
        },
        update: {
          quantity: totalShares,
          average_cost_basis: averageCost,
          total_cost_basis: metrics.totalCostBasis,
          current_price: currentPrice,
          current_value: metrics.currentValue,
          unrealized_pnl: metrics.unrealizedPnl,
          unrealized_pnl_percent: metrics.unrealizedPnlPercent,
        },
        create: {
          portfolio_id: parsed.data.portfolio_id,
          symbol: parsed.data.symbol,
          quantity: totalShares,
          average_cost_basis: averageCost,
          total_cost_basis: metrics.totalCostBasis,
          current_price: currentPrice,
          current_value: metrics.currentValue,
          unrealized_pnl: metrics.unrealizedPnl,
          unrealized_pnl_percent: metrics.unrealizedPnlPercent,
        },
      });
    } else {
      // All shares sold, remove position
      await prisma.position.deleteMany({
        where: {
          portfolio_id: parsed.data.portfolio_id,
          symbol: parsed.data.symbol,
        },
      });
    }

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create transaction";
    return NextResponse.json(
      { error: { code: "CREATE_FAILED", message } },
      { status: 500 }
    );
  }
}

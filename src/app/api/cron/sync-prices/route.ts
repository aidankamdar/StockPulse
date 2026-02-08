import { NextRequest, NextResponse } from "next/server";
import { requireDatabase } from "@/lib/prisma/client";
import { verifyCronSecret } from "@/lib/cron/auth";
import { getBatchQuotes } from "@/lib/robinhood/quotes";

/**
 * POST /api/cron/sync-prices
 * Refreshes current_price + current_value for all positions using
 * Robinhood's free batch quote API (up to 1630 symbols, no auth).
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

    // Get all unique symbols across all positions
    const positions = await db.position.findMany({
      select: {
        id: true,
        symbol: true,
        quantity: true,
        total_cost_basis: true,
      },
    });

    if (positions.length === 0) {
      return NextResponse.json({
        data: { message: "No positions to update", updated: 0 },
      });
    }

    // Get unique symbols
    const uniqueSymbols = [...new Set(positions.map((p) => p.symbol))];

    // Fetch batch quotes (up to 1630 in one call)
    const quotes = await getBatchQuotes(uniqueSymbols);

    // Build price lookup
    const priceMap = new Map(
      quotes.map((q) => [q.symbol, parseFloat(q.last_trade_price)])
    );

    const now = new Date();
    let updated = 0;

    for (const pos of positions) {
      const newPrice = priceMap.get(pos.symbol);
      if (newPrice === undefined) continue;

      const quantity = Number(pos.quantity);
      const currentValue = quantity * newPrice;
      const totalCostBasis = Number(pos.total_cost_basis);
      const unrealizedPnl = currentValue - totalCostBasis;
      const unrealizedPnlPercent =
        totalCostBasis > 0 ? (unrealizedPnl / totalCostBasis) * 100 : 0;

      await db.position.update({
        where: { id: pos.id },
        data: {
          current_price: newPrice,
          current_value: Math.round(currentValue * 10000) / 10000,
          unrealized_pnl: Math.round(unrealizedPnl * 10000) / 10000,
          unrealized_pnl_percent:
            Math.round(unrealizedPnlPercent * 10000) / 10000,
          last_synced_at: now,
        },
      });

      updated++;
    }

    return NextResponse.json({
      data: {
        message: `Updated ${updated} position(s)`,
        symbols_queried: uniqueSymbols.length,
        quotes_received: quotes.length,
        positions_updated: updated,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Price sync failed";
    console.error("[cron/sync-prices]", message);

    return NextResponse.json(
      { error: { code: "SYNC_FAILED", message } },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDatabase } from "@/lib/prisma/client";
import { fullSync } from "@/lib/robinhood/sync";

export async function POST() {
  try {
    const db = requireDatabase();

    // Verify auth
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

    // Get or create the user's Robinhood portfolio
    let portfolio = await db.portfolio.findFirst({
      where: { user_id: user.id, source: "ROBINHOOD" },
    });

    if (!portfolio) {
      portfolio = await db.portfolio.create({
        data: {
          user_id: user.id,
          name: "Robinhood",
          description: "Auto-synced from Robinhood",
          source: "ROBINHOOD",
        },
      });
    }

    const result = await fullSync(user.id, portfolio.id);

    return NextResponse.json({
      data: {
        message: "Sync complete",
        portfolio_id: portfolio.id,
        positions: result.positionCount,
        orders_synced: result.orders.synced,
        orders_skipped: result.orders.skipped,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sync failed";
    console.error("[robinhood/sync]", message);

    return NextResponse.json(
      { error: { code: "SYNC_FAILED", message } },
      { status: 500 }
    );
  }
}

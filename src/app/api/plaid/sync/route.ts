import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDatabase } from "@/lib/prisma/client";
import { fullPlaidSync } from "@/lib/plaid/sync";

export async function POST() {
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

    // Verify Plaid is connected
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { plaid_connected: true, plaid_access_token: true },
    });

    if (!dbUser?.plaid_connected || !dbUser.plaid_access_token) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_CONNECTED",
            message: "No Plaid account connected. Go to Settings to connect.",
          },
        },
        { status: 400 }
      );
    }

    // Get or create the Plaid portfolio
    let portfolio = await db.portfolio.findFirst({
      where: { user_id: user.id, source: "PLAID" },
    });

    if (!portfolio) {
      portfolio = await db.portfolio.create({
        data: {
          user_id: user.id,
          name: "Investment Portfolio",
          description: "Synced via Plaid",
          source: "PLAID",
        },
      });
    }

    const result = await fullPlaidSync(user.id, portfolio.id);

    return NextResponse.json({
      data: {
        message: "Sync complete",
        portfolio_id: portfolio.id,
        positions: result.positions,
        transactions_synced: result.orders.synced,
        transactions_skipped: result.orders.skipped,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sync failed";
    console.error("[plaid/sync]", message);

    return NextResponse.json(
      { error: { code: "SYNC_FAILED", message } },
      { status: 500 }
    );
  }
}

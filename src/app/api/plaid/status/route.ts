import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDatabase } from "@/lib/prisma/client";

export async function GET() {
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

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { plaid_connected: true },
    });

    const portfolio = await db.portfolio.findFirst({
      where: { user_id: user.id, source: "PLAID" },
      include: {
        positions: {
          select: { last_synced_at: true },
          orderBy: { last_synced_at: "desc" },
          take: 1,
        },
      },
    });

    const lastSyncedAt = portfolio?.positions?.[0]?.last_synced_at ?? null;

    return NextResponse.json({
      data: {
        connected: dbUser?.plaid_connected ?? false,
        portfolio_id: portfolio?.id ?? null,
        last_synced_at: lastSyncedAt,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check status";
    return NextResponse.json(
      { error: { code: "STATUS_CHECK_FAILED", message } },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
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

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { robinhood_connected: true },
    });

    const portfolio = await prisma.portfolio.findFirst({
      where: { user_id: user.id, source: "ROBINHOOD" },
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
        connected: dbUser?.robinhood_connected ?? false,
        portfolio_id: portfolio?.id ?? null,
        last_synced_at: lastSyncedAt,
        has_credentials: Boolean(
          process.env.ROBINHOOD_USERNAME && process.env.ROBINHOOD_PASSWORD
        ),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check status";
    return NextResponse.json(
      { error: { code: "STATUS_CHECK_FAILED", message } },
      { status: 500 }
    );
  }
}

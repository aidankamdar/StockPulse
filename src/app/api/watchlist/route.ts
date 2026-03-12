import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireDatabase } from "@/lib/prisma/client";
import {
  createWatchlistItemSchema,
  updateWatchlistItemSchema,
} from "@/lib/validators/watchlist";

// ─── GET /api/watchlist — List all watchlist items ──────────────────────────

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

    const items = await db.watchlist.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
    });

    const data = items.map((item) => ({
      id: item.id,
      symbol: item.symbol,
      target_buy_price: item.target_buy_price
        ? Number(item.target_buy_price)
        : null,
      notes: item.notes,
      created_at: item.created_at.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch watchlist";
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message } },
      { status: 500 }
    );
  }
}

// ─── POST /api/watchlist — Add to watchlist ─────────────────────────────────

export async function POST(request: NextRequest) {
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
    const validation = createWatchlistItemSchema.safeParse(body);

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

    // Check for duplicate
    const existing = await db.watchlist.findUnique({
      where: {
        user_id_symbol: {
          user_id: user.id,
          symbol: validation.data.symbol,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE",
            message: `${validation.data.symbol} is already on your watchlist`,
          },
        },
        { status: 409 }
      );
    }

    const item = await db.watchlist.create({
      data: {
        user_id: user.id,
        symbol: validation.data.symbol,
        target_buy_price: validation.data.target_buy_price ?? null,
        notes: validation.data.notes ?? null,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: item.id,
          symbol: item.symbol,
          target_buy_price: item.target_buy_price
            ? Number(item.target_buy_price)
            : null,
          notes: item.notes,
          created_at: item.created_at.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add to watchlist";
    return NextResponse.json(
      { error: { code: "CREATE_FAILED", message } },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/watchlist?id=xxx — Remove from watchlist ───────────────────

export async function DELETE(request: NextRequest) {
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

    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    // Verify ownership
    const item = await db.watchlist.findFirst({
      where: { id, user_id: user.id },
    });

    if (!item) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Watchlist item not found" } },
        { status: 404 }
      );
    }

    await db.watchlist.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove from watchlist";
    return NextResponse.json(
      { error: { code: "DELETE_FAILED", message } },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/watchlist?id=xxx — Update watchlist item ────────────────────

export async function PATCH(request: NextRequest) {
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

    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = updateWatchlistItemSchema.safeParse({ ...body, id });

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

    // Verify ownership
    const existing = await db.watchlist.findFirst({
      where: { id, user_id: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Watchlist item not found" } },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.target_buy_price !== undefined) {
      updateData.target_buy_price = validation.data.target_buy_price;
    }
    if (validation.data.notes !== undefined) {
      updateData.notes = validation.data.notes;
    }

    const updated = await db.watchlist.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        symbol: updated.symbol,
        target_buy_price: updated.target_buy_price
          ? Number(updated.target_buy_price)
          : null,
        notes: updated.notes,
        created_at: updated.created_at.toISOString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update watchlist item";
    return NextResponse.json(
      { error: { code: "UPDATE_FAILED", message } },
      { status: 500 }
    );
  }
}

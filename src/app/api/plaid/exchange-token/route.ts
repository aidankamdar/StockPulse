import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePlaidClient } from "@/lib/plaid/client";
import { requireDatabase } from "@/lib/prisma/client";
import { z } from "zod";

const exchangeTokenSchema = z.object({
  public_token: z.string().min(1, "public_token is required"),
});

export async function POST(request: NextRequest) {
  try {
    const plaid = requirePlaidClient();
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

    // Validate input
    const body = await request.json();
    const validation = exchangeTokenSchema.safeParse(body);

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

    // Exchange public token for permanent access token
    const response = await plaid.itemPublicTokenExchange({
      public_token: validation.data.public_token,
    });

    const { access_token, item_id } = response.data;

    // Store in User table (server-side only)
    await db.user.update({
      where: { id: user.id },
      data: {
        plaid_access_token: access_token,
        plaid_item_id: item_id,
        plaid_connected: true,
      },
    });

    return NextResponse.json({
      data: { success: true },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to exchange token";
    console.error("[plaid/exchange-token]", message);

    return NextResponse.json(
      { error: { code: "TOKEN_EXCHANGE_FAILED", message } },
      { status: 500 }
    );
  }
}

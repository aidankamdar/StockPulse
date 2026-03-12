import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePlaidClient } from "@/lib/plaid/client";
import { decryptToken } from "@/lib/plaid/encryption";
import { requireDatabase } from "@/lib/prisma/client";

export async function POST() {
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

    // Get current access token
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { plaid_access_token: true },
    });

    // Remove the Item from Plaid (revokes access)
    if (dbUser?.plaid_access_token) {
      try {
        const accessToken = decryptToken(dbUser.plaid_access_token);
        await plaid.itemRemove({
          access_token: accessToken,
        });
      } catch (err) {
        // Log but don't fail — we still want to clear local state
        console.warn("[plaid/disconnect] Failed to remove Plaid item:", err);
      }
    }

    // Clear Plaid fields from User table
    await db.user.update({
      where: { id: user.id },
      data: {
        plaid_access_token: null,
        plaid_item_id: null,
        plaid_connected: false,
      },
    });

    return NextResponse.json({
      data: { success: true, message: "Plaid account disconnected" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect";
    console.error("[plaid/disconnect]", message);

    return NextResponse.json(
      { error: { code: "DISCONNECT_FAILED", message } },
      { status: 500 }
    );
  }
}

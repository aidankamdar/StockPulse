import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePlaidClient } from "@/lib/plaid/client";
import { CountryCode, Products } from "plaid";

export async function POST() {
  try {
    const plaid = requirePlaidClient();

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

    const response = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "StockPulse",
      products: [Products.Investments],
      country_codes: [CountryCode.Us],
      language: "en",
    });

    return NextResponse.json({
      data: { link_token: response.data.link_token },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create link token";
    console.error("[plaid/link-token]", message);

    return NextResponse.json(
      { error: { code: "LINK_TOKEN_FAILED", message } },
      { status: 500 }
    );
  }
}

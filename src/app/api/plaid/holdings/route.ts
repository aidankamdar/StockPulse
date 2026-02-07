import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePlaidClient } from "@/lib/plaid/client";
import { requireDatabase } from "@/lib/prisma/client";

export async function GET() {
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

    // Get Plaid access token from User table
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { plaid_access_token: true, plaid_connected: true },
    });

    if (!dbUser?.plaid_access_token) {
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

    // Fetch holdings from Plaid
    const response = await plaid.investmentsHoldingsGet({
      access_token: dbUser.plaid_access_token,
    });

    const { accounts, holdings, securities } = response.data;

    // Build a security lookup map
    const securityMap = new Map(
      securities.map((s) => [s.security_id, s])
    );

    // Format holdings with resolved security info
    const formattedHoldings = holdings.map((h) => {
      const security = securityMap.get(h.security_id);
      return {
        account_id: h.account_id,
        security_id: h.security_id,
        symbol: security?.ticker_symbol ?? "UNKNOWN",
        name: security?.name ?? "Unknown Security",
        type: security?.type ?? "unknown",
        quantity: h.quantity,
        price: h.institution_price,
        price_as_of: h.institution_price_as_of,
        value: h.institution_value,
        cost_basis: h.cost_basis,
        sector: security?.sector ?? null,
        currency: h.iso_currency_code,
      };
    });

    const formattedAccounts = accounts.map((a) => ({
      account_id: a.account_id,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      balance_current: a.balances.current,
      balance_available: a.balances.available,
      currency: a.balances.iso_currency_code,
    }));

    return NextResponse.json({
      data: {
        accounts: formattedAccounts,
        holdings: formattedHoldings,
        total_holdings: formattedHoldings.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch holdings";
    console.error("[plaid/holdings]", message);

    return NextResponse.json(
      { error: { code: "HOLDINGS_FAILED", message } },
      { status: 500 }
    );
  }
}

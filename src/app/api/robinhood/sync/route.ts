import { NextResponse } from "next/server";

/**
 * Legacy Robinhood sync endpoint.
 * Redirects to the Plaid sync endpoint.
 * Kept for backward compatibility with existing frontend code.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: {
        code: "DEPRECATED",
        message:
          "Robinhood direct sync is no longer supported. Use Plaid integration via /api/plaid/sync instead.",
      },
    },
    { status: 410 }
  );
}

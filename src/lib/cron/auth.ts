import { NextRequest } from "next/server";

/**
 * Verify the CRON_SECRET header for cron job endpoints.
 * Returns true if valid, false if invalid.
 */
export function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[cron] CRON_SECRET not configured");
    return false;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

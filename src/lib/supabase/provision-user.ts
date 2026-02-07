import { isDatabaseConfigured, requireDatabase } from "@/lib/prisma/client";

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

/**
 * Ensures a User row exists in the Prisma database for the given Supabase Auth user.
 * Uses upsert so it's idempotent — safe to call on every request.
 *
 * This bridges the gap between Supabase Auth (which manages auth.users)
 * and our Prisma User table (which is referenced by Portfolio, Transaction, etc.).
 */
export async function provisionUser(supabaseUser: SupabaseUser): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const db = requireDatabase();

  await db.user.upsert({
    where: { id: supabaseUser.id },
    update: {
      email: supabaseUser.email ?? "",
      display_name:
        (supabaseUser.user_metadata?.display_name as string) ?? null,
    },
    create: {
      id: supabaseUser.id,
      email: supabaseUser.email ?? "",
      display_name:
        (supabaseUser.user_metadata?.display_name as string) ?? null,
    },
  });
}

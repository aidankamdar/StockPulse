import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(url && url !== "postgresql://placeholder");
}

const globalForPrisma = globalThis as unknown as {
  _prisma: PrismaClient | null | undefined;
};

/**
 * Lazily creates and caches the Prisma client.
 * Connection is deferred until the client is first requested via requireDatabase().
 */
function getOrCreatePrismaClient(): PrismaClient | null {
  if (globalForPrisma._prisma !== undefined) {
    return globalForPrisma._prisma;
  }

  if (!isDatabaseConfigured()) {
    globalForPrisma._prisma = null;
    return null;
  }

  try {
    const rawUrl = process.env.DATABASE_URL!;

    // Strip sslmode from the connection string so the pg-connection-string
    // parser doesn't override our SSL config. Supabase URLs include
    // ?sslmode=require, but the parser treats this as verify-full and
    // rejects Supabase's certificate chain as "self-signed". By removing
    // sslmode from the URL and setting ssl via Pool options, we keep SSL
    // active while accepting Supabase's certificates.
    const connectionString = rawUrl.replace(/[?&]sslmode=[^&]+/, "");

    const pool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });

    const adapter = new PrismaPg(pool);

    const client = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["query"] : [],
    });

    globalForPrisma._prisma = client;
    return client;
  } catch (error) {
    console.error("[prisma] Failed to create client:", error);
    globalForPrisma._prisma = null;
    return null;
  }
}

/**
 * Returns the Prisma client or throws if database is not configured.
 * Use in API routes and server functions to get a non-null client.
 */
export function requireDatabase(): PrismaClient {
  const client = getOrCreatePrismaClient();
  if (!client) {
    throw new Error("Database not configured. Set DATABASE_URL in environment variables.");
  }
  return client;
}

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
    const connectionString = process.env.DATABASE_URL!;
    const adapter = new PrismaPg({
      connectionString,
      // Supabase uses a certificate chain that Node.js strict TLS
      // validation treats as "self-signed". This tells pg to accept it.
      ssl: { rejectUnauthorized: false },
    });

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

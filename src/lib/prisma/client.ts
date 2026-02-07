import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(url && url !== "postgresql://placeholder");
}

function createPrismaClient(): PrismaClient | null {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | null | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Returns the Prisma client or throws if database is not configured.
 * Use in API routes to get a non-null client with a friendly error.
 */
export function requireDatabase(): PrismaClient {
  if (!prisma) {
    throw new Error("Database not configured. Set DATABASE_URL in .env.local");
  }
  return prisma;
}

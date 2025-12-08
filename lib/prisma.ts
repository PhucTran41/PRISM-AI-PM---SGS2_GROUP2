import { PrismaClient } from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
// Add dotenv if not already loaded globally (v7 encourages explicit env handling)
import "dotenv/config";

const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
  __pool?: Pool;
};

export const getPrismaClient = (): PrismaClient => {
  if (globalForPrisma.__prisma) {
    return globalForPrisma.__prisma;
  }

  // Create connection pool (unchanged, but ensure DATABASE_URL is loaded via dotenv)
  if (!globalForPrisma.__pool) {
    if (!process.env.NEON_URL) {
      throw new Error("DATABASE_URL is required");
    }
    globalForPrisma.__pool = new Pool({
      connectionString: process.env.NEON_URL,
    });
  }

  // Create adapter (v7 still uses this exact pattern)
  const adapter = new PrismaPg(globalForPrisma.__pool);

  // Create Prisma Client with adapter (v7 requires this; your log is fine)
  const prisma = new PrismaClient({
    adapter,
    log:
      process.env.NEXT_PUBLIC_PRODUCTION === "0"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  // v7/Next.js best practice: Assign to global only in dev to avoid hot-reload issues
  if (process.env.NEXT_PUBLIC_PRODUCTION !== "1") {
    globalForPrisma.__prisma = prisma;
  }

  return prisma;
};

// Export a default instance for convenience (unchanged)
export const prisma = getPrismaClient();

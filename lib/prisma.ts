import { PrismaClient } from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
  __pool?: Pool;
};

export const getPrismaClient = (): PrismaClient => {
  if (globalForPrisma.__prisma) {
    return globalForPrisma.__prisma;
  }

  // Create connection pool
  if (!globalForPrisma.__pool) {
    globalForPrisma.__pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  // Create adapter
  const adapter = new PrismaPg(globalForPrisma.__pool);

  // Create Prisma Client with adapter
  const prisma = new PrismaClient({
    adapter,
    log:
      process.env.NEXT_PUBLIC_PRODUCTION === "0"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  globalForPrisma.__prisma = prisma;

  return prisma;
};

// Export a default instance for convenience
export const prisma = getPrismaClient();

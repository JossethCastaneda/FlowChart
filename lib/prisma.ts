import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Prisma 7 "client" engine requires a driver adapter.
// We use @prisma/adapter-pg with node-postgres (pg) Pool.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn("[Prisma] DATABASE_URL not set — queries will fail");
    return new PrismaClient({ adapter: undefined as any });
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

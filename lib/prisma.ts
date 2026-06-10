import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Prisma 7 "client" engine requires a driver adapter.
// We use @prisma/adapter-pg with node-postgres (pg) Pool.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createMissingDatabaseClient(): PrismaClient {
  const message = "[Prisma] DATABASE_URL is required before executing database queries.";
  const throwingFunction = () => {
    throw new Error(message);
  };

  return new Proxy(
    {},
    {
      get() {
        return new Proxy(throwingFunction, {
          get() {
            return throwingFunction;
          },
          apply() {
            return throwingFunction();
          },
        });
      },
    }
  ) as PrismaClient;
}

function createPrismaClient(): PrismaClient {
  let connectionString = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL;

  if (!connectionString) {
    console.warn("[Prisma] DATABASE_URL not set - database queries will fail if executed");
    return createMissingDatabaseClient();
  }

  // Suppress the node-postgres warning about sslmode=require
  connectionString = connectionString.replace("sslmode=require", "sslmode=verify-full");

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false },
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

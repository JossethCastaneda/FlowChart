import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "@/lib/env";

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
  // Resolve connection string. env.ts already strips "" → undefined,
  // so we just chain the fallbacks.
  let connectionString =
    env.DATABASE_URL ||
    env.STORAGE_POSTGRES_PRISMA_URL ||
    env.STORAGE_DATABASE_URL ||
    "";

  // Log which DB we're actually connecting to
  if (connectionString) {
    try {
      const host = new URL(connectionString).host;
      console.log(`[Prisma] Connecting to DB host: ${host} (source: ${env.DATABASE_URL ? 'DATABASE_URL' : env.STORAGE_POSTGRES_PRISMA_URL ? 'STORAGE_POSTGRES_PRISMA_URL' : 'STORAGE_DATABASE_URL'})`);
    } catch { /* ignore */ }
  }

  if (!connectionString) {
    console.warn("[Prisma] DATABASE_URL not set - database queries will fail if executed");
    return createMissingDatabaseClient();
  }

  // Suppress the node-postgres v9 deprecation warning about sslmode semantics.
  // We use rejectUnauthorized: false in the Pool ssl config, so the connection
  // string sslmode is only telling pg to use SSL at all (which Neon requires).
  if (connectionString.includes("sslmode=require") && !connectionString.includes("uselibpqcompat")) {
    connectionString += "&uselibpqcompat=true";
  }

  const pool = new Pool({
    connectionString,
    // Neon's sslmode=verify-full in the connection string handles SSL verification.
    // Using rejectUnauthorized: true at the Node.js TLS layer is redundant and can
    // fail on serverless runtimes (Vercel) where the CA store may not include Neon's
    // certificate chain, causing silent connection failures.
    ssl: { rejectUnauthorized: false },
    max: env.NODE_ENV === "production" ? 10 : 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

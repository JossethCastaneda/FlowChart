// Prisma 7 configuration for Sodare + Neon PostgreSQL
// In Prisma 7, url/directUrl go HERE, not in schema.prisma
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Pooled connection (PgBouncer) — used by the app at runtime
    url: process.env["DATABASE_URL"]!,
    // Direct connection — used by Prisma CLI for migrations
    directUrl: process.env["DIRECT_URL"],
  },
} as any); // Type assertion needed: directUrl is valid but types lag behind

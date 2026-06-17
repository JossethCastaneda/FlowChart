import "dotenv/config";
import { defineConfig } from "prisma/config";

// The Neon integration in Vercel uses a custom "STORAGE" prefix,
// so variables are STORAGE_DATABASE_URL instead of DATABASE_URL.
// We fall back automatically so it works regardless of the prefix.
const databaseUrl =
  process.env["DATABASE_URL"] ||
  process.env["STORAGE_POSTGRES_PRISMA_URL"] ||
  process.env["STORAGE_DATABASE_URL"] ||
  process.env["POSTGRES_PRISMA_URL"] ||
  "";

const directUrlRaw =
  process.env["DIRECT_URL"] ||
  process.env["DATABASE_URL"] ||
  process.env["STORAGE_DATABASE_URL_UNPOOLED"] ||
  process.env["DATABASE_URL_UNPOOLED"] ||
  process.env["POSTGRES_URL_NON_POOLING"] ||
  databaseUrl;

let directUrl = directUrlRaw;
if (databaseUrl && directUrlRaw) {
  try {
    const dbHost = new URL(databaseUrl).host;
    const dirHost = new URL(directUrlRaw).host;
    if (dbHost !== dirHost) {
      console.warn(`[Prisma] Host mismatch! DATABASE_URL (${dbHost}) != DIRECT_URL (${dirHost}). Forcing directUrl to match DATABASE_URL.`);
      directUrl = databaseUrl;
    }
  } catch (e) {
    // Ignore parse errors
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
    // @ts-expect-error — directUrl is supported at runtime but Prisma 7 types lag behind
    directUrl: directUrl,
  },
});

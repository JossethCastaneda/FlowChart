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
    const dbHost = new URL(databaseUrl).host.replace("-pooler", "");
    const dirHost = new URL(directUrlRaw).host.replace("-pooler", "");
    if (dbHost !== dirHost) {
      console.warn("[Prisma] Database target mismatch detected; refusing the alternate direct target.");
      const url = new URL(databaseUrl);
      url.host = url.host.replace("-pooler", "");
      directUrl = url.toString();
    }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
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

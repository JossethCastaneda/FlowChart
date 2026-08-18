import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("LAB_DATABASE_URL_REQUIRED");
}

export default defineConfig({
  schema: "../../prisma/schema.prisma",
  migrations: {
    path: "./migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});

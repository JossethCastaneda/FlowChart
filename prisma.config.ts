// Prisma 7 configuration for Sodare
// npm install --save-dev prisma dotenv
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // For Neon: this uses the POOLED connection (PgBouncer) at runtime.
    // For migrations, run: DATABASE_URL=$DIRECT_URL npx prisma migrate dev
    // Or set DIRECT_URL in .env.local and use the migrate script in package.json.
    url: process.env["DATABASE_URL"],
  },
});

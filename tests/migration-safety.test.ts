import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const rootFile = (path: string) => readFileSync(path, "utf8");
const sha256 = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

describe("database migration safety", () => {
  it("keeps db-sync as a connection-free refusal command", () => {
    const source = rootFile("scripts/db-sync.mjs");
    const forbidden = [
      ["DROP", "TABLE"].join(" "),
      ["DELETE", "FROM"].join(" "),
      ["TRUN", "CATE"].join(""),
      ["accept", "data", "loss"].join("-"),
      ["prisma", "db", "push"].join(" "),
      "DATABASE_URL",
      "DIRECT_URL",
      "node:child_process",
      'from "pg"',
    ];

    for (const token of forbidden) {
      expect(source).not.toContain(token);
    }
    expect(source).toContain("REFUSED");
    expect(source).toContain("process.exit(1)");
  });

  it("does not couple build or release to schema mutation", () => {
    const pkg = JSON.parse(rootFile("package.json")) as {
      scripts: Record<string, string>;
    };

    for (const name of ["build", "release"]) {
      expect(pkg.scripts[name]).not.toContain("db:sync");
      expect(pkg.scripts[name]).not.toContain("db push");
      expect(pkg.scripts[name]).not.toContain("migrate deploy");
      expect(pkg.scripts[name]).toContain("&& next build");
    }
    expect(pkg.scripts["db:sync"]).toBe("node scripts/db-sync.mjs");
    expect(pkg.scripts["db:push"]).toBe("node scripts/db-sync.mjs");
    expect(pkg.scripts["db:migrate"]).toBe("node scripts/migrate-isolated.mjs dev");
  });

  it("requires a dedicated migration target without fallback", () => {
    const source = rootFile("scripts/migrate-isolated.mjs");
    expect(source).toContain("MIGRATION_TEST_DB_URL");
    expect(source).toContain("MIGRATION_TEST_BRANCH_REQUIRED");
    expect(source).toContain("MIGRATION_TEST_TARGET_MISMATCH");
    expect(source).not.toMatch(/migrationUrl\s*=\s*process\.env\.DATABASE_URL/);
    for (const alias of [
      "STORAGE_DATABASE_URL_UNPOOLED",
      "DATABASE_URL_UNPOOLED",
      "POSTGRES_URL_NON_POOLING",
      "POSTGRES_PRISMA_URL",
    ]) {
      expect(source).toContain(alias);
    }
  });

  it("rejects missing, protected, and pooled-alias targets without logging secrets", () => {
    const run = (env: Record<string, string | undefined>) => spawnSync(
      process.execPath,
      ["scripts/migrate-isolated.mjs", "check-target"],
      { encoding: "utf8", env: { ...process.env, ...env } },
    );
    const secret = "do-not-print-this-password";
    const base = `postgresql://user:${secret}@ep-production.us-east-2.aws.neon.tech/neondb`;

    const missing = run({ MIGRATION_TEST_DB_URL: "" });
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("MIGRATION_TEST_BRANCH_REQUIRED");

    const exact = run({ MIGRATION_TEST_DB_URL: base, DATABASE_URL: base });
    expect(exact.status).toBe(1);
    expect(exact.stderr).toContain("MIGRATION_TEST_TARGET_MISMATCH");
    expect(exact.stderr).not.toContain(secret);

    const pooled = run({
      MIGRATION_TEST_DB_URL: base,
      DATABASE_URL: `postgresql://user:${secret}@ep-production-pooler.us-east-2.aws.neon.tech/neondb`,
    });
    expect(pooled.status).toBe(1);
    expect(pooled.stderr).toContain("MIGRATION_TEST_TARGET_MISMATCH");
    expect(pooled.stderr).not.toContain(secret);

    const recoveryAlias = run({
      MIGRATION_TEST_DB_URL: base,
      DATABASE_URL: "postgresql://user:x@ep-other.us-east-2.aws.neon.tech/neondb",
      STORAGE_DATABASE_URL_UNPOOLED: base,
    });
    expect(recoveryAlias.status).toBe(1);
    expect(recoveryAlias.stderr).toContain("STORAGE_DATABASE_URL_UNPOOLED");
  });

  it("accepts a distinct synthetic clone in target-check mode", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/migrate-isolated.mjs", "check-target"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          MIGRATION_TEST_DB_URL: "postgresql://user:migration-secret@ep-dedicated-migration.us-east-2.aws.neon.tech/neondb",
          DATABASE_URL: "postgresql://user:prod-secret@ep-production.us-east-2.aws.neon.tech/neondb",
          DIRECT_URL: "postgresql://user:prod-secret@ep-production.us-east-2.aws.neon.tech/neondb",
        },
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("MIGRATION_TEST_TARGET_OK");
    expect(result.stdout).not.toContain("migration-secret");
  });

  it("keeps exactly one proven canonical baseline in the active chain", () => {
    const active = readdirSync("prisma/migrations", { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const name = "20260817000000_canonical_baseline";
    const path = `prisma/migrations/${name}/migration.sql`;

    expect(active).toEqual([name]);
    expect(sha256(path)).toBe(
      "6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e",
    );
    expect(rootFile("prisma/migrations/migration_lock.toml")).toContain(
      'provider = "postgresql"',
    );
  });

  it("keeps all legacy migrations byte-identical in the non-executable archive", () => {
    const expected = new Map([
      ["20260529201310_init", "5cc43bc581d59bd3f18c2c9bd3797697743708f508029f3a483b333e751be2e2"],
      ["20260529203800_add_workspace_owner_slug", "5fd1d25bd1ffa3a4d593243ca407f4c57d8deab5ac28f2e94d80dad4b790faec"],
      ["20260529204200_workspace_plan_and_roles", "008d1c77d3729dec7291cd6751f6f85b9f45928a47960d91a0f9636fca290c27"],
      ["20260608000000_add_workspace_settings", "e4859e3ecb0be9c03e76db875da2b4566de9f6f0bc8203617dbd6c1219d8d8bf"],
      ["20260608010000_add_task_request_fields", "447aa748d09a3e0b9264766e44a41aee1d1c4d0389f72190ff2b5fa2a7ebc64b"],
      ["20260812143323_finops_commercial_baseline", "3db7ccf16bf5e29f96149e7505ad40c8ed7ee11d64d9c9b2e4b9ba5873b5c3f6"],
    ]);

    for (const [name, hash] of expected) {
      expect(sha256(`docs/migrations/legacy/${name}/migration.sql`)).toBe(hash);
    }
    expect(rootFile("docs/migrations/legacy/README.md")).toContain(
      "FORENSE / NO EJECUTABLE",
    );
  });

  it("keeps the active baseline additive and independent of temporary proof SQL", () => {
    const sql = rootFile(
      "prisma/migrations/20260817000000_canonical_baseline/migration.sql",
    );
    const normalized = sql.toUpperCase();

    expect((sql.match(/^CREATE TABLE /gm) ?? []).length).toBe(116);
    expect((sql.match(/^CREATE (?:UNIQUE )?INDEX /gm) ?? []).length).toBe(240);
    expect((sql.match(/ ADD CONSTRAINT .* FOREIGN KEY /g) ?? []).length).toBe(126);
    expect(normalized).not.toMatch(/^DROP\s/gm);
    expect(normalized).not.toMatch(/^DELETE\s/gm);
    expect(normalized).not.toMatch(/^TRUNCATE\s/gm);

    for (const path of [
      "prisma.config.ts",
      "prisma/schema.prisma",
      "prisma/migrations/20260817000000_canonical_baseline/migration.sql",
    ]) {
      expect(rootFile(path)).not.toContain(".tmp/migration-baseline-lab");
    }
  });
});

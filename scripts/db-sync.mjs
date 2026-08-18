#!/usr/bin/env node

/**
 * Deliberately non-mutating tombstone for the former build-time schema sync.
 *
 * Schema changes must be represented by reviewed migration artifacts, proven
 * against a dedicated isolated database, and applied only behind a human
 * release gate. This command never resolves a database URL and never connects.
 */

console.error(
  [
    "[db-sync] REFUSED: implicit schema synchronization is disabled.",
    "Create a reviewed forward migration, validate it on MIGRATION_TEST_DB_URL,",
    "then use the human-gated production migration procedure.",
  ].join(" ")
);

process.exit(1);

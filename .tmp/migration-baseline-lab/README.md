# Canonical baseline laboratory

This directory is non-production evidence. The candidate baseline was generated
with Prisma 7.9.0 using:

```text
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
```

Candidate: `20260817000000_canonical_baseline`

- canonical schema SHA-256: `7ce322ff13aa0add0b780fb0e7783c1723dd0339c2310c0ec0389099e0f4f377`
- migration SQL SHA-256: `6e6d81662656a91704e977de1b541b37d56a0d6d8c09026cccdeaaa8bced7c6e`
- SQL contains 116 `CREATE TABLE`, 165 `CREATE INDEX`, 75
  `CREATE UNIQUE INDEX`, 126 foreign keys, and no `DROP`, `DELETE`, or
  `TRUNCATE` statements.

The SQL was not executed on the existing clone. Prisma adopted it metadata-only:
application schema mutations `0`, application data mutations `0`. The same SQL
replayed successfully on an empty disposable database, produced an empty schema
diff and supported a future migration canary. The disposable database was
removed. Production remained read-only and the candidate has not been promoted
into the active migration directory; human audit is still required.

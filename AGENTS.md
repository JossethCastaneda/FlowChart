<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Database topology — READ THIS before touching the DB

- **Production DB:** Neon project `sodare-prod` → host `ep-jolly-surf-…-pooler.c-8.us-east-1.aws.neon.tech`, database `neondb`. Vercel injects it as `DATABASE_URL` (and the Neon integration's `STORAGE_*` vars) at build & runtime. It is the **only** real database.
- **Your local `.env` is NOT production.** Point `DATABASE_URL` at a **Neon dev branch** of `sodare-prod` (Neon console → Branches → create from `production`). Never point it at production directly, and never at an orphan database from another account/integration.
- **Why this matters:** a wrong `DATABASE_URL` fails silently. `prisma db push` will happily report *"already in sync"* against the wrong database while production stays untouched — which looks like "the save is broken" in the app. The build now logs the target host (`[db-sync] target database host: …`); if it isn't the `c-8`/`ep-jolly-surf` host, the env is wrong.
- `prisma.config.ts` resolves the URL with `STORAGE_*` fallbacks; `lib/prisma.ts` (runtime) reads `DATABASE_URL` only. Keep both pointing at the same DB.

## Schema workflow: `prisma db push`, not migrations

- The build runs `scripts/db-sync.mjs` → `prisma db push` (additive, **non-fatal**). New tables/columns apply automatically on deploy; a destructive diff is surfaced, never auto-applied (no `--accept-data-loss`).
- `prisma/migrations/` is a **legacy baseline**: only the three initial May-2026 migrations are recorded in `_prisma_migrations`. Everything since (WorkspaceSettings, Task request/closedAt fields, member activity status, …) was applied via `db push`. **Do not** add `prisma migrate deploy` to the pipeline without baselining first, or it will conflict with the pushed schema.
- `db-sync.mjs` drops Neon's `playing_with_neon` sample table before pushing; otherwise Prisma blocks the whole sync as "data loss".

## Type-safety debt (intentional, temporary)

- `tsconfig.json` has `strict: true` **and `noImplicitAny: true`** — the type-safety gate is honest again (`npx tsc --noEmit` is clean). **CI enforces it**: `.github/workflows/ci.yml` runs `npx tsc --noEmit` (and `npm run typecheck` exists for local use). Keep it green — fix types, don't loosen the flag.
- `next.config.ts` still sets `typescript.ignoreBuildErrors: true`. This only affects `next build` (Vercel), which applies stricter Next 16 route-type checks than plain `tsc`. It's the last remaining shortcut: before removing it, run a full `next build` locally and confirm there are no route-type errors, otherwise Vercel deploys can break.

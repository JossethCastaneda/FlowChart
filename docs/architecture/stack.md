---
tags: [arquitectura, stack, tecnología]
---

# Stack Tecnológico

> Versiones ancladas a agosto 2026. Verificar `package.json` para la fuente de verdad.

## Capas

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.11 |
| UI | React | 19.2.4 |
| Tipado | TypeScript | ^5 |
| Estilos | Tailwind CSS | v4 |
| ORM | Prisma | 7.9.0 |
| Base de datos | PostgreSQL (Neon, pooled + direct URL) | — |
| Auth | NextAuth | v4 (JWT · Facebook OAuth · Google · email+bcrypt) |
| IA | Google Gemini (`@google/genai`) | — |
| Estado | Zustand | ^5 |
| Gráficas | Recharts | ^3 |
| Animaciones | Framer Motion | ^12 |
| Email | Resend | ^6 |
| Infra Vercel | Cron · Blob · Speed Insights · Workflow | — |
| Monitoring | Sentry | ^10 |
| Testing | Vitest | ^3 |
| E2E | Playwright | ^1.62 |
| Linting | ESLint (eslint-config-next) | ^9 |

## Convenciones clave

- **Path alias:** `@/*` → raíz del proyecto (`tsconfig.json`).
- **Gestor de paquetes:** npm · lockfile autoritativo: `package-lock.json`.
- **Compilación:** `strict: true` + `noImplicitAny: true` · `tsc --noEmit` como gate.
- **Deploy:** Vercel conectado a rama `main` del repo GitHub. Push → deploy automático.
- **CI/CD:** `.github/workflows/` — gates: lint · typecheck · test · build.

## Relacionado

- [[../decisions/ADR-001-oauth-config-ids|ADR-001: Multi config_id de Meta OAuth]]
- [[../generated/modules-index|Módulos (generado)]]
- [[README|← Arquitectura]]

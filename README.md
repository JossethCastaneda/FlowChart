# FlowChart

Plataforma SaaS multi-tenant para gestión de marketing en **Meta** (Facebook + Instagram):
Ads Manager, Analytics, Publisher, Inbox unificado, Social Listening, Streams y operaciones
de agencia (proyectos, tareas, briefs). Orientada a agencias que gestionan varias cuentas.

**Producción:** [flowchart.lat](https://flowchart.lat) · **Hosting:** Vercel · **DB:** PostgreSQL (Neon)

---

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| Estilos | Tailwind CSS v4 |
| ORM / DB | Prisma 7 + PostgreSQL (Neon, pooled + direct URL) |
| Auth | NextAuth 4 (JWT) — Facebook OAuth, Google, email/password (bcrypt) |
| IA | Google Gemini (`@google/genai`) |
| Infra Vercel | Cron jobs, Blob storage, Speed Insights, durable `workflow` |
| Email | Resend |
| Estado / charts | Zustand · Recharts · Framer Motion |

## Módulos

| Ruta | Módulo | Función |
|------|--------|---------|
| `/dashboard/resumen` | Resumen | KPIs generales del workspace |
| `/dashboard/ads-manager` | Ads Manager | Campañas/adsets/ads, ROAS/CPM/CPC, reglas, fatiga creativa, dayparting |
| `/dashboard/analytics` | Analytics | Insights orgánicos, posts, reels, stories, audiencia, mejor hora |
| `/dashboard/publisher` | Publisher | Programación a FB+IG, primer comentario, calendario, boost |
| `/dashboard/inbox` | Inbox 2.0 | Messenger + IG DM unificados, respuestas guardadas, automatización |
| `/dashboard/listening` | Listening | Monitoreo de keywords / hashtags / menciones |
| `/dashboard/streams` | Streams | Columnas en tiempo real estilo TweetDeck |
| `/dashboard/ops` | Ops | Tareas (Kanban con SLA), comentarios, actividad |
| `/dashboard/proyectos` | Proyectos | Proyectos por cliente, canales, alertas |
| `/dashboard/briefing` | Briefing | Generación de briefs con IA (Gemini) |
| `/dashboard/integrations` | Integraciones | Conexión OAuth por módulo con Meta |

## Arquitectura Meta

Cada módulo usa su propio **`config_id` de Facebook** con scopes mínimos (minimización de permisos)
en lugar de un único mega-token. El flujo:

```
/api/connect/[module]  → OAuth con config_id específico (state firmado con HMAC + nonce)
/api/connect/callback  → code → token corto → token largo (~60d) → guarda en Integration (cifrado)
getMetaAccessToken()   → resuelve token: meta_<module> → meta (genérico) → JWT fallback
```

- Tokens **cifrados en reposo** con AES-256-GCM (`lib/encryption.ts`).
- Llamadas a Graph API con **Bearer header**, nunca `access_token` en la URL (`lib/server-auth.ts`).
- Versión de la API centralizada en `META_API_VERSION` (`lib/server-auth.ts`).
- Errores de Meta mapeados a acciones de sistema en `lib/meta-errors.ts`.

## Multi-tenant

`Workspace` → `Project` → `Channel`, con roles **OWNER / ADMIN / MEMBER** (`WorkspaceMember`)
e invitaciones por token. Todo el dato de negocio está aislado por `workspaceId`.

---

## Getting Started

Requisitos: Node 20+, una base PostgreSQL (Neon) y una app de Facebook configurada.

```bash
# 1. Instalar dependencias (corre prisma generate vía postinstall)
npm install

# 2. Configurar entorno
cp .env.example .env.local   # rellena los valores (ver tabla abajo)

# 3. Crear el esquema en la DB
npm run db:push              # o db:migrate para migraciones versionadas

# 4. Desarrollo
npm run dev                  # http://localhost:3000
```

### Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | ✅ | Conexión Neon **pooled** |
| `DIRECT_URL` | ✅ | Conexión Neon **directa** (migraciones) |
| `NEXTAUTH_URL` | ✅ | URL base de la app |
| `NEXTAUTH_SECRET` | ✅ | Secreto JWT de NextAuth |
| `ENCRYPTION_KEY` | ✅ (prod) | 64 hex chars (`openssl rand -hex 32`). Cifra credenciales en reposo |
| `FACEBOOK_CLIENT_ID` / `_SECRET` | ✅ | App de Facebook |
| `FACEBOOK_LOGIN_CONFIG_ID` | – | config_id de login básico |
| `META_API_VERSION` | – | Versión de Graph API (default `v25.0`) |
| `META_WEBHOOK_VERIFY_TOKEN` | – | Verificación de webhooks de Meta |
| `GOOGLE_APIKEY_CONNECT` / `_SECRET` | – | Login con Google |
| `RESEND_API_KEY` | – | Envío de emails |
| `NEXT_PUBLIC_APP_URL` | – | URL pública usada en varios lugares |

## Scripts npm

| Comando | Acción |
|---------|--------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | `prisma generate` + build de producción |
| `npm run lint` | ESLint |
| `npm test` | Tests unitarios (Vitest) |
| `npm run db:push` | Sincroniza el esquema con la DB (sin migración) |
| `npm run db:migrate` | Crea/aplica migraciones |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reencrypt` | Re-cifra tokens guardados en texto plano (ver abajo) |

### Re-cifrado de tokens

Si en algún momento se guardaron tokens sin `ENCRYPTION_KEY`, quedaron en texto plano en la
tabla `Integration`. Para cifrarlos retroactivamente:

```bash
npm run db:reencrypt           # dry-run: muestra qué cifraría
npm run db:reencrypt -- --apply  # aplica los cambios
```

## Cron jobs (`vercel.json`)

| Path | Horario | Función |
|------|---------|---------|
| `/api/notifications/check-sla` | `0 8 * * *` | SLA de tareas |
| `/api/alerts/check` | `0 15 * * *` | Alertas de proyecto |
| `/api/cron/publish-scheduled` | `0 0 * * *` | Publicación programada |
| `/api/meta/refresh-token` | `0 3 * * *` | Refresco de tokens (~60d) |

## Estructura

```
app/
  api/               78 route handlers (meta, publisher, analytics, inbox, ...)
  dashboard/         páginas de cada módulo
  workflows/         durable workflows (publicación programada)
components/           60 componentes (ads-manager, publisher, analytics, ...)
lib/                 server-auth, encryption, meta-errors, ads-metrics, prisma, ...
prisma/              schema + migraciones
scripts/             utilidades de mantenimiento (no entran al build)
tests/               tests unitarios (Vitest)
```

## Deploy

Desplegado en Vercel con la integración de Neon. El build corre `prisma generate && next build`.
Configura todas las variables de entorno requeridas en el dashboard de Vercel antes del deploy.

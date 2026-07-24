# Auditoría de repositorio — Zefirus (2026-07-24)

> Auditoría del estado del repo en `main` (`59cecec`), contrastada contra documentación oficial
> (Next.js 16 en `node_modules/next/dist/docs/`, GitHub Advisory Database vía `npm audit`,
> docs de Neon y Meta Graph API).
>
> Todos los gates se ejecutaron localmente. Los hallazgos incluyen la evidencia que los sustenta.

---

## 0. Resumen ejecutivo

**El repositorio está, en general, bien implementado.** La arquitectura multi-tenant, el manejo de
credenciales y la verificación de webhooks están por encima del promedio para un SaaS de este tamaño.
Los problemas encontrados son concretos y acotados, no estructurales.

| Gate | Resultado local | Resultado en CI (`main`) |
|---|---|---|
| `npx tsc --noEmit` | ✅ limpio | ✅ success |
| `npm test` | ✅ 202/202 (24 archivos) | ✅ success |
| `npx next build` | ✅ success | ✅ success |
| `npm run lint` | ❌ **exit 1 — 182 errores** | ❌ **failure** |

**CI lleva 30 de 30 runs consecutivos en rojo** en `main`. El único paso que falla es `Lint`.

### Hallazgos por severidad

| # | Severidad | Hallazgo | Estado |
|---|---|---|---|
| 1 | 🔴 Crítico | `api/debug/instagram-webhook`: fuga cross-tenant + exposición de secreto | **Corregido en este PR** |
| 2 | 🟠 Alto | Next.js 16.2.6 con 9 advisories sin parchear | **Corregido en este PR** |
| 3 | 🟠 Alto | CI en rojo permanente (lint, 182 errores) | Documentado — requiere decisión |
| 4 | 🟡 Medio | TLS de la DB sin verificar (`rejectUnauthorized: false`) | Documentado |
| 5 | 🟡 Medio | `access_token` en query string en 6 llamadas | Documentado |
| 6 | 🟡 Medio | Rate limiter falla en modo *fail-open* | Documentado |
| 7 | 🔵 Bajo | `middleware.ts` deprecado en Next 16 (→ `proxy.ts`) | Documentado |
| 8 | 🔵 Bajo | `setInterval` a nivel de módulo viola la regla "Zero Local State" | Documentado |
| 9 | 🔵 Bajo | Auto-vinculación de cuenta sin password vía Facebook | Documentado |
| 10 | 🔵 Bajo | Deriva entre `CLAUDE.md` y el código real | Documentado |

---

## 1. 🔴 Crítico — `api/debug/instagram-webhook` filtraba datos de todos los workspaces

**Archivo:** `app/api/debug/instagram-webhook/route.ts` (eliminado en este PR)

El endpoint sólo exigía *una sesión válida cualquiera* (`getToken` → `jwt.sub`). No verificaba
membresía de workspace ni rol. A partir de ahí, tres problemas encadenados:

**a) Fuga cross-tenant.** Las consultas no filtraban por `workspaceId`:

```ts
const igIntegrations = await prisma.integration.findMany({
  where: { provider: "instagram" },      // ← sin workspaceId
  select: { id, workspaceId, connected, connectedAt, credentials },
});
```

Cualquier usuario autenticado de *cualquier* workspace obtenía el listado de integraciones de
Instagram de **todos** los tenants: `workspaceId`, `instagramUserId`, `username`, estado de conexión
y expiración. Lo mismo con `integrationAssetCache` (`assetType: "ig_account"`, sin scope, `take: 20`).

**b) Exposición de secreto.** El valor de `META_WEBHOOK_VERIFY_TOKEN` se devolvía en claro, dos veces:

```ts
META_WEBHOOK_VERIFY_TOKEN: ` configurado ("${env.META_WEBHOOK_VERIFY_TOKEN}")`
// y
verifyToken: verifyToken ?? "UNDEFINED",
```

Ese token es el secreto compartido que valida el handshake de suscripción de webhooks de Meta.

**c) Uso del token de otro tenant.** Las líneas 105-135 tomaban `findFirst({ provider: "instagram",
connected: true })` — la integración de un workspace **arbitrario** —, descifraban su access token y
llamaban a la Graph API con él, devolviendo al solicitante el perfil de Instagram de ese otro tenant.
Además pasaban el token en la query string.

**Por qué se eliminó en lugar de arreglarse:** el endpoint estaba huérfano (`grep` no encuentra ni una
referencia en todo el repo), su propio docstring lo declara *"Diagnóstico temporal"*, y `CLAUDE.md`
ya registra que `api/debug-fb` y `api/debug-google` fueron eliminados por esta misma clase de fuga,
con la instrucción explícita de **no recrearlos**. La regla de flujo de trabajo del propio proyecto
("si un código está huérfano o muerto, elimínalo") aplica directamente.

> **Nota:** `app/api/debug/webhook-status/route.ts` también está huérfano, pero **sí** está
> correctamente aislado (`withWorkspace` + filtro por `ctx.workspaceId`). Se dejó intacto; conviene
> decidir si se conserva como herramienta de diagnóstico o se elimina por higiene.

---

## 2. 🟠 Alto — Next.js 16.2.6 tenía 9 advisories sin parchear

`package.json` fijaba `next: 16.2.6`. Ese release corresponde al parche de **mayo 2026**; el de
**julio 2026** exige `16.2.11` (Active LTS). Los 9 advisories, confirmados vía `npm audit` contra la
GitHub Advisory Database (rango afectado `>=16.0.0 <16.2.11`):

| GHSA | Severidad | Descripción |
|---|---|---|
| [GHSA-6gpp-xcg3-4w24](https://github.com/advisories/GHSA-6gpp-xcg3-4w24) | High | Middleware / Proxy bypass en App Router |
| [GHSA-m99w-x7hq-7vfj](https://github.com/advisories/GHSA-m99w-x7hq-7vfj) | High | DoS en App Router con Server Actions |
| [GHSA-89xv-2m56-2m9x](https://github.com/advisories/GHSA-89xv-2m56-2m9x) | High | SSRF en Server Actions sobre servidores custom |
| [GHSA-p9j2-gv94-2wf4](https://github.com/advisories/GHSA-p9j2-gv94-2wf4) | High | SSRF en `rewrites` vía hostname de destino controlable |
| [GHSA-955p-x3mx-jcvp](https://github.com/advisories/GHSA-955p-x3mx-jcvp) | Moderate | Exposición no autenticada de endpoints de Server Functions |
| [GHSA-68g3-v927-f742](https://github.com/advisories/GHSA-68g3-v927-f742) | Moderate | Cache confusion en respuestas a requests con body |
| [GHSA-4633-3j49-mh5q](https://github.com/advisories/GHSA-4633-3j49-mh5q) | Moderate | Cache confusion con UTF-8 inválido |
| [GHSA-4c39-4ccg-62r3](https://github.com/advisories/GHSA-4c39-4ccg-62r3) | Moderate | Payload sin límite en Server Actions (Edge) |
| [GHSA-q8wf-6r8g-63ch](https://github.com/advisories/GHSA-q8wf-6r8g-63ch) | Moderate | DoS en Image Optimization API vía SVG |

**Dos son especialmente relevantes para este repo:**

- **GHSA-6gpp-xcg3-4w24 (Middleware/Proxy bypass).** `middleware.ts` es la única barrera que protege
  `/dashboard/*`, `/onboarding/*` y `/connect/*`. Un bypass ahí es un salto de autenticación.
- **GHSA-p9j2-gv94-2wf4 (SSRF en `rewrites`).** `next.config.ts` define un `rewrites()` cuyo destino
  sale de `process.env.NEXT_PUBLIC_API_URL`, exactamente el patrón que describe el advisory.

**Corregido:** bump a `next@16.2.11` (semver-minor, sin breaking changes). Verificado post-bump: los
9 advisories salen de `npm audit`, y typecheck + tests + build siguen en verde.

Quedan vulnerabilidades transitivas en `postcss` y `sharp`, que Next arrastra como dependencias
propias y no se resuelven sin un release upstream. No son accionables desde este repo.

> **Pendiente menor:** `eslint-config-next` sigue en `16.2.6`. Se dejó sin tocar a propósito para no
> mezclar un cambio de configuración de lint con un PR que no arregla el lint. Conviene sincronizarlo.

---

## 3. 🟠 Alto — CI lleva 30 runs consecutivos en rojo

`.github/workflows/ci.yml` corre `npm run lint` como paso final y **hard gate**. Ese paso falla:

```
✖ 1484 problems (182 errors, 1302 warnings)   →  exit 1
```

Los 30 runs disponibles en el historial de `ci.yml` terminaron en `failure`; el desglose por pasos del
run más reciente (`30121683055`, commit `59cecec`) confirma que **el único paso rojo es `Lint`**:
Typecheck ✅ · Test ✅ · Build (Next.js) ✅ · Lint ❌.

Los 182 errores son casi todos del **React Compiler** (`eslint-config-next` 16 lo activa por defecto):

| Regla | Nº | Qué significa |
|---|---:|---|
| `Calling setState synchronously within an effect` | 76 | Renders en cascada |
| `Cannot create components during render` | 63 | Componentes definidos dentro del render → se remontan y **pierden estado** en cada render |
| `prefer-const` | ~20 | Trivial, auto-fixable |
| `Cannot call impure function during render` | 3 | |
| `@next/next/no-assign-module-variable` | 2 | |
| `no-html-link-for-pages` | 2 | |

Están muy concentrados: **`components/ads-manager/AdsManagerTable.tsx` acumula 48** (37 en la línea
504, 7 en la 426, 4 en la 419). `ScheduledCalendar.tsx` y `MyTasksView.tsx` suman 8 más.

`Cannot create components during render` no es cosmético: un componente creado dentro del render tiene
identidad nueva en cada ciclo, así que React lo desmonta y remonta — se pierde el estado local y el
foco del input. Es un bug de UX real, no sólo deuda de lint.

**Recomendación:** arreglar `AdsManagerTable.tsx` primero (recupera ~26% de los errores en un archivo),
correr `npx eslint --fix` para los `prefer-const`, y atacar los `setState`-en-effect por lotes. No se
tocó aquí porque son ~48 componentes y el alcance excede una auditoría.

---

## 4. 🟡 Medio — El TLS hacia la base de datos no se verifica

`lib/prisma.ts`:

```ts
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },   // ← desactiva la validación del certificado
  ...
});
```

El comentario justifica la decisión diciendo que `sslmode=verify-full` en la cadena de conexión ya
cubre la verificación. **No es así:** cuando se pasa un objeto `ssl` explícito a `pg.Pool`, ese objeto
gana sobre el `sslmode` de la connection string. Con `rejectUnauthorized: false` la conexión se cifra
pero no se valida contra quién — que es precisamente lo que previene un MITM.

La documentación de Neon recomienda `verify-full` explícitamente, y node-postgres trae verificación
segura por defecto (`sslrootcert=system`) salvo que se desactive a mano.

**Sugerencia:** quitar el override y dejar que `sslmode=verify-full` en la URL haga su trabajo, o bien
pasar `ssl: { rejectUnauthorized: true }` con el CA del sistema. Conviene validarlo en Preview antes
de Producción, ya que el comentario sugiere que hubo fallos de conexión que motivaron el workaround.

---

## 5. 🟡 Medio — `access_token` viaja en la query string

`lib/server-auth.ts` establece la convención correcta y la documenta:

```ts
/** IMPORTANT: Use this instead of putting access_token in the URL query string. */
export async function metaFetch(...)
```

Pero 6 llamadas la saltan y ponen el token en la URL:

| Archivo | Línea |
|---|---|
| `app/api/integrations/instagram/callback/route.ts` | 129 |
| `app/api/integrations/instagram/status/route.ts` | 39 |
| `app/api/webhooks/meta/route.ts` | 95, 119 |
| `app/api/inbox/post/route.ts` | 70 |

(Las 2 de `debug/instagram-webhook` desaparecen con el borrado del punto 1.)

Las query strings acaban en logs de acceso, cabeceras `Referer` y trazas de proxy. Migrarlas a
`metaFetch` unifica además el manejo de reintentos y rate limiting que ya existe.

---

## 6. 🟡 Medio — El rate limiter falla en modo *fail-open*

`lib/ratelimit.ts`:

```ts
} catch (err) {
  logger.error("[RATE LIMIT] Database rate limit error, falling back to fail-open", ...);
  return { ok: true, remaining: 1 };
}
```

Si Neon está lento o rechaza conexiones, **todos** los límites se desactivan a la vez: login
(`auth.config.ts`), registro, forgot-password y reset-password. Es justo el momento en que un ataque
de fuerza bruta tiene más probabilidad de pasar desapercibido.

El diseño es defendible (no tumbar el login por un fallo de DB), pero conviene al menos degradar a un
contador en memoria por instancia en vez de abrir del todo, y alertar en Sentry cuando ocurra.

---

## 7. 🔵 Bajo — `middleware.ts` está deprecado en Next 16

Según `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`:

> `The middleware filename is deprecated, and has been renamed to proxy to clarify network boundary
> and routing focus.` — el export nombrado `middleware` también se deprecó a favor de `proxy`.

El repo sigue usando `middleware.ts`. Funciona (el build lo reporta como `ƒ Proxy (Middleware)`), pero
es una deprecación activa. La migración es mecánica:

```bash
mv middleware.ts proxy.ts   # y renombrar la función export a `proxy`
```

**Advertencia relevante:** el runtime de `proxy` es `nodejs` y no es configurable — el runtime `edge`
no está soportado. Hay que verificar que `getToken` de next-auth siga funcionando bajo Node.

Relacionado: el proyecto usa **next-auth v4** (`getServerSession`, `authOptions`). La línea sucesora
es **Auth.js v5**, que unifica todo en `auth()`. No es urgente — v4 funciona con Next 16 — pero es
deuda de plataforma a planificar.

---

## 8. 🔵 Bajo — `setInterval` a nivel de módulo contradice "Zero Local State"

`lib/ratelimit.ts:13` crea un `setInterval` al importar el módulo, incondicionalmente:

```ts
setInterval(() => { /* limpia memoryStore */ }, 60_000).unref?.();
```

`memoryStore` sólo se usa bajo Vitest, pero el intervalo se arma **también en producción**, donde no
limpia nada y contradice la regla nº 2 de `CLAUDE.md` ("No uses `setInterval` … ni colas en memoria").
El `.unref?.()` evita que bloquee el proceso, así que el impacto real es nulo — pero basta con moverlo
dentro del guard `if (process.env.NODE_ENV === "test" || process.env.VITEST)`.

Los demás `setInterval` del repo están en componentes de cliente dentro de `useEffect`, lo cual es
correcto y no aplica a la regla.

---

## 9. 🔵 Bajo — Auto-vinculación por email en el provider `facebook-sdk`

`lib/auth.config.ts` bloquea correctamente el account takeover cuando la cuenta destino tiene password:

```ts
if (candidate?.password) {
  console.warn("[AUTH facebook-sdk] Email coincide con cuenta password — se rechaza auto-link");
  return null;
}
dbUser = candidate ?? null;   // ← pero sí vincula si NO tiene password
```

Una cuenta creada vía Google OAuth no tiene password, así que un login de Facebook con el mismo email
se vincula automáticamente a ella. El riesgo es bajo (Facebook verifica emails y el token se valida
contra `debug_token` + `appsecret_proof`), pero el patrón robusto es exigir que el email venga
verificado o requerir sesión activa para vincular, como ya se hace en el callback OAuth genérico.

---

## 10. 🔵 Bajo — Deriva entre `CLAUDE.md` y el código

| `CLAUDE.md` afirma | Realidad |
|---|---|
| "`next.config.ts` still sets `typescript.ignoreBuildErrors: true`… es el último atajo pendiente" | Ya **no** existe; el archivo dice `// strict type checking is now enforced on build` |
| "Endpoints eliminados por inseguros… No recrearlos" | Existían 2 endpoints bajo `app/api/debug/`, uno de ellos con la misma clase de fuga |
| Tareas en segundo plano vía **Upstash QStash** (`lib/qstash.ts`) | QStash fue eliminado; ahora se usa Vercel Cron (`vercel.json`) + Workflow DevKit |

Vale la pena actualizar `CLAUDE.md`: es el contrato que siguen los agentes, y cuando miente induce
exactamente los errores que pretende evitar.

---

## 11. Lo que está bien hecho

Conviene dejarlo explícito, porque es la mayor parte del repo:

- **Aislamiento multi-tenant sólido.** Se revisaron las 149 rutas de API: fuera del endpoint del punto
  1, no se encontró ninguna consulta sin scope de workspace. El patrón `withAuth` / `withWorkspace` /
  `withWorkspaceRole` + `verifyWorkspaceAccess` se aplica de forma consistente, incluso en la caché de
  Meta Ads (`metaAdsCache` lleva `workspaceId` en su clave compuesta).
- **Verificación de webhooks correcta y fail-closed.** Meta, WhatsApp y TikTok validan HMAC
  `x-hub-signature-256` con `timingSafeEqual`, y rechazan cuando falta el secreto. TikTok tiene un
  comentario que documenta que antes devolvía `true` sin secreto — se corrigió bien.
- **Manejo de credenciales.** AES-256-GCM, `encryptToken` con fail-fast en producción, `decryptToken`
  que ya **rechaza** texto plano (el fallback que `CLAUDE.md` marcaba como pendiente fue eliminado).
- **OAuth con state firmado.** HMAC + `timingSafeEqual` en los 4 flujos (`connect`, `oauth/[provider]`,
  `oauth/google`, `integrations/instagram`).
- **Rate limiting atómico.** El `upsert` con `increment` compila a `INSERT … ON CONFLICT DO UPDATE`,
  que cierra la condición de carrera del patrón read-then-write anterior.
- **Invalidación de sesión** tras cambio de password vía `passwordChangedAt` vs `token.loginAt`.
- **Cabeceras de seguridad** completas y CSP con allowlist por origen; CORS con origen explícito.
- **Type-safety honesta.** `strict: true` + `noImplicitAny: true`, `tsc --noEmit` limpio, y ya sin
  `ignoreBuildErrors` — el build de Vercel type-chequea de verdad.
- **202 tests en verde**, incluido un escáner anti-secretos (`tests/no-secrets.test.ts`) que falla el
  build si reaparecen credenciales embebidas.

---

## 12. Orden sugerido de trabajo

1. **Desbloquear CI** — es el hallazgo con más impacto operativo. Sin CI verde se pierde la red de
   seguridad de todos los demás gates. Empezar por `AdsManagerTable.tsx` (48 de 182 errores).
2. **Verificar el TLS de la DB** (punto 4) en Preview y quitar el `rejectUnauthorized: false`.
3. **Migrar las 6 llamadas con token en query string** a `metaFetch` (punto 5).
4. **Actualizar `CLAUDE.md`** (punto 10) para que deje de contradecir al código.
5. **Planificar** `middleware.ts` → `proxy.ts` y la evaluación de Auth.js v5 (punto 7).

---

## Anexo — Comandos de verificación

```bash
npx tsc --noEmit          # ✅ limpio
npm test                  # ✅ 202/202
npx next build            # ✅ success
npm run lint              # ❌ exit 1 — 182 errores
npm audit                 # 9 advisories de Next resueltos con 16.2.11
```

## Fuentes

- Next.js 16 upgrade guide y `proxy.md` — `node_modules/next/dist/docs/` (docs incluidas en el repo)
- [Next.js July 2026 Security Release](https://nextjs.org/blog/july-2026-security-release)
- [GitHub Advisory Database](https://github.com/advisories) — vía `npm audit`
- [Connect to Neon securely](https://neon.com/docs/connect/connect-securely)
- [Migrating to Auth.js v5](https://authjs.dev/getting-started/migrating-to-v5)
- [Graph API v25.0 changelog](https://developers.facebook.com/docs/graph-api/changelog/version25.0/)

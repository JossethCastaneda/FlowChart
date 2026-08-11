# Variables de entorno de FlowChart (Vercel)

> Plantilla copy-paste: **`docs/vercel-env.example`**. Este documento explica cada
> grupo, el mapeo de nombres y de dónde sale cada valor.

## Convención de nombres (AGENTS.md)

`PLATAFORMA_FUNCION_MODULO` — p. ej. `META_CONFIG_ADS`, `FACEBOOK_CONFIG_AUTH`,
`NEXT_PUBLIC_META_CONFIG_WHATSAPP`.

Se aplica a las variables **propias de la app** (config IDs y conexiones). Las de
**infra** (`DATABASE_URL`, `NEXTAUTH_*`, `STORAGE_*`, `BLOB_READ_WRITE_TOKEN`, …)
conservan su nombre porque lo impone un servicio externo (Vercel/Neon/NextAuth) y
renombrarlas rompería el contrato.

## Lo único que necesitas "conectar": los config IDs de Meta

Cada sección se conecta con su propio `config_id` de *Facebook Login for Business*.
El código los resuelve en `lib/meta-config.ts` leyendo el **nombre nuevo** y, si no
está, el **nombre legacy** — basta configurar UNO de los dos.

| Módulo (botón "Conectar") | Nombre NUEVO (convención) | Nombre LEGACY (fallback) | App de Meta |
|---|---|---|---|
| Login (identidad) | `FACEBOOK_CONFIG_AUTH` | `FACEBOOK_LOGIN_CONFIG_ID` | Facebook (login) |
| Publisher Facebook | `META_CONFIG_PUBLISHERFB` | `FACEBOOK_PUBLISHER_FB_CONFIG_ID` | Meta (integraciones) |
| Publisher Instagram | `META_CONFIG_PUBLISHERIG` | `FACEBOOK_PUBLISHER_IG_CONFIG_ID` | Meta |
| Social | `META_CONFIG_SOCIAL` | `FACEBOOK_SOCIAL_CONFIG_ID` | Meta |
| Meta Ads | `META_CONFIG_ADS` | `FACEBOOK_ADS_CONFIG_ID` | Meta |
| Analytics | `META_CONFIG_ANALYTICS` | `FACEBOOK_ANALYTICS_CONFIG_ID` | Meta |
| Inbox / Community | `META_CONFIG_INBOX` | `MESSENGER_CONFIG_ID` | Meta |
| WhatsApp (Embedded Signup) | `NEXT_PUBLIC_META_CONFIG_WHATSAPP` | `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID` | Meta (WABA) |

**Dónde sacarlos:** Meta for Developers → tu App → *Facebook Login for Business* →
*Configurations*. Cada config define los permisos (scopes) que pedirá ese módulo; el
código NO puede añadir scopes que el config no autorice (AGENTS.md §Meta Developers).

> ⚠️ **Dos apps distintas** (AGENTS.md §Separación de Apps de Meta): el config de
> **Login** vive en la app de Facebook (`FACEBOOK_CLIENT_ID`); los config de
> **integraciones** viven en la app de Meta (`META_APP_ID`). No los mezcles.

## Verificar qué falta

`GET /api/health/integrations` (OWNER/ADMIN) devuelve `ok`/`missing` para cada config
ID y credencial, ya resuelto con la convención nueva + fallback. Úsalo tras pegar los
valores en Vercel para confirmar que todos aparecen en `ok`.

## Resto de credenciales

| Grupo | Variables | Obligatorio |
|---|---|---|
| App Meta (integraciones) | `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `NEXT_PUBLIC_META_APP_ID` | Sí (para Meta) |
| App Facebook (login) | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` | Sí (para login FB) |
| WhatsApp | `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `META_SYSTEM_USER_TOKEN`, `META_BUSINESS_PORTFOLIO_ID` | Opcional |
| Google | `GOOGLE_APIKEY_CONNECT`, `GOOGLE_SECRET_CONNECT`, `GOOGLE_DEVELOPERTOKEN_ADS` | Opcional |
| TikTok | `TIKTOK_ADS_APP_ID`, `TIKTOK_ADS_CLIENT_ID`, `TIKTOK_ADS_CLIENT_SECRET`, `TIKTOK_WEBHOOK_SECRET` | Opcional |
| IA | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ARIA_LLM_PROVIDER` | ≥1 proveedor |
| Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Sí (invitaciones/alertas) |
| Infra (nombres fijos) | `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY` (64 hex), `CRON_SECRET`, `PUBLISH_WORKER_SECRET`, `BLOB_READ_WRITE_TOKEN`, `ANALYTICS_PII_SALT`, `NEXT_PUBLIC_APP_URL` | Sí |
| Optimización controlada | `OPTIMIZATION_EXECUTION_ENABLED`, `OPTIMIZATION_KILL_SWITCH`, `OPTIMIZATION_MAX_DAILY_ACTIONS`, `OPTIMIZATION_DRY_RUN_TTL_MINUTES` | No; ejecución apagada por defecto |

## Notas

- `META_API_VERSION` y `INSTAGRAM_SCOPES`/`INSTAGRAM_TOKEN_URL` tienen default en
  `lib/env.ts`; solo defínelas si necesitas otro valor.
- `OPTIMIZATION_EXECUTION_ENABLED` debe permanecer en `false` hasta aprobar el
  rollout. `OPTIMIZATION_KILL_SWITCH=true` bloquea ejecuciones nuevas; el rollback
  manual sigue disponible cuando la ejecución controlada está habilitada.
- `ENCRYPTION_KEY` debe ser exactamente 64 caracteres hex (AES-256-GCM). Genera con:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- La base de datos: la integración de Neon en Vercel inyecta `DATABASE_URL` y las
  `STORAGE_*`. Confirma que apunta a la rama correcta (AGENTS.md §Database topology).
- Migración de nombres: puedes dejar los LEGACY funcionando y migrar a los nuevos sin
  prisa — el código acepta ambos. Para migrar, crea el nombre nuevo con el mismo valor
  y borra el legacy cuando confirmes en `/api/health/integrations`.

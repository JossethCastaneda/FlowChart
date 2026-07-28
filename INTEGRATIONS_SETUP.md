# Integrations Setup Guide

Guía para configurar cada plataforma publicitaria en Zefirus. El framework OAuth genérico (`/api/oauth/[provider]/start` → `/callback`) maneja la conexión; solo necesitas crear la app de desarrollador y agregar las variables en Vercel.

> **Nota importante**: Los scopes de **GESTIÓN** (crear/pausar campañas) requieren **app review** por cada plataforma. Los scopes de **LECTURA** generalmente no.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│  User clicks "Conectar"                                         │
│  → /api/oauth/{provider}/start                                  │
│  → Redirect to provider OAuth (con HMAC state)                  │
│  → Provider callback → /api/oauth/{provider}/callback           │
│  → Validate state + exchange code → encrypt tokens → DB         │
│  → Redirect to /dashboard/integrations?connected={provider}     │
└─────────────────────────────────────────────────────────────────┘
```

Tokens se cifran con **AES-256-GCM** vía `lib/encryption.ts` y se almacenan **por workspace** en la tabla `Integration`.

---

## Plataformas

### 1. Google (Hub unificado — GA4, Search Console, Tag Manager, Ads, BigQuery)

> **Modelo SaaS:** se registra **UN solo cliente OAuth** en Google Cloud y los
> módulos se piden con **consentimiento incremental** (`/api/oauth/google/start?modules=…`).
> Cada workspace conecta SU propia cuenta de Google; nunca manejas tokens de
> cliente a mano. Ruta de callback única: **`/api/oauth/google/callback`**.

| Campo | Valor |
|---|---|
| **Portal** | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials |
| **Tipo de credencial** | OAuth client ID → **Web application** |
| **APIs a habilitar** | Google Analytics Data API, Google Analytics Admin API, Search Console API, Tag Manager API, Google Ads API, BigQuery API |
| **Variables Vercel** | `GOOGLE_APIKEY_CONNECT`, `GOOGLE_SECRET_CONNECT`, `GOOGLE_DEVELOPERTOKEN_ADS` |

**Authorized redirect URIs** (regístralas EXACTAS, sin espacios ni slash final):

```
https://zefirus.xyz/api/oauth/google/callback
https://dev.zefirus.xyz/api/oauth/google/callback
http://localhost:3000/api/oauth/google/callback
```

**Authorized JavaScript origins:**

```
https://zefirus.xyz
https://dev.zefirus.xyz
http://localhost:3000
```

> **Developer Token (solo Google Ads):** cuenta MCC (Manager) → Herramientas → API Center → Apply.
> Inicia en "Test Access" (solo cuentas de prueba); solicita "Basic/Standard Access" para producción.

> **Scopes por módulo** (se piden solo los activados — `lib/integrations/google/registry.ts`):
> GA4/Search Console → `analytics.readonly`, `webmasters.readonly` · Tag Manager → `tagmanager.readonly` ·
> Google Ads → `adwords` · BigQuery → `bigquery.readonly`.

> ⚠️ **NEXTAUTH_URL sin espacios:** el `redirect_uri` se deriva de `NEXTAUTH_URL`.
> Si esa variable tiene un espacio al inicio/fin en Vercel, Google lo recibe como
> `%20` y rechaza con `redirect_uri_mismatch`. El código ya lo sanea
> (`lib/app-url.ts`), pero igual debe estar limpia: `https://zefirus.xyz` en
> Production y `https://dev.zefirus.xyz` en Preview.

---

### 4. TikTok Ads

| Campo | Valor |
|---|---|
| **Portal** | [TikTok for Business - Developer](https://business-api.tiktok.com/portal) |
| **APIs a habilitar** | Marketing API |
| **Redirect URI** | `https://TU_DOMINIO/api/oauth/tiktok_ads/callback` |
| **Scopes** | Automáticos según nivel de acceso de la app |
| **Variables Vercel** | `TIKTOK_ADS_CLIENT_ID`, `TIKTOK_ADS_CLIENT_SECRET` |

> TikTok requiere revisión de la app y aprobación del equipo de Business API.

---

### 5. LinkedIn Ads

| Campo | Valor |
|---|---|
| **Portal** | [LinkedIn Developer Portal](https://developer.linkedin.com) |
| **APIs a habilitar** | Marketing Developer Platform |
| **Redirect URI** | `https://TU_DOMINIO/api/oauth/linkedin_ads/callback` |
| **Scopes** | `r_ads_reporting`, `r_ads`, `r_organization_social` |
| **Variables Vercel** | `LINKEDIN_ADS_CLIENT_ID`, `LINKEDIN_ADS_CLIENT_SECRET` |

> LinkedIn requiere solicitar acceso al **Marketing Developer Platform** (formulario separado).

---

### 6. Pinterest Ads

| Campo | Valor |
|---|---|
| **Portal** | [Pinterest Developers](https://developers.pinterest.com) |
| **APIs a habilitar** | Pinterest API v5 |
| **Redirect URI** | `https://TU_DOMINIO/api/oauth/pinterest_ads/callback` |
| **Scopes** | `ads:read`, `user_accounts:read` |
| **Variables Vercel** | `PINTEREST_ADS_CLIENT_ID`, `PINTEREST_ADS_CLIENT_SECRET` |

---

### 7. Snapchat Ads

| Campo | Valor |
|---|---|
| **Portal** | [Snapchat Business Developer](https://business.snapchat.com/portal) |
| **APIs a habilitar** | Marketing API |
| **Redirect URI** | `https://TU_DOMINIO/api/oauth/snapchat_ads/callback` |
| **Scopes** | `snapchat-marketing-api` |
| **Variables Vercel** | `SNAPCHAT_ADS_CLIENT_ID`, `SNAPCHAT_ADS_CLIENT_SECRET` |

---

### 8. X (Twitter) Ads

| Campo | Valor |
|---|---|
| **Portal** | [X Developer Portal](https://developer.x.com) |
| **APIs a habilitar** | Ads API (requiere aprobación) |
| **Redirect URI** | `https://TU_DOMINIO/api/oauth/x_ads/callback` |
| **Scopes** | `ads.read`, `tweet.read`, `users.read`, `offline.access` |
| **Variables Vercel** | `X_ADS_CLIENT_ID`, `X_ADS_CLIENT_SECRET` |

> X Ads API requiere un proceso de aprobación separado y cuenta de anunciante verificada.

---

### 9. WhatsApp Business Cloud API (Meta)

A diferencia de los demás módulos de Meta (que usan OAuth con `config_id`), WhatsApp Business usa un **System User Token permanente** generado desde Meta Business Manager.

| Campo | Valor |
|---|---|
| **Portal** | [Meta Business Manager](https://business.facebook.com) → Configuración → Usuarios del sistema |
| **Token** | System User Token (permanente — no expira como el token de usuario) |
| **Endpoint** | `POST /api/connect/whatsapp` |
| **Webhook URL** | `https://TU_DOMINIO/api/webhooks/whatsapp` |
| **Webhook Verify Token** | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (string aleatorio) |

#### Variables de entorno requeridas

| Variable | Propósito |
|---|---|
| `WHATSAPP_APP_SECRET` | App Secret de la Meta App (para verificar HMAC del webhook) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Token de verificación del webhook (string aleatorio, el mismo que pones en Meta) |

> **Nota:** `accessToken`, `phoneNumberId` y `wabaId` se guardan **por workspace** en la tabla `Integration` (cifrados con AES-256-GCM), nunca en variables de entorno globales.

#### Pasos de setup

1. **Crear/verificar Business Portfolio** en [Meta Business Manager](https://business.facebook.com)
2. En la Meta App → Producto: WhatsApp → Añadir número de teléfono de prueba
3. **Crear System User** en Business Manager → Usuarios del sistema → Generar Token
4. Configurar el **Webhook** en la consola de Meta:
   - URL: `https://TU_DOMINIO/api/webhooks/whatsapp`
   - Verify Token: el valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - Suscribir al campo: `messages`
5. Conectar desde el Dashboard de Zefirus → Integraciones → WhatsApp Business, o via API:
   ```bash
   curl -X POST https://TU_DOMINIO/api/connect/whatsapp \
     -H "Cookie: next-auth.session-token=..." \
     -H "Content-Type: application/json" \
     -d '{ "accessToken": "...", "phoneNumberId": "...", "wabaId": "..." }'
   ```

#### Desarrollo local con ngrok

```bash
# 1. Instalar ngrok y exponer el puerto local
ngrok http 3000

# 2. Usar la URL de ngrok como webhook en Meta Developer Portal
# ej. https://abc123.ngrok-free.app/api/webhooks/whatsapp
```

---



| Variable | Propósito |
|---|---|
| `ENCRYPTION_KEY` | AES-256-GCM key para cifrar todos los tokens (64 hex chars) |
| `NEXTAUTH_SECRET` | HMAC signing del state OAuth + JWT sessions |
| `CRON_SECRET` | Auth para el cron `sync-insights` |

---

## Prisma (InsightsCache)

Si se agregó el modelo `InsightsCache` al schema:

```bash
# En la branch de Neon (desarrollo)
npx prisma db push

# NO usar prisma migrate deploy — el proyecto usa db push exclusivamente
```

---

## Webhooks de Meta (páginas, Instagram, ad_account)

### Suscripción automática (páginas + Instagram)

Al conectar **cualquier** módulo de Meta vía `api/connect/[module]`, el callback
suscribe automáticamente todas las páginas conectadas (y sus cuentas de IG
vinculadas) a los webhooks — ya **no** es un paso manual. La lógica vive en
`lib/meta-webhooks.ts` y se registra en `AuditLog` (`action: "subscribe_webhooks"`).

Para re-suscribir manualmente o inspeccionar el estado:

```bash
# Estado actual de suscripciones por página
GET  /api/webhooks/subscribe

# Forzar re-suscripción de todas las páginas
POST /api/webhooks/subscribe
```

| Campo | Valor |
|---|---|
| **Callback URL** | `https://TU_DOMINIO/api/webhooks/meta` |
| **Verify Token** | `META_WEBHOOK_VERIFY_TOKEN` |
| **Campos página** | `messages, messaging_postbacks, messaging_optins, messaging_referrals, message_deliveries, message_reads, feed, mention, ratings, leadgen` |
| **Campos Instagram** | `messages, messaging_postbacks, comments, mentions, live_comments, story_insights` |

### Suscripción de `ad_account` (MANUAL — nivel App)

> ⚠️ Meta **no expone** `subscribed_apps` para cuentas publicitarias. La
> suscripción de `ad_account` se configura **una sola vez a nivel App** en la
> consola de Meta Developers, no por workspace ni programáticamente.

1. Meta Developers → Tu App → **Webhooks** → objeto **Ad Account**
2. Callback URL: `https://TU_DOMINIO/api/webhooks/meta`, Verify Token: `META_WEBHOOK_VERIFY_TOKEN`
3. Suscribir campos: `campaigns, adsets, ads, account_spending_limit_reached, funding_source_removed, ad_review`

Sin este paso manual NO llegan alertas de `ad_review` (anuncios rechazados),
límite de gasto alcanzado ni método de pago removido.

---

## Checklist por plataforma

1. [ ] Crear developer app en el portal
2. [ ] Configurar redirect URI: `https://TU_DOMINIO/api/oauth/{provider}/callback`
3. [ ] Copiar Client ID + Client Secret
4. [ ] Agregar las variables en Vercel → Settings → Environment Variables
5. [ ] Probar: Dashboard → Integraciones → Conectar
6. [ ] (Opcional) Solicitar app review para scopes de gestión

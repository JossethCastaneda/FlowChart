# Integrations Setup Guide

Guía para configurar cada plataforma publicitaria en Sodare. El framework OAuth genérico (`/api/oauth/[provider]/start` → `/callback`) maneja la conexión; solo necesitas crear la app de desarrollador y agregar las variables en Vercel.

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

### 1. Google Ads

| Campo | Valor |
|---|---|
| **Portal** | [Google Cloud Console](https://console.cloud.google.com) |
| **APIs a habilitar** | Google Ads API |
| **Redirect URI** | `https://TU_DOMINIO/api/oauth/google_ads/callback` |
| **Scopes** | `https://www.googleapis.com/auth/adwords` |
| **Variables Vercel** | `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN` |

> **Developer Token**: Se obtiene desde la cuenta MCC (Manager) → API Center → Apply for token. Inicia en "Test Account" (solo tu cuenta), luego solicitar "Basic Access" para producción.

---

### 2. Google Analytics 4 (Data API)

| Campo | Valor |
|---|---|
| **Portal** | [Google Cloud Console](https://console.cloud.google.com) |
| **APIs a habilitar** | Google Analytics Data API |
| **Redirect URI** | `https://TU_DOMINIO/api/oauth/google_analytics/callback` |
| **Scopes** | `https://www.googleapis.com/auth/analytics.readonly` |
| **Variables Vercel** | `GOOGLE_ANALYTICS_CLIENT_ID`, `GOOGLE_ANALYTICS_CLIENT_SECRET` |

---

### 3. Google BigQuery

| Campo | Valor |
|---|---|
| **Portal** | [Google Cloud Console](https://console.cloud.google.com) |
| **APIs a habilitar** | BigQuery API |
| **Redirect URI** | `https://TU_DOMINIO/api/oauth/google_bigquery/callback` |
| **Scopes** | `https://www.googleapis.com/auth/bigquery.readonly` |
| **Variables Vercel** | `GOOGLE_BIGQUERY_CLIENT_ID`, `GOOGLE_BIGQUERY_CLIENT_SECRET` |

> **Alternativa**: En lugar de OAuth del cliente, puedes usar una **service account** con `GOOGLE_SERVICE_ACCOUNT_JSON` (base64-encoded).

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

## Variables Comunes (ya configuradas)

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

## Checklist por plataforma

1. [ ] Crear developer app en el portal
2. [ ] Configurar redirect URI: `https://TU_DOMINIO/api/oauth/{provider}/callback`
3. [ ] Copiar Client ID + Client Secret
4. [ ] Agregar las variables en Vercel → Settings → Environment Variables
5. [ ] Probar: Dashboard → Integraciones → Conectar
6. [ ] (Opcional) Solicitar app review para scopes de gestión

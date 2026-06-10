# lib/integrations — mapa de subsistemas

Hoy coexisten **dos subsistemas de OAuth/integraciones**. Antes de añadir un
provider o un cliente nuevo, ubica en cuál vive para no duplicar módulos
(ya pasó con `bigquery.ts` y `google-ads.ts`; los duplicados muertos se
eliminaron en junio 2026).

## 1. Registro multi-provider (genérico)

- `registry.ts` — catálogo `PROVIDERS` (google_ads, google_bigquery, linkedin,
  tiktok, pinterest, snapchat, x…): scopes, URLs de OAuth, labels.
- `oauth.ts` — flujo genérico usado por `app/api/oauth/[provider]/start|callback`.
- `google-ads.ts` — cliente `createGoogleAdsClient()` con interfaz `AdsClient`
  (`getInsights`), consumido por el cron `api/cron/sync-insights`.
- `linkedin-ads.ts`, `tiktok-ads.ts`, `pinterest-ads.ts`, `snapchat-ads.ts`,
  `x-ads.ts` — stubs pendientes de implementar (el cron los registra en
  `CLIENT_FACTORIES` cuando existan).
- `types.ts` — `AdsClient`, `EMPTY_INSIGHTS`, tipos normalizados.

**Propósito:** sincronización de insights de pauta multi-plataforma.

## 2. Google Hub (módulos por scope)

- `google/registry.ts` — `GOOGLE_MODULES` (ga4, gsc, gtm, ads, bigquery):
  el usuario conecta SOLO los módulos que necesita (scopes incrementales).
- `google/oauth.ts` — refresh de tokens del hub, usado por
  `app/api/integrations/google/resources/*` y `app/api/oauth/google/*`.
- `google/google-ads.ts` — `getAdsCampaigns()` / `updateCampaignStatus()`,
  consumido por `app/api/integrations/google/ads/campaigns`.

**Propósito:** el centro de integraciones Google de la UI
(`components/integrations/GoogleHubCenter.tsx`).

## Regla práctica

- Cliente nuevo para el **cron de insights** → subsistema 1 (implementa
  `AdsClient` y regístralo en `CLIENT_FACTORIES`).
- Funcionalidad nueva del **hub de Google en la UI** → subsistema 2.
- **Objetivo a mediano plazo:** unificar ambos flujos OAuth en uno solo
  (idealmente bajo `domains/infrastructure`); hasta entonces, no crear
  módulos con el mismo nombre en ambos lados.

---
tags: [generado, api, endpoints]
---

# API — Índice de endpoints

> ⚠️ **Archivo generado automáticamente** por `npm run docs:graph`.
> No lo edites manualmente — se sobreescribe en cada generación.
> Fuente: `scripts/docs-graph.mjs`

Total: **167 route handlers** en 32 grupos.

## `/api/ads/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/ads/boost` | `POST` | `app/api/ads/boost/route.ts` |

## `/api/alerts/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/alerts/check` | `GET` | `app/api/alerts/check/route.ts` |

## `/api/auth/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/auth/[...nextauth]` | — | `app/api/auth/[...nextauth]/route.ts` |
| `/api/auth/change-password` | `POST` | `app/api/auth/change-password/route.ts` |
| `/api/auth/clear-session` | `GET` | `app/api/auth/clear-session/route.ts` |
| `/api/auth/forgot-password` | `POST` | `app/api/auth/forgot-password/route.ts` |
| `/api/auth/register` | `POST` | `app/api/auth/register/route.ts` |
| `/api/auth/reset-password` | `POST` | `app/api/auth/reset-password/route.ts` |

## `/api/billing/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/billing/checkout` | `POST` | `app/api/billing/checkout/route.ts` |
| `/api/billing/portal` | `POST` | `app/api/billing/portal/route.ts` |

## `/api/briefs/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/briefs` | `GET` `POST` | `app/api/briefs/route.ts` |
| `/api/briefs/[id]` | `GET` `PATCH` `DELETE` | `app/api/briefs/[id]/route.ts` |

## `/api/connect/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/connect/[module]` | `GET` | `app/api/connect/[module]/route.ts` |
| `/api/connect/callback` | `GET` | `app/api/connect/callback/route.ts` |
| `/api/connect/disconnect` | `POST` | `app/api/connect/disconnect/route.ts` |
| `/api/connect/facebook-pages` | `GET` `PATCH` | `app/api/connect/facebook-pages/route.ts` |
| `/api/connect/status` | `GET` | `app/api/connect/status/route.ts` |
| `/api/connect/whatsapp` | `POST` `DELETE` | `app/api/connect/whatsapp/route.ts` |

## `/api/crecimiento/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/crecimiento/datasets` | `GET` `POST` | `app/api/crecimiento/datasets/route.ts` |
| `/api/crecimiento/insights` | `GET` | `app/api/crecimiento/insights/route.ts` |
| `/api/crecimiento/scores` | `GET` | `app/api/crecimiento/scores/route.ts` |
| `/api/crecimiento/summary` | `GET` | `app/api/crecimiento/summary/route.ts` |
| `/api/crecimiento/train` | `POST` | `app/api/crecimiento/train/route.ts` |

## `/api/cron/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/cron/billing` | `GET` | `app/api/cron/billing/route.ts` |
| `/api/cron/instagram-resubscribe` | `GET` | `app/api/cron/instagram-resubscribe/route.ts` |
| `/api/cron/mmm-ingest` | `GET` | `app/api/cron/mmm-ingest/route.ts` |
| `/api/cron/sync-ads` | `GET` | `app/api/cron/sync-ads/route.ts` |
| `/api/cron/sync-assets` | `GET` | `app/api/cron/sync-assets/route.ts` |
| `/api/cron/sync-insights` | `GET` | `app/api/cron/sync-insights/route.ts` |

## `/api/debug/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/debug/webhook-status` | `GET` | `app/api/debug/webhook-status/route.ts` |

## `/api/google/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/google/insights` | `GET` | `app/api/google/insights/route.ts` |

## `/api/gridia/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/gridia` | `POST` | `app/api/gridia/route.ts` |

## `/api/health/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/health` | `GET` | `app/api/health/route.ts` |
| `/api/health/integrations` | `GET` | `app/api/health/integrations/route.ts` |

## `/api/inbox/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/inbox/avatar` | `GET` | `app/api/inbox/avatar/route.ts` |
| `/api/inbox/backfill` | `POST` | `app/api/inbox/backfill/route.ts` |
| `/api/inbox/comments` | `GET` | `app/api/inbox/comments/route.ts` |
| `/api/inbox/contacts` | `GET` `POST` | `app/api/inbox/contacts/route.ts` |
| `/api/inbox/contacts/[id]` | `GET` `PATCH` | `app/api/inbox/contacts/[id]/route.ts` |
| `/api/inbox/conversations` | `GET` | `app/api/inbox/conversations/route.ts` |
| `/api/inbox/conversations/[id]` | `PATCH` | `app/api/inbox/conversations/[id]/route.ts` |
| `/api/inbox/messages` | `GET` `POST` | `app/api/inbox/messages/route.ts` |
| `/api/inbox/notes` | `GET` `POST` `DELETE` | `app/api/inbox/notes/route.ts` |
| `/api/inbox/post` | `GET` | `app/api/inbox/post/route.ts` |
| `/api/inbox/profile` | `GET` | `app/api/inbox/profile/route.ts` |
| `/api/inbox/reply` | `POST` | `app/api/inbox/reply/route.ts` |
| `/api/inbox/stream` | `GET` | `app/api/inbox/stream/route.ts` |

## `/api/integrations/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/integrations/assets` | `GET` | `app/api/integrations/assets/route.ts` |
| `/api/integrations/google/ads/campaigns` | `GET` `POST` | `app/api/integrations/google/ads/campaigns/route.ts` |
| `/api/integrations/google/resources/ads` | `GET` `POST` | `app/api/integrations/google/resources/ads/route.ts` |
| `/api/integrations/google/resources/ga4` | `GET` `POST` | `app/api/integrations/google/resources/ga4/route.ts` |
| `/api/integrations/google/resources/gsc` | `GET` `POST` | `app/api/integrations/google/resources/gsc/route.ts` |
| `/api/integrations/google/resources/gtm` | `GET` `POST` | `app/api/integrations/google/resources/gtm/route.ts` |
| `/api/integrations/instagram/connect` | `GET` | `app/api/integrations/instagram/connect/route.ts` |
| `/api/integrations/instagram/resubscribe` | `POST` | `app/api/integrations/instagram/resubscribe/route.ts` |
| `/api/integrations/instagram/status` | `GET` | `app/api/integrations/instagram/status/route.ts` |
| `/api/integrations/sync` | `POST` | `app/api/integrations/sync/route.ts` |

## `/api/invite/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/invite/[token]` | `GET` `POST` | `app/api/invite/[token]/route.ts` |

## `/api/listening/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/listening/hashtags` | `GET` | `app/api/listening/hashtags/route.ts` |
| `/api/listening/keywords` | `GET` `POST` | `app/api/listening/keywords/route.ts` |
| `/api/listening/keywords/[id]` | `DELETE` | `app/api/listening/keywords/[id]/route.ts` |
| `/api/listening/mentions` | `GET` | `app/api/listening/mentions/route.ts` |
| `/api/listening/search` | `GET` | `app/api/listening/search/route.ts` |

## `/api/meta/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/meta/actions` | `POST` | `app/api/meta/actions/route.ts` |
| `/api/meta/adaccounts` | `GET` | `app/api/meta/adaccounts/route.ts` |
| `/api/meta/adcreatives` | `GET` | `app/api/meta/adcreatives/route.ts` |
| `/api/meta/ads` | `GET` `POST` | `app/api/meta/ads/route.ts` |
| `/api/meta/ads/create` | `POST` | `app/api/meta/ads/create/route.ts` |
| `/api/meta/adsets` | `GET` `POST` | `app/api/meta/adsets/route.ts` |
| `/api/meta/adsets/create` | `POST` | `app/api/meta/adsets/create/route.ts` |
| `/api/meta/audience-reliability` | `GET` | `app/api/meta/audience-reliability/route.ts` |
| `/api/meta/breakdowns` | `GET` | `app/api/meta/breakdowns/route.ts` |
| `/api/meta/campaigns` | `GET` `POST` | `app/api/meta/campaigns/route.ts` |
| `/api/meta/campaigns/create` | `POST` | `app/api/meta/campaigns/create/route.ts` |
| `/api/meta/connection-status` | `GET` | `app/api/meta/connection-status/route.ts` |
| `/api/meta/data-deletion` | `GET` `POST` | `app/api/meta/data-deletion/route.ts` |
| `/api/meta/deauthorize` | `GET` `POST` | `app/api/meta/deauthorize/route.ts` |
| `/api/meta/insights` | `GET` | `app/api/meta/insights/route.ts` |
| `/api/meta/insights-daily` | `GET` | `app/api/meta/insights-daily/route.ts` |
| `/api/meta/pages` | `GET` | `app/api/meta/pages/route.ts` |
| `/api/meta/refresh-token` | `GET` `POST` | `app/api/meta/refresh-token/route.ts` |
| `/api/meta/rules` | `GET` `POST` | `app/api/meta/rules/route.ts` |
| `/api/meta/rules/[ruleId]` | `POST` `DELETE` | `app/api/meta/rules/[ruleId]/route.ts` |

## `/api/mmm/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/mmm/config` | `GET` `PUT` | `app/api/mmm/config/route.ts` |
| `/api/mmm/spend` | `GET` | `app/api/mmm/spend/route.ts` |

## `/api/notifications/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/notifications` | `GET` `PATCH` | `app/api/notifications/route.ts` |
| `/api/notifications/check-sla` | `GET` `POST` | `app/api/notifications/check-sla/route.ts` |

## `/api/oauth/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/oauth/[provider]/callback` | `GET` | `app/api/oauth/[provider]/callback/route.ts` |
| `/api/oauth/[provider]/start` | `GET` | `app/api/oauth/[provider]/start/route.ts` |
| `/api/oauth/google/callback` | `GET` | `app/api/oauth/google/callback/route.ts` |
| `/api/oauth/google/start` | `GET` | `app/api/oauth/google/start/route.ts` |

## `/api/ops/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/ops` | `GET` `POST` | `app/api/ops/route.ts` |
| `/api/ops/[id]` | `PATCH` `DELETE` | `app/api/ops/[id]/route.ts` |
| `/api/ops/[id]/comments` | `GET` `POST` | `app/api/ops/[id]/comments/route.ts` |
| `/api/ops/okrs` | `GET` `POST` | `app/api/ops/okrs/route.ts` |
| `/api/ops/stream` | `GET` | `app/api/ops/stream/route.ts` |

## `/api/optimization/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/optimization/actions/[actionId]/approval` | `POST` | `app/api/optimization/actions/[actionId]/approval/route.ts` |
| `/api/optimization/actions/[actionId]/execute` | `POST` | `app/api/optimization/actions/[actionId]/execute/route.ts` |
| `/api/optimization/actions/[actionId]/rollback` | `POST` | `app/api/optimization/actions/[actionId]/rollback/route.ts` |
| `/api/optimization/audit` | `GET` | `app/api/optimization/audit/route.ts` |
| `/api/optimization/clients` | `GET` `POST` | `app/api/optimization/clients/route.ts` |
| `/api/optimization/evaluations` | `GET` `POST` | `app/api/optimization/evaluations/route.ts` |
| `/api/optimization/objectives` | `GET` `POST` | `app/api/optimization/objectives/route.ts` |
| `/api/optimization/overview` | `GET` | `app/api/optimization/overview/route.ts` |
| `/api/optimization/recommendations` | `GET` `POST` | `app/api/optimization/recommendations/route.ts` |
| `/api/optimization/results` | `GET` `POST` | `app/api/optimization/results/route.ts` |
| `/api/optimization/snapshots` | `GET` `POST` | `app/api/optimization/snapshots/route.ts` |

## `/api/projects/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/projects` | `GET` `POST` | `app/api/projects/route.ts` |
| `/api/projects/[id]` | `GET` `PUT` `DELETE` | `app/api/projects/[id]/route.ts` |
| `/api/projects/[id]/google-sources` | `GET` `PUT` | `app/api/projects/[id]/google-sources/route.ts` |
| `/api/projects/[id]/token` | `POST` | `app/api/projects/[id]/token/route.ts` |
| `/api/projects/[id]/traffic` | `GET` | `app/api/projects/[id]/traffic/route.ts` |

## `/api/public/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/public/project/[token]` | `GET` | `app/api/public/project/[token]/route.ts` |

## `/api/publisher/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/publisher/diagnose` | `GET` | `app/api/publisher/diagnose/route.ts` |
| `/api/publisher/filters` | `GET` | `app/api/publisher/filters/route.ts` |
| `/api/publisher/first-comment` | `POST` | `app/api/publisher/first-comment/route.ts` |
| `/api/publisher/insights/[id]` | `GET` | `app/api/publisher/insights/[id]/route.ts` |
| `/api/publisher/library` | `GET` | `app/api/publisher/library/route.ts` |
| `/api/publisher/library/[id]` | `PATCH` `DELETE` | `app/api/publisher/library/[id]/route.ts` |
| `/api/publisher/posts` | `GET` `POST` | `app/api/publisher/posts/route.ts` |
| `/api/publisher/posts/[id]` | `GET` `PUT` `DELETE` | `app/api/publisher/posts/[id]/route.ts` |
| `/api/publisher/posts/[id]/approve` | `POST` | `app/api/publisher/posts/[id]/approve/route.ts` |
| `/api/publisher/publish` | `POST` | `app/api/publisher/publish/route.ts` |
| `/api/publisher/reels` | `POST` | `app/api/publisher/reels/route.ts` |
| `/api/publisher/settings` | `GET` `PUT` | `app/api/publisher/settings/route.ts` |
| `/api/publisher/stories` | `POST` | `app/api/publisher/stories/route.ts` |
| `/api/publisher/upload` | `POST` | `app/api/publisher/upload/route.ts` |

## `/api/reportes/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/reportes` | `GET` `POST` | `app/api/reportes/route.ts` |
| `/api/reportes/[id]` | `GET` `DELETE` | `app/api/reportes/[id]/route.ts` |
| `/api/reportes/public/[slug]` | `GET` | `app/api/reportes/public/[slug]/route.ts` |

## `/api/resumen/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/resumen` | `GET` | `app/api/resumen/route.ts` |

## `/api/streams/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/streams/boards` | `GET` `POST` | `app/api/streams/boards/route.ts` |
| `/api/streams/boards/[id]` | `DELETE` | `app/api/streams/boards/[id]/route.ts` |
| `/api/streams/boards/[id]/columns` | `PUT` | `app/api/streams/boards/[id]/columns/route.ts` |
| `/api/streams/comment` | `POST` | `app/api/streams/comment/route.ts` |
| `/api/streams/feed` | `GET` | `app/api/streams/feed/route.ts` |

## `/api/user/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/user/avatar` | `POST` `DELETE` | `app/api/user/avatar/route.ts` |
| `/api/user/profile` | `GET` `PATCH` | `app/api/user/profile/route.ts` |

## `/api/webhooks/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/webhooks/meta` | `GET` `POST` | `app/api/webhooks/meta/route.ts` |
| `/api/webhooks/resubscribe` | `POST` | `app/api/webhooks/resubscribe/route.ts` |
| `/api/webhooks/stripe` | `POST` | `app/api/webhooks/stripe/route.ts` |
| `/api/webhooks/subscribe` | `GET` `POST` | `app/api/webhooks/subscribe/route.ts` |
| `/api/webhooks/tiktok` | `GET` `POST` | `app/api/webhooks/tiktok/route.ts` |
| `/api/webhooks/whatsapp` | `GET` `POST` | `app/api/webhooks/whatsapp/route.ts` |

## `/api/whatsapp/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/whatsapp/phone-numbers` | `GET` `POST` `DELETE` | `app/api/whatsapp/phone-numbers/route.ts` |
| `/api/whatsapp/phone-numbers/deregister` | `POST` | `app/api/whatsapp/phone-numbers/deregister/route.ts` |
| `/api/whatsapp/phone-numbers/register` | `POST` | `app/api/whatsapp/phone-numbers/register/route.ts` |
| `/api/whatsapp/send` | `POST` | `app/api/whatsapp/send/route.ts` |
| `/api/whatsapp/templates` | `GET` | `app/api/whatsapp/templates/route.ts` |
| `/api/whatsapp/test-call` | `POST` | `app/api/whatsapp/test-call/route.ts` |

## `/api/workspace/`

| Ruta | Métodos | Archivo |
|------|---------|--------|
| `/api/workspace` | `GET` `POST` | `app/api/workspace/route.ts` |
| `/api/workspace/[workspaceId]` | `GET` `PATCH` `DELETE` | `app/api/workspace/[workspaceId]/route.ts` |
| `/api/workspace/[workspaceId]/audit` | `GET` | `app/api/workspace/[workspaceId]/audit/route.ts` |
| `/api/workspace/[workspaceId]/invite` | `GET` `POST` | `app/api/workspace/[workspaceId]/invite/route.ts` |
| `/api/workspace/[workspaceId]/invite/[inviteId]` | `DELETE` | `app/api/workspace/[workspaceId]/invite/[inviteId]/route.ts` |
| `/api/workspace/[workspaceId]/members` | `GET` `DELETE` | `app/api/workspace/[workspaceId]/members/route.ts` |
| `/api/workspace/[workspaceId]/members/permissions` | `PATCH` | `app/api/workspace/[workspaceId]/members/permissions/route.ts` |
| `/api/workspace/[workspaceId]/members/role` | `PATCH` | `app/api/workspace/[workspaceId]/members/role/route.ts` |
| `/api/workspace/asset-groups` | `GET` `POST` | `app/api/workspace/asset-groups/route.ts` |
| `/api/workspace/asset-groups/[id]` | `PATCH` `DELETE` | `app/api/workspace/asset-groups/[id]/route.ts` |
| `/api/workspace/branding/logo` | `POST` `DELETE` | `app/api/workspace/branding/logo/route.ts` |
| `/api/workspace/integrations` | `GET` `POST` `DELETE` | `app/api/workspace/integrations/route.ts` |
| `/api/workspace/integrations/test-crm` | `POST` | `app/api/workspace/integrations/test-crm/route.ts` |
| `/api/workspace/members/status` | `GET` `PUT` | `app/api/workspace/members/status/route.ts` |
| `/api/workspace/settings` | `GET` `PUT` | `app/api/workspace/settings/route.ts` |
| `/api/workspace/switch` | `POST` | `app/api/workspace/switch/route.ts` |
| `/api/workspace/usage` | `GET` | `app/api/workspace/usage/route.ts` |

## Relacionado

- [[../architecture/README|Arquitectura]]
- [[../Home|← Home]]

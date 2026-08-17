# FlowChart — Auditoría de madurez competitiva (julio 2026)

Evaluación de la herramienta como **CRM (inbox)**, como **publisher rival de Hootsuite**
y su preparación general para el mercado. Marca el estado actual, lo que se implementó en
esta ronda y el roadmap priorizado.

Leyenda: ✅ listo · 🟡 base implementada (falta UI/pulido) · ⬜ pendiente.

---

## 1. Inbox como CRM (vs HubSpot / Agorapulse)

| Capacidad | Estado | Nota |
|---|---|---|
| Bandeja omnicanal (WhatsApp, Messenger, IG DM, comentarios) | ✅ | Persistencia en DB, tiempo real por webhook |
| **Contacto unificado entre canales** | 🟡 | **Nuevo:** `Contact` + `ContactChannel`; una persona = un registro |
| Timeline unificado de interacciones | 🟡 | `GET /api/inbox/contacts/[id]` fusiona mensajes de todos los canales |
| Tags / segmentación a nivel persona | 🟡 | `Contact.tags` + filtro por tag en la lista |
| Etapa de ciclo de vida (lead→cliente) | 🟡 | `lifecycleStage`; falta pipeline visual |
| Propietario / asignación de cuenta | 🟡 | `Contact.ownerId` (validado como miembro) |
| Campos personalizados | 🟡 | `Contact.customFields` (Json) |
| Notas internas | ✅ | Por conversación (`InboxNote`) y por contacto (`Contact.notes`) |
| Respuestas guardadas / macros | ✅ | `SavedReply` con shortcuts |
| Auto-respuestas por keyword | ✅ | `DmAutomationRule` |
| SLA / auto-asignación | ✅ | `lib/sla-calculator`, `lib/auto-assign` |
| Pipeline / deals / oportunidades | ⬜ | Roadmap: entidad `Deal` + etapas |
| Import/export de contactos (CSV) | ⬜ | Roadmap (la lista/creación por API ya existe) |

**Veredicto CRM:** el salto estructural clave —de "inbox compartido" a "CRM con contacto
unificado"— ya está en el modelo de datos y la API. Falta la UI del panel de contacto y,
para CRM de ventas completo, el pipeline de deals.

---

## 2. Publisher (vs Hootsuite / Buffer)

| Capacidad | Estado | Nota |
|---|---|---|
| Programación multi-red (FB + IG) | ✅ | Workflow durable (WDK), no QStash |
| Calendario de programados | ✅ | `ScheduledCalendar` |
| Contenido por plataforma | ✅ | `contentByPlatform` (persistencia corregida) |
| Primer comentario (IG) | ✅ | Corregido (page token + envelope) |
| Reels / Stories inmediatos | ✅ | Page token server-side; polling sin caché |
| Reels / Stories **programados** | 🟡 | Bloqueado con mensaje claro (evita publicar como feed) |
| Carrusel IG | ✅ | Hasta 10 elementos |
| Subida de media a Blob | ✅ | Límite real 4.5MB; namespaced por workspace |
| Boost / promoción | ✅ | `BoostModal` |
| **Flujo de aprobación de equipo** | 🟡 | **Nuevo:** opt-in; MEMBER→pending, OWNER/ADMIN aprueban |
| Vista previa por plataforma | ✅ | `PostPreview` + `PlatformContentTabs` |
| TikTok / LinkedIn / X publishing | ⬜ | Roadmap (webhooks/ads TikTok existen, no publishing) |
| Analítica post-publicación | ⬜ | Roadmap: engagement por post |
| Mejor hora para publicar | ⬜ | Roadmap |
| Biblioteca de contenido / assets | 🟡 | `MediaAsset` existe; falta UI de reutilización |

**Veredicto Publisher:** el core de publicación es competitivo y los bugs que lo hacían
poco fiable (tokens, persistencia, reels) están corregidos. El **flujo de aprobación**
(diferenciador de agencia) ya tiene fundamento. Faltan redes adicionales y analítica de
posts para paridad total con Hootsuite.

---

## 3. Plataforma / mercado (vs SaaS competidores)

| Capacidad | Estado | Nota |
|---|---|---|
| Multi-tenant con aislamiento estricto | ✅ | Auditado y endurecido (sin fugas cross-tenant) |
| Planes y límites (free/pro/agency) | ✅ | `lib/plan-limits` con enforcement |
| Roles + permisos granulares por módulo | ✅ | OWNER/ADMIN/MEMBER + permisos por sección |
| **Registro de auditoría** | 🟡 | **Nuevo:** rol/permisos/miembros/integraciones + endpoint de lectura |
| Rate limiting robusto | ✅ | Atómico en DB (corregido) |
| Invalidación de sesión (cambio de contraseña) | ✅ | Nuevo en la auditoría de bugs |
| Cifrado de tokens en reposo | ✅ | AES-256-GCM; login solo identidad |
| Cumplimiento Meta/Google (data deletion, revoke) | ✅ | Fail-closed, verificado |
| Branding por workspace (white-label) | 🟡 | `WorkspaceSettings.branding`; falta dominio propio |
| Facturación (Stripe) | ⬜ | Roadmap; el framework de límites ya existe |
| i18n | ⬜ | Español fijo por ahora |
| Onboarding de config (config IDs) | ✅ | `docs/vercel-env.*` + resolver centralizado |

**Veredicto plataforma:** base SaaS sólida y segura tras la auditoría. Para "enterprise"
faltan facturación (Stripe) y white-label de dominio; el resto (roles, límites, auditoría,
seguridad multi-tenant) está en nivel competitivo.

---

## Roadmap priorizado (siguiente)

1. **UI del panel de contacto** en el inbox (consume `/api/inbox/contacts/[id]`) — cierra
   el bucle CRM visualmente.
2. **Pipeline de deals** (entidad `Deal` + etapas) — CRM de ventas.
3. **Analítica post-publicación** por post — paridad Hootsuite.
4. **Stripe billing** sobre el framework de `plan-limits` existente.
5. **Publishing a TikTok/LinkedIn/X** — más redes.
6. Import/export de contactos (CSV) y biblioteca de assets reutilizable.

> Nota: todos los cambios de esquema de esta ronda son **aditivos** y se aplican en el
> próxima migración revisada. El CRM se auto-puebla con cada mensaje entrante; para histórico,
> correr `node scripts/backfill-contacts.mjs`.

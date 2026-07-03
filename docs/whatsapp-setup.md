# WhatsApp Business — Guía de habilitación (Cloud API + Embedded Signup)

> Estado del código (auditado 2026-07-03): la implementación está **completa y a nivel
> producción**. Lo que falta para dejarla "100% funcional" es **configuración externa en
> Meta + variables de entorno en Vercel + aprobaciones de Meta** (App Review + Tech
> Provider). Este documento es el runbook exacto para completarlo.

---

## 1. Arquitectura implementada (referencia)

Modelo: **Tech Provider multi-tenant**. Cada workspace conecta su propia WhatsApp Business
Account (WABA) vía Embedded Signup; el token se cifra (AES-256-GCM) y se guarda por
workspace. No hay token global compartido entre clientes.

| Pieza | Archivo | Rol |
|---|---|---|
| UI de conexión | `components/settings/WhatsAppConnectCard.tsx` | Embedded Signup con `FB.login` + `config_id`, captura `WA_EMBEDDED_SIGNUP` postMessage, registro de número con PIN, test-call, enlace a proyectos |
| Intercambio de código | `app/api/connect/whatsapp/route.ts` | `code` → token, auto-discovery de WABA/número, **suscribe la app al WABA** (`subscribed_apps`), persiste `Integration` + `WaPhoneSource` |
| Cliente Cloud API | `lib/whatsapp.ts` | `getWaCredentials`, `sendWaText`, `sendWaTemplate`, `listWaTemplates`, verificación HMAC, resolución número→workspace |
| Webhook dedicado | `app/api/webhooks/whatsapp/route.ts` | Entrantes → `InboxConversation`/`InboxMessage`; auto-reply vía `DmAutomationRule` |
| Webhook unificado | `app/api/webhooks/meta/route.ts` | También procesa `whatsapp_business_account` (entrantes + statuses + template status) y crea notificaciones |
| Envío | `app/api/whatsapp/send/route.ts` | Texto y templates |
| Líneas | `app/api/whatsapp/phone-numbers/route.ts` (+`/register`) | Lista números de la WABA, enlaza a proyecto, registro con PIN |
| Test call | `app/api/whatsapp/test-call/route.ts` | Envía `hello_world` — para App Review |
| Inbox | `app/api/inbox/conversations/route.ts`, `messages/route.ts` | Lista y responde WhatsApp desde el inbox omnicanal (lee/escribe DB) |

Cadena de punta a punta verificada en código: **entrante** (Meta → webhook → HMAC → resuelve
workspace por `WaPhoneSource` → guarda conversación/mensaje → visible en inbox) y **saliente**
(inbox → `send` → Cloud API). Ambas están cableadas.

---

## 2. ⚠️ Decisión crítica: cuál webhook registrar

Meta permite **una sola URL de callback por app**. Hay dos endpoints que procesan WhatsApp
por completo (redundancia intencional para dos topologías). Elige **una**:

### Opción A — WhatsApp comparte la misma app Meta que FB/IG/Ads (lo más simple)
- Callback en Meta: **`https://TU_DOMINIO/api/webhooks/meta`**
- Verify token: `META_WEBHOOK_VERIFY_TOKEN`
- App Secret HMAC: `FACEBOOK_CLIENT_SECRET`
- Deja `WHATSAPP_APP_SECRET` y `WHATSAPP_WEBHOOK_VERIFY_TOKEN` vacíos.
- Suscribe el objeto `whatsapp_business_account` (campos `messages`, `message_template_status_update`) en esa app.
- **Limitación**: el auto-reply por `DmAutomationRule` NO se dispara (esa lógica solo vive en el webhook dedicado). Todo lo demás (inbox entrante/saliente, notificaciones) funciona.

### Opción B — App Meta dedicada solo a WhatsApp
- Callback en Meta: **`https://TU_DOMINIO/api/webhooks/whatsapp`**
- Verify token: `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- App Secret HMAC: `WHATSAPP_APP_SECRET`
- FB/IG/Ads siguen usando su app → `/api/webhooks/meta`.
- **Ventaja**: incluye auto-reply por keyword (`DmAutomationRule` con `whatsapp` en `platforms`).

> Recomendación: **Opción A** salvo que necesites el auto-reply nativo. En ese caso, o vas a
> Opción B, o se porta la lógica `tryAutoReply` de `webhooks/whatsapp` a `webhooks/meta` (para
> tener un solo webhook con todo). Hoy **no** conviene registrar los dos: solo uno recibe eventos.

---

## 3. Variables de entorno (Vercel)

| Variable | Requerida | Para qué |
|---|---|---|
| `NEXT_PUBLIC_META_APP_ID` | ✅ | SDK de FB en el navegador (Embedded Signup) |
| `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID` | ✅ | `config_id` del flujo de Embedded Signup de WhatsApp |
| `FACEBOOK_CLIENT_SECRET` | ✅ | Intercambio de `code`→token y HMAC (si Opción A) |
| `META_WEBHOOK_VERIFY_TOKEN` | ✅ (Opción A) | Verificación GET del webhook `/api/webhooks/meta` |
| `WHATSAPP_APP_SECRET` | Opción B | HMAC del webhook dedicado |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Opción B | Verificación GET de `/api/webhooks/whatsapp` |
| `ENCRYPTION_KEY` | ✅ | Cifrado AES-256 del token por workspace (ya existente) |
| `NEXTAUTH_URL` | ✅ | Base para construir la `webhookUrl` que se devuelve al conectar |
| `META_SYSTEM_USER_TOKEN` | Opcional | Listar WABAs de clientes (`client-accounts`) |
| `META_BUSINESS_PORTFOLIO_ID` | Opcional | Business portfolio dueño de la app (hoy hay un fallback hardcodeado en `client-accounts/route.ts` — conviene setearlo) |

---

## 4. Configuración en Meta App Dashboard

1. **Producto WhatsApp** agregado a la app.
2. **Embedded Signup** configurado → obtener el `config_id` → `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID`.
   - En "Facebook Login for Business" crea una **configuración** con permisos
     `whatsapp_business_management` + `whatsapp_business_messaging` (+ `business_management`).
3. **Dominios permitidos**: agrega el dominio de producción (y preview) en la configuración
   del login para que `FB.login` no falle por origen no autorizado.
4. **Webhooks**: en el objeto elegido (ver §2), configura Callback URL + Verify Token y
   suscribe los campos `messages` y `message_template_status_update`.
5. **CSP**: ya permitida en `next.config.ts` (`connect.facebook.net`, `www.facebook.com` en
   `script-src`/`frame-src`). No requiere cambios.

---

## 5. Requisitos de Meta para PRODUCCIÓN (no solo dev)

Investigado contra la documentación vigente de Meta (2025-2026):

1. **Enrolarse como Tech Provider** — obligatorio para cualquier ISV/SaaS que ofrezca el canal
   de WhatsApp a sus clientes. Meta puso como fecha límite **31 de diciembre de 2025**. Sin esto
   no se puede onboardear clientes en producción.
2. **Business Verification** del negocio dueño de la app.
3. **App Review + Advanced Access** para `whatsapp_business_messaging` y
   `whatsapp_business_management`. En modo Live, el Embedded Signup solo muestra permisos con
   Advanced Access aprobado.
   - La revisión pide **dos videos**: (a) un mensaje creado y enviado desde la app y recibido en
     el cliente de WhatsApp, (b) la app creando un template. El endpoint `test-call`
     (`hello_world`) existe precisamente para generar la evidencia del punto (a).
4. **Alta del número**: two-step verification con PIN de 6 dígitos (`/register` → ya implementado
   en `phone-numbers/register`). El número no puede estar activo en la app normal de WhatsApp
   salvo que se use el flujo de coexistencia.
5. **Display name review** del número (nombre verificado).
6. **Mensajería**: fuera de la ventana de servicio de 24h solo se pueden enviar **templates
   aprobados** (categorías Marketing/Utility/Auth). `sendWaTemplate` ya lo cubre; falta una UI
   para redactar/enviar templates proactivos si se quiere esa función.

---

## 6. Checklist de habilitación

**En código (ya resuelto):** UI Embedded Signup · code→token · suscripción al WABA · cifrado ·
webhook con HMAC fail-closed · entrantes→inbox · saliente desde inbox · registro con PIN ·
test-call · listado/enlace de líneas por proyecto · CSP.

**Pendiente (acción humana):**
- [ ] Enrolar el negocio como **Tech Provider** en Meta (deadline pasado — hacer ya).
- [ ] **Business Verification** aprobada.
- [ ] **App Review**: Advanced Access de `whatsapp_business_messaging` + `whatsapp_business_management` (grabar los 2 videos; usar test-call).
- [ ] Crear el **Embedded Signup config** y copiar `config_id`.
- [ ] Setear las **env vars** de §3 en Vercel (prod + preview).
- [ ] Registrar **un** webhook según §2 y suscribir `messages` + `message_template_status_update`.
- [ ] Agregar los **dominios** de prod/preview a la config del login.
- [ ] Probar E2E: conectar por Embedded Signup → registrar número (PIN) → enlazar a proyecto →
      test-call → responder un entrante desde el inbox.

---

## 7. Observaciones de código (no bloquean; mejoras)

- **Versión de Graph API inconsistente**: `lib/whatsapp.ts`, `phone-numbers`, `test-call` usan
  `v20.0`; `connect/whatsapp` y `client-accounts` usan `v25.0`; el SDK inicializa `v25.0`. `v20.0`
  sigue soportada, pero conviene unificar en una sola constante (p. ej. `META_API_VERSION`).
- **Redundancia de webhooks**: `webhooks/whatsapp` y `webhooks/meta` procesan lo mismo; solo uno
  recibe eventos (§2). Considerar consolidar en `webhooks/meta` + portar el auto-reply.
- **`META_BUSINESS_PORTFOLIO_ID` con fallback hardcodeado** en `client-accounts/route.ts`
  (`"3745887835629895"`) — setear la env y quitar el literal.
- **Auto-reply** solo activo en el webhook dedicado y requiere una `DmAutomationRule` con
  `whatsapp` en `platforms` (no hay UI dedicada para crearlas aún).

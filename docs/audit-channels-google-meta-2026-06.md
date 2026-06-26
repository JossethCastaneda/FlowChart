# Auditoría de Integraciones de Canales — Google & Meta (2026-06-26)

> Auditoría como experto en integraciones de canales SaaS. Dos planos: **(A) estado real conectado**
> (DB `Integration`, solo metadatos — nunca valores de token) y **(B) seguridad del código** (OAuth
> state/CSRF, cifrado, ciclo de vida de tokens, scopes, cumplimiento). Solo lectura.

---

## A. Estado real conectado (15 integraciones)

| Provider | Conn | Token | Refresh | Pages | Expiry | Notas |
|---|:--:|:--:|:--:|--:|---|---|
| `meta` | 🟢 | enc | no¹ | 58 | 55d (ISO) | genérico (fallback multi-módulo) |
| `meta_ads` | 🟢 | enc | no¹ | 58 | 55d | refrescado 06-22 |
| `meta_community` | 🟢 | enc | no¹ | 1 | 59d | refrescado 06-25 |
| `meta_analytics` | ⚪ | enc | no¹ | 57 | 43d | **DESCONECTADO**, refresh más viejo (06-09) |
| `facebook` | 🟢 | enc | no | 0 | — | publisher/login per-módulo |
| `whatsapp_business` | 🟢 | enc | no | 0 | — | |
| `google` | 🟢 | enc | **yes** | 0 | epoch-millis | refresh token presente ✅ |
| `tiktok_ads` | 🟢 | enc | yes | 0 | **~0d (EXPIRADO)** | fuera de foco; sin cron de refresh (stub) |
| `botmaker` ×4, `ads`, `custom_crm` | 🟢 | enc | — | — | — | otros canales |

¹ Meta NO usa refresh tokens — usa intercambio de token de larga vida (`fb_exchange_token`). `refresh=no` es **correcto** para Meta.

**Hallazgos del estado:**
- ✅ **Los 15 tokens cifrados (`enc:`) — CERO en texto plano.** Cumple la remediación de seguridad.
- ✅ El **refresh cron de Meta funciona** (tokens refrescados 06-22 / 06-25, <60d de expiración).
- ✅ Google tiene **refresh token** → puede auto-refrescar.
- 🟠 `meta_analytics` **desconectado** con 57 page-tokens y expiración a 43d. Mientras esté desconectado, el
  cron lo salta (`where connected:true`). Si fue desconexión accidental, sus assets quedan obsoletos.
- 🟠 **`tiktok_ads` expirado** (~0d) y sin cron de refresh (los clientes ad-network son stubs). Fuera del foco
  Google/Meta, pero es un canal "conectado" que en realidad ya no funciona.

---

## B. Seguridad del código OAuth

### B.1 CSRF / state — patrón stateless HMAC (sin modelo `OAuthState`)
Ambos providers firman el `state` con HMAC-SHA256(payload, AUTH_SECRET) y lo verifican en el callback.
No hay almacenamiento server-side del state (stateless) — válido y seguro contra CSRF/tampering.

| Control | Meta (`/api/connect/callback`) | Google (`/api/oauth/google/callback`) |
|---|:--:|:--:|
| HMAC del state | ✅ `timingSafeEqual` (constante) | 🟠 `!==` (no constant-time) |
| Sesión activa (JWT) requerida | ✅ `getToken` | ❌ **no verifica sesión** |
| **state ligado al usuario logueado** | ✅ `state.userId === jwt.sub` | ❌ **no liga** (solo RBAC) |
| RBAC re-validado (OWNER/ADMIN) | ✅ | ✅ |
| Replay/TTL del state | 🟠 `nonce` sin verificar, sin TS | 🟠 `nonce` sin verificar, sin TS |

**🔴 Asimetría de seguridad (la más importante):** el callback de **Google NO liga el state a la sesión
activa** — no comprueba que el usuario logueado en el callback sea el `state.userId`, como sí hace Meta.
Google solo confía en la firma HMAC + RBAC. Un `state` filtrado (referer leak, historial, etc.) podría
permitir completar una conexión a nombre de otro. **Recomendación:** añadir a Google la misma verificación
`getToken` + `state.userId === jwt.sub` que ya tiene Meta, y usar `timingSafeEqual`.

**🟠 Sin replay protection en ninguno:** el `nonce` del payload no se contrasta ni hay timestamp/TTL. El
`code` de un solo uso limita el riesgo, pero la buena práctica es firmar un `iat` y rechazar states viejos.

### B.2 Manejo de tokens
- ✅ **Cifrado en reposo** (`encryptToken`) de user-token, refresh-token (Google) y page-tokens (Meta).
- ✅ **Meta: USER token para Graph API, NO page tokens** (explícito). Page tokens raw solo en memoria para
  suscribir webhooks; nunca se persisten ni se devuelven al cliente. ✅ Excelente.
- ✅ **Google: preserva el refresh_token** si Google no lo reenvía (solo viene en el primer consent).
- ✅ **Token genérico `meta`: lógica anti-pérdida de scopes** — no sobrescribe con un módulo de menos scopes;
  une `grantedScopes`. Sofisticado y correcto.
- 🟠 **Expiry: formato INCONSISTENTE entre providers.** Meta guarda `expiresAt` como **ISO string**; Google
  como **epoch-millis (number)**. Riesgo si algún código compartido de "expiring soon" asume un formato
  (confirmado en datos: el de Google se imprime como número crudo).
- 🟠 **Meta: `expiresAt` HARDCODEADO a `now+60d`** (`connect/callback:252`) en vez de leer el `expires_in`
  real del token de larga vida. Google sí lee `expires_in`. Si Meta devuelve otra validez, la expiración
  almacenada es inexacta → el cron "expira en <7d" puede dispararse mal.

### B.3 Refresh de tokens (Meta) — DUPLICADO (cruza con la auditoría full-stack)
Dos implementaciones del refresh de token Meta:
- `app/api/meta/refresh-token` (agendado en `vercel.json`): maduro (`verifyCronAuth`, `maxDuration=300`,
  notifica admins en expiry, maneja code 190 → `connected:false`). **Solo refresca el USER token.**
- `app/api/cron/meta/refresh-tokens` (HUÉRFANO, no agendado): inferior, con resto de QStash
  (`x-qstash-token`), pero **también refresca PAGE tokens**. No corre ⇒ duplicado muerto.
- 🟠 **Page tokens nunca se refrescan por el cron activo.** Los page-tokens derivados de un user-token de
  larga vida no expiran mientras el user-token sea válido, así que en práctica está OK — PERO si un
  user-token se invalida (revocación, cambio de password), los 57-58 page-tokens quedan inservibles y no hay
  re-fetch hasta una reconexión manual. **Decisión:** unificar (portar el refresh de pages al cron maduro).

### B.4 Scopes (mínimos por módulo)
- ✅ **Meta: `config_id` por módulo** (Facebook Login for Business) → scopes mínimos por sección; validación
  `validateModulePermissions(module, userScopes)` en el callback; `grantedScopes` registrado.
- ✅ **Google Hub: scopes incrementales** por módulo (ga4/gsc/gtm/ads/bigquery), `include_granted_scopes`.
- ✅ Patrón correcto de "conexión sección por sección con consentimiento explícito" (modelo comercial).

### B.5 Cumplimiento (compliance)
- ✅ **Webhooks Meta**: verificación `x-hub-signature-256` con `timingSafeEqual`, **fail-closed**.
- ✅ **Revoke al desconectar — AMBOS providers**: Google `POST oauth2.googleapis.com/revoke`; Meta
  `DELETE /me/permissions` (invalida el token), best-effort + wipe local.
- ✅ **Meta data deletion**: `lib/meta-data-deletion.ts` + `app/api/meta/deauthorize/route.ts` (requisito de
  Meta App Review).
- ✅ **Sin fallback al token de login** (`getMetaAccessToken`: "SIN fallback al JWT") — login = solo identidad.
- 🟢 Detalle: comentario obsoleto en `lib/server-auth.ts:45` aún menciona "3. JWT accessToken — fallback"
  que el código ya eliminó (línea 98). Limpiar para no confundir.

---

## C. Recomendaciones priorizadas

| # | Prioridad | Acción |
|--:|---|---|
| 1 | 🔴 Alta | **Endurecer el callback de Google**: verificar sesión activa (`getToken`) + `state.userId === jwt.sub` (como Meta), y `timingSafeEqual`. Cierra la asimetría CSRF. |
| 2 | 🟠 Media | **Unificar el formato de `expiresAt`** (elegir ISO o epoch-millis) en Meta y Google; leer el `expires_in` real en Meta en vez de hardcodear 60d. |
| 3 | 🟠 Media | **Resolver el refresh de tokens Meta duplicado** y decidir el refresh de **page-tokens** (portarlo al cron maduro). |
| 4 | 🟠 Media | Revisar `meta_analytics` desconectado (reconectar o limpiar) y `tiktok_ads` expirado (o marcar el canal como no-funcional en la UI). |
| 5 | 🟢 Baja | Añadir `iat`/TTL al payload del state (replay protection) en ambos providers. Limpiar el comentario obsoleto de `server-auth.ts:45`. |

---

### Apéndice — método
- Consulta read-only a `Integration` (solo metadatos: provider/connected/expiry/has-refresh/token-enc/pages/scopes; **nunca** valores de token).
- Lectura directa: `app/api/oauth/google/callback`, `app/api/connect/callback`, `app/api/connect/disconnect`,
  `app/api/webhooks/meta`, `lib/integrations/google/oauth.ts`, `lib/server-auth.ts`, `lib/integrations/README.md`.
- Cruce con `docs/audit-fullstack-2026-06.md` (duplicado de refresh de token Meta).

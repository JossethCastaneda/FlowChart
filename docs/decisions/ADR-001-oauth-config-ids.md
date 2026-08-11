---
tags: [ADR, OAuth, Meta, seguridad]
status: activo
date: 2026-08
---

# ADR-001: Multi config_id de Meta OAuth

## Estado

✅ **Activo** — Implementado en `lib/server-auth.ts` y `lib/meta-scopes.ts`.

## Contexto

Las integraciones con Meta (Facebook + Instagram) requieren distintos conjuntos de permisos (scopes) según el módulo que los usa:
- El **Inbox** necesita permisos de mensajería.
- Los **Anuncios** necesitan acceso a cuentas de anuncio.
- El **Publisher** necesita permisos de publicación de contenido.
- **Analytics** necesita permisos de lectura de insights.

La alternativa más simple sería usar un único `config_id` con todos los scopes. Sin embargo, Meta requiere justificación por cada scope, y solicitar todos aumenta el riesgo de rechazo y expone más superficie de ataque si un token es comprometido.

## Decisión

Cada módulo usa su propio `config_id` de Facebook con **scopes mínimos** (principio de mínimo privilegio).

```
/api/connect/[module]  → OAuth con config_id específico
                          (state firmado con HMAC + nonce para prevenir CSRF)
/api/connect/callback  → code → token corto → token largo (~60d)
                          → cifrado con AES-256-GCM → guardado en tabla Integration
getMetaAccessToken()   → resuelve: meta_<module> → meta (genérico) → JWT fallback
```

## Consecuencias

**Positivas:**
- Menor superficie de ataque por token.
- Facilita la aprobación de Meta por scopes (justificación más clara por módulo).
- Un token comprometido no expone otros módulos.
- Posibilidad de revocar el acceso a un módulo específico sin afectar a los demás.

**Negativas:**
- Requiere configurar múltiples apps / config_ids en Meta Business.
- El fallback `meta (genérico)` crea un token "comodín" que aún necesita todos los scopes genéricos.
- Complejidad adicional en `getMetaAccessToken()` con la lógica de resolución en cascada.

## Alternativas descartadas

- **Un único `config_id`:** Rechazado por sobreexposición de scopes y dificultad de aprobación.
- **Token por usuario:** Rechazado por complejidad de rotación y mayor superficie de ataque.

## Relacionado

- [[../architecture/multi-tenant|Modelo Multi-Tenant]]
- [[../architecture/stack|Stack]]
- [[README|← Decisiones]]

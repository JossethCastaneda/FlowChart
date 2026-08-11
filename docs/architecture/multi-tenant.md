---
tags: [arquitectura, multi-tenant, seguridad]
---

# Modelo Multi-Tenant

FlowChart es una aplicación **multi-tenant** donde cada cliente opera en su propio `Workspace` completamente aislado.

## Jerarquía de entidades

```
Workspace
├── WorkspaceMember (roles: OWNER / ADMIN / MEMBER)
├── WorkspaceInvite
├── Project (= cliente dentro del workspace)
│   ├── MetaSource (cuentas de anuncio, páginas de Facebook, IG)
│   ├── ProjectMember
│   └── ProjectAlert
└── [todos los datos de negocio llevan workspaceId]
```

## Aislamiento

- **Cada consulta de API está filtrada por `workspaceId`** obtenido de la sesión autenticada.
- El patrón de acceso es: `withAuth` → `withWorkspace` → `withWorkspaceRole`.
- Las cachés de Meta Ads (`metaAdsCache`) llevan `workspaceId` en su clave compuesta.
- Los tokens de integración están **cifrados en reposo** con AES-256-GCM (`lib/encryption.ts`).

## OAuth y credenciales

Cada módulo tiene su propio `config_id` de Facebook con scopes mínimos:

```
/api/connect/[module]  → OAuth con config_id específico (state firmado HMAC + nonce)
/api/connect/callback  → code → token corto → token largo (~60d) → guarda en Integration (cifrado)
getMetaAccessToken()   → resuelve: meta_<module> → meta (genérico) → JWT fallback
```

Las llamadas a Graph API usan **Bearer header**, nunca `access_token` en la URL.

## Roles

| Rol | Permisos |
|-----|---------|
| `OWNER` | Control total del workspace |
| `ADMIN` | Gestión de miembros e integraciones |
| `MEMBER` | Acceso de lectura/escritura a módulos según proyecto |

## Relacionado

- [[../decisions/ADR-001-oauth-config-ids|ADR-001: Multi config_id de Meta OAuth]]
- [[../generated/entities-index|Entidades del dominio (generado)]]
- [[README|← Arquitectura]]

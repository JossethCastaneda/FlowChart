# Regla: Secretos y entorno

## Variables de entorno

**NUNCA** leas, imprimas, o modifiques:

- `.env.production.real`
- `.env.test.vercel`
- Cualquier archivo `.env*` con credenciales reales

## Servicios remotos

**NUNCA** modifiques directamente:

- Panel de Vercel (variables de entorno, configuración del proyecto)
- Consola de Neon (base de datos)
- Credenciales de API (Meta, Google, TikTok)

…sin confirmación explícita del usuario.

## Claves en el código

- No hardcodees API keys, tokens, o secrets en el código fuente.
- Usa `process.env.VARIABLE_NAME` y documenta las variables necesarias en `.env.example`.
- El test de guardia `tests/no-secrets.test.ts` valida que no hay credenciales embebidas.

## Encryption

Todos los tokens de integración (Meta, Google, TikTok) se almacenan cifrados
con AES-256-GCM usando `ENCRYPTION_KEY`. Nunca almacenes tokens en texto plano.

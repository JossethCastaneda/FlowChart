# RUNBOOK — FlowChart

Tres preguntas, nada más.

---

## 1. ¿Cómo se despliega?

La integración autorizada se prepara exclusivamente en `staging`; ningún agente
empuja o mezcla directamente en `main`. Antes de commit/push/merge se presenta
el diff y se espera aprobación humana.

**Pre-deploy checklist:**

```bash
npx tsc --noEmit            # 0 errores
npx vitest run               # todos pasan
npm run build               # no muta el esquema
```

**Variables de entorno:** Vercel → Settings → Environment Variables. Hay 48
variables. Las críticas son:

| Variable | Servicio | Impacto si falta |
|---|---|---|
| `DATABASE_URL` | Neon (PostgreSQL) | App no arranca |
| `NEXTAUTH_SECRET` | NextAuth | Login roto |
| `META_APP_ID` | Meta Graph API | OAuth + Inbox rotos |
| `ENCRYPTION_KEY` | AES-256-GCM | Tokens ilegibles |

**Build command en Vercel:** `npm run build` (genera Prisma y compila Next.js).
El build no aplica cambios de esquema.

Los cambios de base siguen: migración versionada → clone aislado
`MIGRATION_TEST_DB_URL` → revisión → gate humano → deploy explícito → verificación
read-only. Nunca se usa sincronización implícita ni aceptación de pérdida de datos.

---

## 2. ¿Cómo se restaura la base de datos?

**Proveedor:** Neon (PostgreSQL serverless).
**Panel:** https://console.neon.tech

### Restauración desde branch (< 24h):

1. Ir a Neon Console → proyecto → Branches
2. Crear un branch desde el punto en el tiempo deseado (Neon guarda 24h de WAL)
3. Apuntar `DATABASE_URL` al nuevo branch
4. Redesplegar en Vercel

### Restauración desde backup (> 24h):

1. Neon tiene backups automáticos diarios (retención 7 días en plan Pro)
2. Neon Console → Backups → seleccionar fecha → Restore
3. Verificar datos en el branch restaurado
4. Apuntar `DATABASE_URL` y redesplegar

### Si la base está corrupta pero el esquema no:

```bash
# Verificar esquema vs código
npx prisma db pull --print  # imprime el esquema sin sobrescribir schema.prisma
npx prisma validate    # valida contra schema.prisma
```

---

## 3. ¿A quién se avisa?

| Rol | Contacto | Cuándo avisar |
|---|---|---|
| Dueño / Dev principal | Josseth Castañeda (`jtrejo.lid.mkt@gmail.com`) | Siempre |
| Vercel (status) | https://vercel-status.com | Deploy falla |
| Neon (status) | https://neonstatus.com | DB inaccesible |
| Meta (status) | https://metastatus.com | Webhooks/API rotos |

**Escalamiento:**
- Si la app no carga → revisar Vercel Logs
- Si la DB no responde → revisar Neon Console
- Si los webhooks no llegan → revisar Meta App Dashboard → Webhooks

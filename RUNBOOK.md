# RUNBOOK — FlowChart

Tres preguntas, nada más.

---

## 1. ¿Cómo se despliega?

```
git push origin <rama>:main
```

Vercel detecta el push a `main` y despliega automáticamente (~2 minutos).

**Pre-deploy checklist:**

```bash
npx tsc --noEmit            # 0 errores
npx vitest run               # todos pasan
SKIP_DB_SYNC=1 npx next build  # build exitoso
```

**Variables de entorno:** Vercel → Settings → Environment Variables. Hay 48
variables. Las críticas son:

| Variable | Servicio | Impacto si falta |
|---|---|---|
| `DATABASE_URL` | Neon (PostgreSQL) | App no arranca |
| `NEXTAUTH_SECRET` | NextAuth | Login roto |
| `META_APP_ID` | Meta Graph API | OAuth + Inbox rotos |
| `ENCRYPTION_KEY` | AES-256-GCM | Tokens ilegibles |

**Build command en Vercel:** `npm run build` (ejecuta `db-sync.mjs` + `next build`).
Si el esquema de Prisma cambió, `db-sync` aplica `prisma db push` automáticamente.

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
npx prisma db pull     # lee el esquema de la DB
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

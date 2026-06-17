import { z } from "zod";

const envSchema = z.object({
  // Entorno de ejecución
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  
  // Base URLs
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_FRONTEND_URL: z.string().url().optional(),

  // Auth (NextAuth)
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1),
  AUTH_SECRET: z.string().min(1).optional(),

  // Base de Datos
  // DATABASE_URL puede llegar vacía desde Vercel (la Neon integration usa
  // STORAGE_DATABASE_URL). La validamos solo si existe y no está vacía.
  DATABASE_URL: z.string().url().optional().or(z.literal("")),
  DATABASE_URL_UNPOOLED: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),
  // Neon via Vercel Storage integration
  STORAGE_DATABASE_URL: z.string().url().optional(),
  STORAGE_POSTGRES_PRISMA_URL: z.string().url().optional(),
  STORAGE_DATABASE_URL_UNPOOLED: z.string().url().optional(),

  // Meta (Facebook / Instagram)
  // Opcionales: NO todos los entornos (p. ej. Preview) tienen estos secretos.
  // parseEnv corre al importar y, si fueran obligatorios, romperían el build de
  // Preview ("Failed to collect page data"). Todos los usos ya manejan ausencia
  // (env.FACEBOOK_CLIENT_ID || "" / guards if(!x)). Coincide con el resto de
  // vars de Meta, ya opcionales.
  FACEBOOK_CLIENT_ID: z.string().min(1).optional(),
  FACEBOOK_CLIENT_SECRET: z.string().min(1).optional(),
  META_API_VERSION: z.string().default("v25.0"),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(1).optional(),

  // Meta Config IDs
  FACEBOOK_LOGIN_CONFIG_ID: z.string().min(1).optional(),
  FACEBOOK_PUBLISHER_FB_CONFIG_ID: z.string().optional(),
  FACEBOOK_PUBLISHER_IG_CONFIG_ID: z.string().optional(),
  FACEBOOK_SOCIAL_CONFIG_ID: z.string().optional(),
  FACEBOOK_ADS_CONFIG_ID: z.string().optional(),
  FACEBOOK_ANALYTICS_CONFIG_ID: z.string().optional(),
  FACEBOOK_COMMUNITY_CONFIG_ID: z.string().optional(),

  // Instagram directo
  INSTAGRAM_APP_ID: z.string().min(1).optional(),
  INSTAGRAM_APP_SECRET: z.string().min(1).optional(),
  INSTAGRAM_REDIRECT_URI: z.string().url().optional(),
  INSTAGRAM_SCOPES: z.string().default([
    "instagram_business_basic",
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
    "instagram_business_content_publish",
    "instagram_business_manage_insights",
  ].join(",")),
  INSTAGRAM_TOKEN_URL: z.string().url().default("https://api.instagram.com/oauth/access_token"),

  // Google
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  // Seguridad
  ENCRYPTION_KEY: z.string().length(64).or(z.string().length(32)),
  CRON_SECRET: z.string().optional(),
  PUBLISH_WORKER_SECRET: z.string().optional(),

  // QStash (Upstash) — cola de publicación programada
  QSTASH_TOKEN: z.string().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
  // URL pública estable a la que QStash entrega el job (la de Production).
  // Si falta, se deriva de NEXT_PUBLIC_APP_URL.
  QSTASH_WORKER_BASE_URL: z.string().url().optional(),

  // Vercel Blob
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),


  // Config extra
  APP_TIMEZONE: z.string().default("America/Mexico_City"),
});

/**
 * Parsea y valida el entorno en base al esquema.
 * Falla rápido en el inicio del servidor si falta alguna variable crítica.
 */
function parseEnv() {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    // DB vars may be missing in Vercel (they come as STORAGE_*) — warn but don't crash.
    // All other missing vars are fatal.
    const dbVars = new Set(['DATABASE_URL', 'STORAGE_DATABASE_URL', 'STORAGE_POSTGRES_PRISMA_URL']);
    const fatalErrors = Object.entries(errors).filter(([k]) => !dbVars.has(k));
    if (fatalErrors.length > 0) {
      console.error("❌ Faltan variables de entorno críticas o son inválidas:", Object.fromEntries(fatalErrors));
      throw new Error("Invalid environment variables");
    }
    // DB warnings only
    const dbErrors = Object.entries(errors).filter(([k]) => dbVars.has(k));
    if (dbErrors.length > 0) {
      console.warn("[env] DB env vars may be missing — Prisma will use STORAGE_* fallbacks:", Object.fromEntries(dbErrors));
    }
    // Return partial data (db fields will be undefined, handled in prisma.ts)
    return (parsed as any).error?.issues ? (envSchema.partial().parse(process.env) as any) : parsed.data;
  }
  
  return parsed.data;
}

export const env = parseEnv();

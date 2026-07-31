import { z } from "zod";

// ---------------------------------------------------------------------------
// Vercel sets empty env vars as "" instead of leaving them undefined.
// Zod's .optional() only accepts undefined, not "". So "" values fail
// validation for .url(), .min(1), etc. and crash the entire server.
// Fix: strip all "" values to undefined BEFORE Zod sees them.
// ---------------------------------------------------------------------------
function cleanEnv(raw: Record<string, string | undefined>): Record<string, string | undefined> {
  const cleaned: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    let cleanVal = value;
    // Remove literal '""' that Vercel might inject
    if (cleanVal === '""') cleanVal = "";

    if (cleanVal === "") {
      cleaned[key] = undefined;
      // CRITICAL: NextAuth and other libraries read directly from process.env.
      // If NEXTAUTH_URL is "", next-auth does new URL("") and throws ERR_INVALID_URL.
      delete process.env[key];
    } else {
      cleaned[key] = cleanVal;
      // Ensure process.env matches the cleaned value (in case we stripped quotes)
      if (cleanVal !== undefined) {
        process.env[key] = cleanVal;
      }
    }
  }

  return cleaned;
}

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

  // Base de Datos — all optional because Vercel/Neon may provide them under
  // different names (STORAGE_*). Resolution happens in lib/prisma.ts.
  DATABASE_URL: z.string().url().optional(),
  DATABASE_URL_UNPOOLED: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),
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
  META_APP_ID: z.string().min(1).optional(),
  META_APP_SECRET: z.string().min(1).optional(),
  META_API_VERSION: z.string().default("v25.0"),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(1).optional(),

  // WhatsApp Business Cloud API (webhook de la app; los tokens por-workspace viven
  // cifrados en Integration, no aquí). Antes se leían con process.env directo.
  WHATSAPP_APP_SECRET: z.string().min(1).optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().min(1).optional(),
  META_SYSTEM_USER_TOKEN: z.string().min(1).optional(),
  META_BUSINESS_PORTFOLIO_ID: z.string().min(1).optional(),

  // Meta Config IDs
  FACEBOOK_LOGIN_CONFIG_ID: z.string().min(1).optional(),
  FACEBOOK_PUBLISHER_FB_CONFIG_ID: z.string().optional(),
  FACEBOOK_PUBLISHER_IG_CONFIG_ID: z.string().optional(),
  FACEBOOK_SOCIAL_CONFIG_ID: z.string().optional(),
  FACEBOOK_ADS_CONFIG_ID: z.string().optional(),
  FACEBOOK_ANALYTICS_CONFIG_ID: z.string().optional(),
  MESSENGER_CONFIG_ID: z.string().optional(),

  // Instagram directo
  INSTAGRAM_APIKEY_CONNECT: z.string().min(1).optional(),
  INSTAGRAM_SECRET_CONNECT: z.string().min(1).optional(),
  INSTAGRAM_REDIRECT_CONNECT: z.string().url().optional(),
  INSTAGRAM_SCOPES: z.string().default([
    "instagram_business_basic",
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
    "instagram_business_content_publish",
    "instagram_business_manage_insights",
  ].join(",")),
  INSTAGRAM_TOKEN_URL: z.string().url().default("https://api.instagram.com/oauth/access_token"),

  // Google (Connect)
  GOOGLE_APIKEY_CONNECT: z.string().min(1).optional(),
  GOOGLE_SECRET_CONNECT: z.string().min(1).optional(),

  // Google (Login)
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  // Seguridad — AES-256-GCM requiere 32 bytes = 64 hex chars (ver lib/encryption.ts,
  // que rechaza cualquier longitud != 64). Una clave de 32 hex (AES-128) es inválida
  // para createCipheriv("aes-256-gcm"), así que la validación exige exactamente 64.
  ENCRYPTION_KEY: z.string().length(64),
  CRON_SECRET: z.string().optional(),
  PUBLISH_WORKER_SECRET: z.string().optional(),


  // Vercel Blob
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),

  // Google Ads
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().min(1).optional(),

  // Análisis de Resultados — sal para hashear PII (teléfono/email)
  ANALYTICS_PII_SALT: z.string().min(1).optional(),



  // TikTok Ads
  // App ID  = numeric integer shown in "App details" (used in auth URL)
  // Client Key = alphanumeric string (used in token exchange)
  TIKTOK_ADS_APP_ID: z.string().min(1).optional(),
  TIKTOK_ADS_CLIENT_ID: z.string().min(1).optional(),
  TIKTOK_ADS_CLIENT_SECRET: z.string().min(1).optional(),
  TIKTOK_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Config extra
  APP_TIMEZONE: z.string().default("America/Mexico_City"),
});

/**
 * Parsea y valida el entorno en base al esquema.
 * Falla rápido en el inicio del servidor si falta alguna variable crítica.
 */
type Env = z.infer<typeof envSchema>;

// El tipo de retorno se ANOTA explícitamente como Env: así el acceso `env.X` queda
// type-checkeado en toda la app. (Antes la rama de build hacía `return cleaned as any`,
// lo que ensanchaba el tipo inferido de `env` a `any` y anulaba la type-safety de env.)
function parseEnv(): Env {
  // Strip empty strings → undefined so Zod .optional() works correctly.
  const cleaned = cleanEnv(process.env as Record<string, string | undefined>);
  const parsed = envSchema.safeParse(cleaned);

  if (!parsed.success) {
    const isBuild = process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE === "phase-production-build";
    if (isBuild) {
      console.warn("️ Saltando validación estricta de entorno durante el build:", parsed.error.flatten().fieldErrors);
      // Cast localizado SOLO en el skip de build (las vars se validan en runtime).
      return cleaned as Env;
    }
    console.error(" Faltan variables de entorno críticas o son inválidas:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = parseEnv();

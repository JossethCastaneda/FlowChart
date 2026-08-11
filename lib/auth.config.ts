import type { NextAuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { resolveLoginConfigId } from "@/lib/meta-config";
import { logger } from "@/lib/logger";

const META_API_VERSION = process.env.META_API_VERSION || "v25.0";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
const isBuild = process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE === "phase-production-build";
if (!AUTH_SECRET && process.env.NODE_ENV === "production" && !isBuild) {
  throw new Error("[AUTH] NEXTAUTH_SECRET or AUTH_SECRET must be set in production");
}

// Build providers dynamically — only register if credentials are configured
const providers: NextAuthOptions["providers"] = [];

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      authorization: {
        url: `https://www.facebook.com/${META_API_VERSION}/dialog/oauth`,
        params: {
          // Facebook Login for Business requires config_id — without it,
          // the dialog shows "app needs at least one supported permission".
          // Resuelto vía FACEBOOK_CONFIG_AUTH (o legacy FACEBOOK_LOGIN_CONFIG_ID);
          // debe incluir email + public_profile.
          config_id: resolveLoginConfigId(),
          scope: "email,public_profile",
          auth_type: "rerequest",
          // override_default_response_type is required by Meta to honor config_id
          override_default_response_type: "true",
          display: "popup",
        },
      },
      // Custom userinfo: bypass openid-client's client.userinfo() which sends the
      // token in ways Facebook rejects (403). Instead, do a direct fetch to the
      // versioned Graph API with the token in the Authorization header — this
      // matches exactly what the working facebook-sdk provider does.
      userinfo: {
        url: `https://graph.facebook.com/${META_API_VERSION}/me`,
        params: { fields: "id,name,email,picture.type(large)" },
        async request({ tokens }: { tokens: { access_token?: string } }) {
          const url = `https://graph.facebook.com/${META_API_VERSION}/me?fields=id,name,email,picture.type(large)`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error(`[AUTH facebook userinfo] ${res.status} ${res.statusText}`, text.slice(0, 200));
            
            try {
              const errData = JSON.parse(text);
              if (errData?.error?.code === 4 || errData?.error?.message?.includes("request limit")) {
                throw new Error("MetaRateLimit");
              }
            } catch (e) {
              if (e instanceof Error && e.message === "MetaRateLimit") throw e;
              // JSON parse failed or not a rate limit error
            }
            
            throw new Error(`Facebook userinfo failed: ${res.status} ${res.statusText}`);
          }
          return await res.json();
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      profile(profile: Record<string, any>) {
        return {
          id: profile.id,
          name: profile.name ?? null,
          email: profile.email ?? null,
          image: profile.picture?.data?.url ?? null,
        };
      },
    })
  );
}


// Google — requires standard GOOGLE_CLIENT_ID
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "select_account",
        },
      },
    })
  );
}

// Email + Password (always available)
providers.push(
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, req) {
      if (!credentials?.email || !credentials?.password) return null;

      // Throttling de fuerza bruta: por IP (global) y por IP+email (dirigido).
      const { rateLimit } = await import("@/lib/ratelimit");
      const ip =
        (req?.headers?.["x-vercel-forwarded-for"] as string | undefined) ||
        (req?.headers?.["x-forwarded-for"] as string | undefined)
          ?.split(",")[0]
          ?.trim() || "unknown";
      const email = credentials.email.toLowerCase().trim();
      const perIp = await rateLimit(`login:ip:${ip}`, 30, 5 * 60_000);
      const perTarget = await rateLimit(`login:${ip}:${email}`, 10, 5 * 60_000);
      if (!perIp.ok || !perTarget.ok) {
        console.warn(`[AUTH] Login rate limit exceeded for ${ip}`);
        throw new Error("RATE_LIMIT_EXCEEDED");
      }

      const { default: prisma } = await import("@/lib/prisma");
      const user = await prisma.user.findUnique({
        where: { email },
      });
      if (!user?.password) return null;
      const valid = await bcrypt.compare(credentials.password, user.password);
      if (!valid) return null;
      return { id: user.id, name: user.name, email: user.email, image: user.image };
    },
  })
);

// Facebook SDK — valida el accessToken client-side con la Graph API
// y crea/vincula el usuario en DB. Usado por el popup de FB.login() en /login.
providers.push(
  CredentialsProvider({
    id: "facebook-sdk",
    name: "Facebook SDK",
    credentials: {
      accessToken: { type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.accessToken) {
        console.error("[AUTH facebook-sdk] No access token provided.");
        return null;
      }
      try {
        const appId = process.env.FACEBOOK_CLIENT_ID;
        const appSecret = process.env.FACEBOOK_CLIENT_SECRET;
        if (!appId || !appSecret) {
          console.error("[AUTH facebook-sdk] Facebook app credentials missing in env.");
          return null;
        }

        // 1a. Validar que el token pertenece a nuestra app (debug_token)
        const appToken = `${appId}|${appSecret}`;
        const debugRes = await fetch(
          `https://graph.facebook.com/${META_API_VERSION}/debug_token?input_token=${encodeURIComponent(credentials.accessToken)}`,
          {
            headers: { Authorization: `Bearer ${appToken}` },
            signal: AbortSignal.timeout(6000),
          }
        );

        if (!debugRes.ok) {
          console.error("[AUTH facebook-sdk] debug_token API call failed.");
          return null;
        }

        const debugData = await debugRes.json();
        if (!debugData?.data?.is_valid || String(debugData.data.app_id) !== String(appId)) {
          console.error("[AUTH facebook-sdk] Token invalid or not issued to our app.");
          return null;
        }

        // Generar appsecret_proof para mayor seguridad
        const crypto = await import("crypto");
        const appsecretProof = crypto
          .createHmac("sha256", appSecret)
          .update(credentials.accessToken)
          .digest("hex");

        // 1b. Validar token con Meta y obtener perfil.
        // Token SOLO por header (nunca en query string) y versión de API fijada server-side.
        const res = await fetch(
          `https://graph.facebook.com/${META_API_VERSION}/me?fields=id,name,email,picture.type(large)&appsecret_proof=${appsecretProof}`,
          {
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
            signal: AbortSignal.timeout(6000),
          },
        );

        const fbUser = await res.json();

        if (!fbUser?.id || fbUser.error) {
          // Sin volcar la respuesta completa: solo código/tipo del error de Meta.
          console.error(
            "[AUTH facebook-sdk] Meta validation failed.",
            "status:", res.status,
            "code:", fbUser?.error?.code ?? null,
            "subcode:", fbUser?.error?.error_subcode ?? null,
          );
          const rateLimitCodes = [4, 17, 32, 613];
          if (
            rateLimitCodes.includes(fbUser?.error?.code) ||
            fbUser?.error?.message?.toLowerCase().includes("request limit")
          ) {
            throw new Error("MetaRateLimit");
          }
          return null;
        }

        const { default: prisma } = await import("@/lib/prisma");

        // 2. Buscar por cuenta de Facebook vinculada
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "facebook",
              providerAccountId: fbUser.id,
            },
          },
          include: { user: true },
        });

        let dbUser = existingAccount?.user ?? null;

        // 2b. Si no existe cuenta, verificar si existe un usuario legacy con id = fbUser.id
        if (!dbUser) {
          dbUser = await prisma.user.findUnique({
            where: { id: fbUser.id },
          }) ?? null;
        }

        // 3. Si no existe cuenta, buscar por email (sin loguear el email — PII)
        // Evitar ATO (Account Takeover) si el usuario ya tiene contraseña local
        if (!dbUser && fbUser.email) {
          const candidate = await prisma.user.findFirst({
            where: { email: { equals: fbUser.email, mode: "insensitive" } },
          });
          if (candidate?.password) {
            console.warn("[AUTH facebook-sdk] Email coincide con cuenta password — se rechaza auto-link");
            return null;
          }
          dbUser = candidate ?? null;
        }

        // 4. Crear usuario si no existe
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              name: fbUser.name ?? null,
              email: fbUser.email?.toLowerCase() ?? null,
              image: fbUser.picture?.data?.url ?? null,
            },
          });
        } else {
          // Completar campos vacíos
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              name: dbUser.name ?? fbUser.name ?? undefined,
              image: dbUser.image ?? fbUser.picture?.data?.url ?? undefined,
            },
          });
        }

        // 5. Garantizar que el Account record de Facebook exista
        if (!existingAccount) {
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: "facebook",
                providerAccountId: fbUser.id,
              },
            },
            update: { userId: dbUser.id },
            create: {
              userId: dbUser.id,
              type: "oauth",
              provider: "facebook",
              providerAccountId: fbUser.id,
            },
          });
        }

        logger.info("[AUTH] facebook-sdk authorization successful", { userId: dbUser.id });
        return {
          id: dbUser.id, // CUID de nuestra DB (no el ID de Facebook)
          name: dbUser.name,
          email: dbUser.email,
          image: dbUser.image,
        };
      } catch (err) {
        // Propagar el rate limit de Meta para que la UI muestre el mensaje
        // específico (signIn → result.error === "MetaRateLimit"). Antes este
        // catch lo convertía en null y el usuario veía un error genérico.
        if (err instanceof Error && err.message === "MetaRateLimit") {
          throw err;
        }
        console.error("[AUTH facebook-sdk] Unexpected error in authorize:", err);
        return null;
      }
    },
  })
);

// Cookie config for production.
// CRITICAL: authOptions is a static object evaluated at module-load time.
// NEXTAUTH_URL is set dynamically per-request in [...nextauth]/route.ts, so it
// is ALWAYS empty here. Do NOT check NEXTAUTH_URL.
// VERCEL_ENV === "production" is injected by Vercel at build time and is stable.
// On localhost, browsers reject __Secure- cookies over HTTP and ignore domain:,
// so enabling the production cookie config locally has no effect on dev sessions.
//
// COOKIE_DOMAIN: optional env var to set the cross-subdomain cookie domain.
// Set to ".flowchart.xyz" or ".zefirus.xyz" in Vercel to share cookies across
// subdomains of that apex. If unset, cookies are host-only (no domain attr),
// which works correctly on any single domain but does NOT share across subdomains.
// NOTE: do NOT include domain if the app lives at the apex only — host-only is safer.
const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined;

const productionCookies: NextAuthOptions["cookies"] =
  process.env.VERCEL_ENV === "production" && process.env.NODE_ENV !== "development"
    ? {
        sessionToken: {
          name: "__Secure-next-auth.session-token",
          options: {
            httpOnly: true,
            sameSite: "lax" as const,
            path: "/",
            secure: true,
            ...(cookieDomain ? { domain: cookieDomain } : {}),
          },
        },
        callbackUrl: {
          name: "__Secure-next-auth.callback-url",
          options: {
            sameSite: "lax" as const,
            path: "/",
            secure: true,
            ...(cookieDomain ? { domain: cookieDomain } : {}),
          },
        },
        csrfToken: {
          name: "__Secure-next-auth.csrf-token",
          options: {
            httpOnly: true,
            sameSite: "lax" as const,
            path: "/",
            secure: true,
            ...(cookieDomain ? { domain: cookieDomain } : {}),
          },
        },
      }
    : undefined;

export const authOptions: NextAuthOptions = {
  providers,
  secret: AUTH_SECRET,

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: { strategy: "jwt" },

  cookies: productionCookies,

  callbacks: {

    // ── signIn: Prevent duplicates by linking OAuth accounts to existing users ──
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
    async signIn({ user, account, profile, ..._rest }) {
      // Only intercept OAuth providers (not credentials/facebook-sdk which handle their own linking)
      if (!account || account.type === "credentials") return true;

      try {
        const { default: prisma } = await import("@/lib/prisma");

        // 1. Check if this provider account is already linked
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          include: { user: true },
        });

        if (existingAccount) {
          // Already linked — override user.id to the DB user's CUID so jwt callback
          // correctly resolves token.sub to our database user
          user.id = existingAccount.user.id;
          user.email = existingAccount.user.email;
          user.name = existingAccount.user.name || user.name;
          return true;
        }

        // 2. Try to find the currently logged-in user by decoding the JWT session cookie.
        //    This handles the "Vincular" (linking) flow from Settings where the user
        //    already has an active session and wants to add another OAuth provider.
        let sessionUser = null;
        try {
          const { cookies: reqCookies } = await import("next/headers");
          const { decode } = await import("next-auth/jwt");
          const cookieStore = await reqCookies();
          const sessionToken =
            cookieStore.get("__Secure-next-auth.session-token")?.value ||
            cookieStore.get("next-auth.session-token")?.value;

          if (sessionToken && AUTH_SECRET) {
            const decoded = await decode({
              token: sessionToken,
              secret: AUTH_SECRET,
            });
            if (decoded?.sub) {
              sessionUser = await prisma.user.findUnique({
                where: { id: decoded.sub },
              });
              if (sessionUser) {
                logger.debug("[AUTH] signIn: active session detected", { userId: sessionUser.id });
              }
            }
          }
        } catch (cookieErr) {
          // Cookie decoding may fail in edge runtime or during SSG — that's OK, we fall back
          console.debug("[AUTH signIn] Could not decode session cookie:", cookieErr);
        }

        // 3. If we have an active session, link the new OAuth account to the session user
        if (sessionUser) {
          // SEGURIDAD: login es SOLO identidad (modelo comercial). NO se persisten
          // access_token/refresh_token/id_token — nunca se usan para leer activos y su
          // almacenamiento en texto plano era una fuga si se filtraba la DB. Los activos
          // se conectan por-módulo (api/connect, api/oauth) con tokens cifrados.
          await prisma.account.create({
            data: {
              userId: sessionUser.id,
              type: account.type || "oauth",
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          });

          // Override user.id so the jwt callback uses the session user
          user.id = sessionUser.id;
          user.email = sessionUser.email;
          user.name = sessionUser.name || user.name;

          logger.info("[AUTH] signIn: linked provider to session user", { provider: account.provider, userId: sessionUser.id });
          return true;
        }

        // 4. No active session — check if a user with this email already exists (fresh login)
        const incomingEmail = (user.email || (profile?.email as string | undefined))?.toLowerCase();
        let existingUser = null;

        if (incomingEmail) {
          existingUser = await prisma.user.findFirst({
            where: { email: { equals: incomingEmail, mode: "insensitive" } },
          });
        }

        // SEGURIDAD: NO vincular por coincidencia de nombre. Un login de
        // Facebook sin email cuyo nombre coincida con un usuario existente
        // permitiría apropiarse de esa cuenta (crear un perfil FB homónimo
        // ocultando el email). Sin email verificable → usuario nuevo; la
        // vinculación a una cuenta existente se hace desde Perfil con sesión
        // activa (flujo "Vincular", paso 3 arriba).

        if (existingUser) {
          // Link the OAuth account to the existing user (solo identidad, sin tokens).
          await prisma.account.create({
            data: {
              userId: existingUser.id,
              type: account.type || "oauth",
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          });

          // Override user.id so the jwt callback uses the existing user
          user.id = existingUser.id;
          user.email = existingUser.email;
          user.name = existingUser.name || user.name;

          logger.info("[AUTH] signIn: linked provider to existing user", { provider: account.provider, userId: existingUser.id });
          return true;
        }

        // 6. No existing user found — let NextAuth create a new one
        return true;
      } catch (err) {
        console.error("[AUTH signIn] Error during account linking:", err);
        return true; // Don't block login on errors
      }
    },

    async jwt({ token, account, user, trigger, session }) {
      if (user) {
        // Marca de inicio de sesión estable (no cambia en refreshes rolling posteriores
        // porque `user` solo está presente al autenticar). Se compara con
        // User.passwordChangedAt para invalidar sesiones tras un cambio de contraseña.
        token.loginAt = Date.now();
        // Detect account linking: if token already has a sub (from existing session)
        // and it differs from the incoming OAuth user.id, we are linking!
        // Note: For OAuth, user.id is the provider's ID (e.g. Google ID), while token.sub is our CUID.
        const isLinking = token.sub && token.sub !== user.id;

        if (!isLinking) {
          try {
            const { default: prisma } = await import("@/lib/prisma");

            let dbUser;

            // 1. If we have an OAuth account, look up by providerAccountId first.
            //    This prevents creating duplicate users for OAuth providers that
            //    don't return an email (e.g. Facebook without email permission).
            if (account?.provider && account?.providerAccountId) {
              const existingAccount = await prisma.account.findUnique({
                where: {
                  provider_providerAccountId: {
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                  },
                },
                include: { user: true },
              });
              if (existingAccount) {
                dbUser = existingAccount.user;
              }
            }

            // 2. Look up by user.id directly in DB BEFORE falling through to email/create.
            //    This handles:
            //    a) CredentialsProvider (facebook-sdk) that resolves the DB user and returns
            //       user.id = the actual User.id (covers legacy users whose id is their FB numeric ID)
            //    b) Any OAuth flow where the returned user.id already exists in our DB
            if (!dbUser && user.id) {
              const byId = await prisma.user.findUnique({
                where: { id: user.id },
              });
              if (byId) dbUser = byId;
            }

            // 2b. If not found, look up by providerAccountId directly (covers legacy OAuth users
            //     whose User.id is their providerAccountId, e.g. Facebook ID, before they had an Account record)
            if (!dbUser && account?.providerAccountId) {
              const byProviderId = await prisma.user.findUnique({
                where: { id: account.providerAccountId },
              });
              if (byProviderId) dbUser = byProviderId;
            }

            // 3. If not found by id, try by email
            if (!dbUser && user.email) {
              const byEmail = await prisma.user.findFirst({
                where: { email: { equals: user.email, mode: "insensitive" } },
              });
              if (byEmail) dbUser = byEmail;
            }

            // 4. If still no user, create one
            if (!dbUser) {
              dbUser = await prisma.user.create({
                data: {
                  name: user.name,
                  email: user.email?.toLowerCase(),
                  image: user.image,
                }
              });
            } else {
              // 5. Update name/image if they are missing
              dbUser = await prisma.user.update({
                where: { id: dbUser.id },
                data: {
                  name: dbUser.name || user.name || undefined,
                  image: dbUser.image || user.image || undefined,
                }
              });
            }

            token.sub = dbUser.id;
          } catch (err) {
            console.error("[AUTH jwt callback] user creation error:", err);
            token.sub = user.id; // Fallback
          }
        } else {
          logger.info("[AUTH] jwt: linking new account to existing session", { userId: token.sub });
        }
      }

      if (trigger === "update" && session?.hasWorkspace !== undefined) {
        token.hasWorkspace = session.hasWorkspace;
      }

      // Re-check hasWorkspace on login, session update, or when false
      // This prevents redirect loops after creating first workspace
      if (token.sub && (user || trigger === "update" || !token.hasWorkspace)) {
        try {
          const { default: prisma } =
            await import("@/lib/prisma");
          const count = await prisma.workspaceMember.count({
            where: { userId: token.sub },
          });
          token.hasWorkspace = count > 0;
        } catch (err) {
          console.error("[AUTH] Workspace check failed:", err);
          if (token.hasWorkspace === undefined) {
            token.hasWorkspace = false;
          }
        }
      }

      if (account) {
        // SEPARACIÓN LOGIN  ACTIVOS (modelo comercial):
        // Iniciar sesión con Facebook/Google es SOLO identidad (email, perfil).
        // El token de login NUNCA se guarda como integración del workspace ni
        // en el JWT. Conectar activos (páginas, ads, analytics…) se hace
        // sección por sección desde Integraciones, con su propio OAuth y
        // consentimiento explícito (api/connect/[module] y oauth/google/start).
        token.provider = account.provider;

        // Guardar la cuenta vinculada para la vista de Perfil
        if (token.sub && account.type !== "credentials") {
          try {
            const { default: prisma } = await import("@/lib/prisma");
            await prisma.account.upsert({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
              update: {
                userId: token.sub as string,
              },
              create: {
                userId: token.sub as string,
                type: account.type || "oauth",
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            });
          } catch (err) {
            console.error("[AUTH jwt callback] account upsert error:", err);
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      // NOTE: accessToken is intentionally NOT included in the session object.
      // It only exists in the JWT (httpOnly cookie) and in the Integration table.
      // Server routes use getMetaAccessToken() from lib/server-auth.ts.
      session.hasWorkspace =
        (token.hasWorkspace as boolean) ?? false;
      session.provider =
        (token.provider as string) ?? null;
      session.loginAt = (token.loginAt as number) ?? null;
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allow relative URLs (like /invite/token)
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // SEGURIDAD: comparar ORIGEN exacto, no prefijo. `url.startsWith(baseUrl)`
      // aceptaba https://flowchart.xyz.evil.com (open redirect post-login → phishing).
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {
        /* url malformada → cae al baseUrl seguro */
      }
      return baseUrl;
    },
  },
};

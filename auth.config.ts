import type { NextAuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const META_API_VERSION = process.env.META_API_VERSION || "v25.0";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
if (!AUTH_SECRET && process.env.NODE_ENV === "production") {
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
          // FACEBOOK_LOGIN_CONFIG_ID must point to a Meta config that requests
          // email,public_profile only. No hardcoded fallback: if the env is
          // missing the param goes empty and Meta rejects the dialog visibly.
          config_id: process.env.FACEBOOK_LOGIN_CONFIG_ID || "",
          auth_type: "rerequest",
          // Explicitly restrict scope to minimum — no ads_read, no pages_manage_posts, etc.
          scope: "email,public_profile",
          // override_default_response_type is required by Meta to honor config_id
          override_default_response_type: "true",
          display: "popup",
        },
      },
    })
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
        (req?.headers?.["x-forwarded-for"] as string | undefined)
          ?.split(",")[0]
          ?.trim() || "unknown";
      const email = credentials.email.toLowerCase();
      const perIp = rateLimit(`login:ip:${ip}`, 30, 5 * 60_000);
      const perTarget = rateLimit(`login:${ip}:${email}`, 10, 5 * 60_000);
      if (!perIp.ok || !perTarget.ok) {
        console.warn(`[AUTH] Login rate limit exceeded for ${ip}`);
        return null;
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
        // 1. Validar token con Meta y obtener perfil.
        // Token SOLO por header (nunca en query string: las URLs terminan en
        // logs de proxies/CDN) y versión de API fijada server-side.
        const res = await fetch(
          `https://graph.facebook.com/${META_API_VERSION}/me?fields=id,name,email,picture.type(large)`,
          {
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
            signal: AbortSignal.timeout(6000),
          },
        );

        const fbUser = await res.json();

        if (!fbUser?.id || fbUser.error) {
          // Sin volcar la respuesta completa (puede traer datos del usuario):
          // solo código/tipo del error de Meta.
          console.error(
            "[AUTH facebook-sdk] Meta validation failed.",
            "status:", res.status,
            "code:", fbUser?.error?.code ?? null,
            "subcode:", fbUser?.error?.error_subcode ?? null,
          );
          // Códigos de throttling de Meta: 4 (app), 17 (usuario), 32 (page), 613 (custom)
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

        // 3. Si no existe cuenta, buscar por email (sin loguear el email — PII)
        if (!dbUser && fbUser.email) {
          dbUser = await prisma.user.findUnique({ where: { email: fbUser.email } }) ?? null;
        }

        // 4. Crear usuario si no existe
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              name: fbUser.name ?? null,
              email: fbUser.email ?? null,
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

        console.log("[AUTH facebook-sdk] Authorization successful for user:", dbUser.id);
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

// Cookie config for production (sodare.xyz).
// CRITICAL: authOptions is a static object evaluated at module-load time.
// NEXTAUTH_URL is set dynamically per-request in [...nextauth]/route.ts, so it
// is ALWAYS empty here. Do NOT check NEXTAUTH_URL.
// VERCEL_ENV === "production" is injected by Vercel at build time and is stable.
// On localhost, browsers reject __Secure- cookies over HTTP and ignore domain:.sodare.xyz,
// so enabling the production cookie config locally has no effect on dev sessions.
const productionCookies: NextAuthOptions["cookies"] =
  process.env.VERCEL_ENV === "production"
    ? {
        sessionToken: {
          name: "__Secure-next-auth.session-token",
          options: {
            httpOnly: true,
            sameSite: "lax" as const,
            path: "/",
            secure: true,
            domain: ".sodare.xyz",
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

    async jwt({ token, account, user, trigger }) {
      if (user) {
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

            // 2. If not found by OAuth account, try to find by email
            if (!dbUser && user.email) {
              dbUser = await prisma.user.findUnique({
                where: { email: user.email },
              });
            }

            // 3. If no user exists, create one
            if (!dbUser) {
              dbUser = await prisma.user.create({
                data: {
                  name: user.name,
                  email: user.email,
                  image: user.image,
                }
              });
            } else {
              // 4. Update name/image if they are missing
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
          console.log("[AUTH] Linking new account to existing session:", token.sub);
        }
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
        // SEPARACIÓN LOGIN ↔ ACTIVOS (modelo comercial):
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
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allow relative URLs (like /invite/token)
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow same-origin URLs
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
};

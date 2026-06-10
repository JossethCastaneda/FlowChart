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
          // Config ID 2028091691078800 must be set in Facebook App to request email,public_profile only.
          config_id: process.env.FACEBOOK_LOGIN_CONFIG_ID
            || "2028091691078800",
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

export const authOptions: NextAuthOptions = {
  providers,
  secret: AUTH_SECRET,

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, account, user, trigger }) {
      if (user) {
        // Detect account linking: if token already has a sub (from existing session)
        // and it differs from the incoming OAuth user.id, we are linking!
        const isLinking = token.sub && token.sub !== user.id;

        if (!isLinking) {
          token.sub = user.id;
          try {
            const { default: prisma } =
              await import("@/lib/prisma");
            // CRÍTICO: Upsert del usuario en Neon
            await prisma.user.upsert({
              where: { id: user.id },
              update: {
                name: user.name ?? undefined,
                email: user.email ?? undefined,
                image: user.image ?? undefined,
              },
              create: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
              },
            });
          } catch (err) {
            console.error("[AUTH jwt callback] upsert error:", err);
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
        if (token.sub && account.provider !== "credentials") {
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

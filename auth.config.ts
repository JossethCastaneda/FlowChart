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
          // Sodare — User Login (basic login only)
          // Config ID 2028091691078800 must be set in Facebook App to request email,public_profile only.
          config_id: process.env.FACEBOOK_LOGIN_CONFIG_ID
            || "2028091691078800",
          auth_type: "rerequest",
          // Explicitly restrict scope to minimum — no ads_read, no pages_manage_posts, etc.
          scope: "email,public_profile",
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
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const { default: prisma } = await import("@/lib/prisma");
      const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase() },
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
        token.sub = user.id;
        try {
          const { default: prisma } =
            await import("@/lib/prisma");
          // CRÍTICO: Upsert del usuario en Neon
          // (FK constraint fix para WorkspaceMember.create)
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
        if (account.provider === "facebook" && account.access_token) {
          // Exchange short-lived token (~1hr) for long-lived token (~60 days)
          let longLivedToken = account.access_token;
          try {
            const exchangeUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`);
            exchangeUrl.searchParams.set("grant_type", "fb_exchange_token");
            exchangeUrl.searchParams.set("client_id", process.env.FACEBOOK_CLIENT_ID || "");
            exchangeUrl.searchParams.set("client_secret", process.env.FACEBOOK_CLIENT_SECRET || "");
            exchangeUrl.searchParams.set("fb_exchange_token", account.access_token);

            const exchangeRes = await fetch(exchangeUrl.toString());
            const exchangeData = await exchangeRes.json();
            if (exchangeRes.ok && exchangeData.access_token) {
              longLivedToken = exchangeData.access_token;
              console.log("[AUTH] Exchanged for long-lived token (60d)");
            } else {
              console.warn("[AUTH] Token exchange failed, using short-lived:", exchangeData?.error?.message);
            }
          } catch (exchangeErr) {
            console.error("[AUTH] Token exchange error:", exchangeErr);
          }

          token.accessToken = longLivedToken;
          // Save token to Integration table so ALL workspace members
          // can use Meta APIs (not just the owner)
          if (token.sub) {
            try {
              const { saveMetaTokenToWorkspace } =
                await import("@/lib/server-auth");
              await saveMetaTokenToWorkspace(
                token.sub, longLivedToken
              );
            } catch (err) {
              console.error("[AUTH] Save Meta token failed:", err);
            }
          }
        }
        token.provider = account.provider;
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

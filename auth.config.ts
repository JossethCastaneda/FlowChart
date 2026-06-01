import type { NextAuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// Build providers dynamically — only register if credentials are configured
const providers: NextAuthOptions["providers"] = [];

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      authorization: {
        params: {
          config_id: process.env.FACEBOOK_LOGIN_CONFIG_ID
            || "2028091691078800",
          auth_type: "rerequest",
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
          token.accessToken = account.access_token;
          // Save token to Integration table so ALL workspace members
          // can use Meta APIs (not just the owner)
          if (token.sub) {
            try {
              const { saveMetaTokenToWorkspace } =
                await import("@/lib/server-auth");
              await saveMetaTokenToWorkspace(
                token.sub, account.access_token
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
      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }
      session.hasWorkspace =
        (token.hasWorkspace as boolean) ?? false;
      session.provider =
        (token.provider as string) ?? null;
      return session;
    },
  },
};
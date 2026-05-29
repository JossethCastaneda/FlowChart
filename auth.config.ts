import type { NextAuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          config_id: process.env.FACEBOOK_LOGIN_CONFIG_ID || "2028091691078800",
          auth_type: "rerequest",
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "select_account",
        },
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, account, user }) {
      // Cuando hay un user object, es un login nuevo (no refresh)
      if (user) {
        token.sub = user.id;

        // Upsert del usuario en Neon para que las foreign keys funcionen
        // Necesario porque usamos JWT sin PrismaAdapter
        try {
          const { default: prisma } = await import("@/lib/prisma");
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
          console.error("[AUTH] Failed to upsert user:", err);
        }
      }

      if (account) {
        if (account.provider === "facebook") {
          token.accessToken = account.access_token;
        }
        token.provider = account.provider;
      }

      // Verificar workspace (solo en login nuevo, cuando user existe)
      if (user?.id) {
        try {
          const { default: prisma } = await import("@/lib/prisma");
          const membership = await prisma.workspaceMember.findFirst({
            where: { userId: user.id },
            select: { workspaceId: true },
          });
          token.hasWorkspace = !!membership;
          token.activeWorkspaceId = membership?.workspaceId || null;
        } catch (err) {
          console.error("[AUTH] Failed to check workspace:", err);
          token.hasWorkspace = false;
          token.activeWorkspaceId = null;
        }
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
      session.hasWorkspace = (token.hasWorkspace as boolean) ?? false;
      session.activeWorkspaceId = (token.activeWorkspaceId as string | null) ?? null;
      session.provider = (token.provider as string) ?? null;
      return session;
    },
  },
};
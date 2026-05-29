import type { NextAuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";

/**
 * Shared auth configuration — used by both [...nextauth]/route.ts and middleware.
 * Compatible with next-auth v4.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          // Facebook Login for Business requires config_id
          // "Sodare — User Login" configuration
          config_id: process.env.FACEBOOK_LOGIN_CONFIG_ID || "2028091691078800",
          auth_type: "rerequest",
          // Do NOT send scope with config_id — permissions are defined in Meta config
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Solo pedir nombre, email y foto — sin permisos adicionales
          scope: "openid email profile",
          // Forzar selector de cuenta para que el usuario pueda elegir
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
      if (user) {
        token.sub = user.id;
      }
      if (account) {
        // Solo guardar accessToken para Facebook (Meta API lo necesita)
        // Google no necesita accessToken en el JWT
        if (account.provider === "facebook") {
          token.accessToken = account.access_token;
        }
        token.provider = account.provider;
      }
      // Verificar workspace (igual que en el Master Prompt de workspaces)
      if (user?.id) {
        const { default: prisma } = await import("@/lib/prisma");
        const membership = await prisma.workspaceMember.findFirst({
          where: { userId: user.id },
          select: { workspaceId: true },
        });
        token.hasWorkspace = !!membership;
        token.activeWorkspaceId = membership?.workspaceId || null;
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
      session.hasWorkspace = token.hasWorkspace as boolean ?? false;
      session.activeWorkspaceId = token.activeWorkspaceId as string | null ?? null;
      session.provider = token.provider as string ?? null;
      return session;
    },
  },
};
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
          config_id: process.env.FACEBOOK_LOGIN_CONFIG_ID
            || "2028091691078800",
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

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, account, user }) {
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
          // Verificar si ya tiene workspace
          const count =
            await prisma.workspaceMember.count({
              where: { userId: user.id },
            });
          token.hasWorkspace = count > 0;
        } catch (err) {
          console.error("[AUTH jwt callback]", err);
          token.hasWorkspace = false;
        }
      }

      if (account) {
        if (account.provider === "facebook") {
          token.accessToken = account.access_token;
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
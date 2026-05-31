import type { NextAuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

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
    }),
  ],

  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, account, user, trigger }) {
      if (user) {
        token.sub = user.id;
        // Upsert del usuario en Neon (FK fix — JWT no usa PrismaAdapter)
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
          console.error("[AUTH] User upsert failed:", err);
        }
      }

      if (account) {
        if (account.provider === "facebook") {
          token.accessToken = account.access_token;
        }
        token.provider = account.provider;
      }

      // hasWorkspace: re-evaluar en login, update(), o si es false
      // El workspace ACTIVO se maneja con cookie, NO en el JWT
      if (token.sub) {
        if (trigger === "update" || user || !token.hasWorkspace) {
          try {
            const { default: prisma } = await import("@/lib/prisma");
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
      session.provider = (token.provider as string) ?? null;
      return session;
    },
  },
};
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

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, account, user, trigger }) {
      // ── Primer login: user object solo existe aquí ──
      if (user) {
        token.sub = user.id;

        // CRÍTICO: upsert del usuario en Neon
        // JWT no usa PrismaAdapter → el usuario puede no existir en DB
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

      // ── Verificar workspace en CADA jwt call ──
      // Esto incluye: primer login, session refresh (useSession().update()),
      // y re-evaluaciones del middleware.
      // Antes solo se hacía en primer login, lo que causaba que
      // hasWorkspace quedara en false después de aceptar una invitación.
      if (token.sub) {
        // Solo re-verificar si es un update() explícito, primer login,
        // o si hasWorkspace es false (necesita re-check)
        if (trigger === "update" || user || !token.hasWorkspace) {
          try {
            const { default: prisma } = await import("@/lib/prisma");
            const membership = await prisma.workspaceMember.findFirst({
              where: { userId: token.sub },
              select: { workspaceId: true },
            });
            token.hasWorkspace = !!membership;
            token.activeWorkspaceId = membership?.workspaceId || null;
          } catch (err) {
            console.error("[AUTH] Workspace check failed:", err);
            // No sobreescribir si ya tenía un valor
            if (token.hasWorkspace === undefined) {
              token.hasWorkspace = false;
              token.activeWorkspaceId = null;
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
      session.activeWorkspaceId = (token.activeWorkspaceId as string | null) ?? null;
      session.provider = (token.provider as string) ?? null;
      return session;
    },
  },
};
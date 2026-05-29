import type { NextAuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";

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
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
    async jwt({ token, account, user }) {
      if (user) {
        token.sub = user.id;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
};
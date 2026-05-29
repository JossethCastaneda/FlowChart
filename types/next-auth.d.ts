import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    // accessToken is NOT on Session — kept server-side in JWT only
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}

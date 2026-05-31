import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    accessToken?: string;
    hasWorkspace?: boolean;
    provider?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    accessToken?: string;
    hasWorkspace?: boolean;
    provider?: string | null;
  }
}

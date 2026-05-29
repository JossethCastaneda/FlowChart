import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    accessToken?: string;
    hasWorkspace?: boolean;
    activeWorkspaceId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    accessToken?: string;
    accessTokenExpires?: number | null;
    hasWorkspace?: boolean;
    activeWorkspaceId?: string | null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    // NOTE: accessToken intentionally NOT exposed in Session.
    // Use getMetaAccessToken() from lib/server-auth.ts in server routes.
    hasWorkspace?: boolean;
    provider?: string | null;
    /** Epoch ms del inicio de sesión (para invalidar tras cambio de contraseña). */
    loginAt?: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    accessToken?: string;
    hasWorkspace?: boolean;
    provider?: string | null;
    loginAt?: number;
  }
}

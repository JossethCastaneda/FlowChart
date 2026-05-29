import NextAuth from "next-auth";
import { authOptions } from "@/auth.config";

/**
 * Auth helper for server components.
 * Use: const session = await auth();
 */
const handler = NextAuth(authOptions);

export const auth = handler;
export const { signIn, signOut } = handler;

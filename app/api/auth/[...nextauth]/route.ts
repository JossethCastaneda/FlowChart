import NextAuth from "next-auth";
import { authOptions } from "@/auth.config";

/**
 * NextAuth v4 route handler.
 * Using JWT strategy — no database adapter needed for auth.
 * PrismaAdapter will be re-added when DB is provisioned.
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

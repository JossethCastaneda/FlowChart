import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { META_API_VERSION, saveMetaTokenToWorkspace } from "@/lib/server-auth";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

/**
 * POST: Force-sync the current user's Meta token from JWT to the Integration table.
 * 
 * This is needed when an OWNER connected Meta before the workspace Integration
 * persistence was implemented. The token lives in their JWT but not in the DB.
 * 
 * Only OWNER/ADMIN who logged in with Facebook can trigger this.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the JWT token which has the Meta accessToken
    const token = await getToken({ req, secret: AUTH_SECRET });
    const metaToken = token?.accessToken as string | undefined;

    if (!metaToken) {
      return NextResponse.json(
        { error: "No tienes un token de Meta en tu sesión. Inicia sesión con Facebook primero." },
        { status: 400 }
      );
    }

    // Verify the token works with Meta
    const { metaFetch: mf } = await import("@/lib/server-auth");
    const testRes = await mf(`https://graph.facebook.com/${META_API_VERSION}/me`, metaToken);
    if (!testRes.ok) {
      return NextResponse.json(
        { error: "Tu token de Meta expiró. Vuelve a iniciar sesión con Facebook." },
        { status: 400 }
      );
    }

    // Save to Integration table for ALL workspaces where user is OWNER/ADMIN
    await saveMetaTokenToWorkspace(session.user.id, metaToken);

    return NextResponse.json({ success: true, message: "Token de Meta sincronizado a todos tus workspaces" });
  } catch (err: any) {
    console.error("[SYNC-TOKEN] Error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

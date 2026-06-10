import { NextRequest, NextResponse } from "next/server";
import { verifySignedRequest } from "@/lib/meta-signed-request";
import { disconnectMetaForUser } from "@/lib/meta-data-deletion";
import { logger } from "@/lib/logger";

/**
 * Meta Deauthorization Callback
 * Called when a user removes/deauthorizes this app from their Facebook settings.
 * Meta sends a signed_request with the user's Facebook ID.
 *
 * Cumplimiento: al deautorizar, los tokens otorgados por ese usuario se
 * invalidan en Meta — aquí desconectamos las integraciones que él autorizó
 * y BORRAMOS sus credenciales almacenadas.
 *
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.formData().catch(() => null);
    const signedRequest = body?.get("signed_request") as string | null;
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET;

    if (signedRequest && appSecret) {
      const decoded = verifySignedRequest(signedRequest, appSecret);
      if (decoded?.user_id) {
        await disconnectMetaForUser(decoded.user_id);
      } else {
        logger.warn("Meta deauthorize: signed_request HMAC verification failed");
      }
    } else if (signedRequest) {
      logger.error("Meta deauthorize: FACEBOOK_CLIENT_SECRET not set, cannot verify signed_request");
    }

    // Meta expects a 200 OK response
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Meta deauthorize error", { error });
    return NextResponse.json({ success: true }); // Always return 200 to Meta
  }
}

// Also handle GET for verification
export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "meta-deauthorize" });
}

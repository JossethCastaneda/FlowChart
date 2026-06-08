import { NextRequest, NextResponse } from "next/server";
import { verifySignedRequest } from "@/lib/meta-signed-request";

/**
 * Meta Deauthorization Callback
 * Called when a user removes/deauthorizes this app from their Facebook settings.
 * Meta sends a signed_request with the user's Facebook ID.
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
      if (decoded) {
        const userId = decoded.user_id;
        console.log(`[Meta Deauthorize] User ${userId} has deauthorized the app`);
        
        // Here you could:
        // - Mark the user's Meta integration as disconnected in the DB
        // - Revoke stored tokens
        // - Log the event for compliance
      } else {
        console.warn("[Meta Deauthorize] ⚠️ signed_request HMAC verification failed");
      }
    } else if (signedRequest) {
      console.warn("[Meta Deauthorize] ⚠️ FACEBOOK_CLIENT_SECRET not set, cannot verify signed_request");
    }

    // Meta expects a 200 OK response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Meta Deauthorize] Error:", error);
    return NextResponse.json({ success: true }); // Always return 200 to Meta
  }
}

// Also handle GET for verification
export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "meta-deauthorize" });
}

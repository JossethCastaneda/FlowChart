import { NextRequest, NextResponse } from "next/server";

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

    if (signedRequest) {
      // Parse the signed_request to get the user ID
      const [, payload] = signedRequest.split(".");
      if (payload) {
        const decoded = JSON.parse(
          Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
        );
        const userId = decoded.user_id;
        console.log(`[Meta Deauthorize] User ${userId} has deauthorized the app`);
        
        // Here you could:
        // - Mark the user's Meta integration as disconnected in the DB
        // - Revoke stored tokens
        // - Log the event for compliance
      }
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

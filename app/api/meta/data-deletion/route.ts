import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifySignedRequest } from "@/lib/meta-signed-request";

/**
 * Meta Data Deletion Request Callback
 * Called when a user requests deletion of their data through Facebook.
 * Must return a JSON response with:
 *   - url: where the user can check deletion status
 *   - confirmation_code: unique identifier for this request
 * 
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

const APP_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sodare.xyz";

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData().catch(() => null);
    const signedRequest = body?.get("signed_request") as string | null;

    let userId = "unknown";
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET;

    if (signedRequest && appSecret) {
      const decoded = verifySignedRequest(signedRequest, appSecret);
      if (decoded) {
        userId = decoded.user_id || "unknown";
      } else {
        console.warn("[Meta Data Deletion] ⚠️ signed_request HMAC verification failed");
      }
    } else if (signedRequest) {
      console.warn("[Meta Data Deletion] ⚠️ FACEBOOK_CLIENT_SECRET not set, cannot verify signed_request");
    }

    // Generate a unique confirmation code for this deletion request
    const confirmationCode = crypto.randomUUID();
    const timestamp = Date.now();

    console.log(`[Meta Data Deletion] Request from user ${userId}, code: ${confirmationCode}`);

    // Here you should:
    // 1. Store the deletion request in your database
    // 2. Queue actual data deletion (tokens, insights cache, etc.)
    // 3. The confirmation code should be stored so you can look up status later

    // Meta requires this exact JSON response format
    return NextResponse.json({
      url: `${APP_URL}/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error("[Meta Data Deletion] Error:", error);
    // Still return a valid response
    const fallbackCode = crypto.randomUUID();
    return NextResponse.json({
      url: `${APP_URL}/data-deletion?code=${fallbackCode}`,
      confirmation_code: fallbackCode,
    });
  }
}

// GET for verification/status check
export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "meta-data-deletion" });
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { verifySignedRequest } from "@/lib/meta-signed-request";

/**
 * Meta Data Deletion Request Callback
 *
 * Called when a user requests deletion of their data through Facebook.
 * Must return a JSON response with:
 *   - url: where the user can check deletion status
 *   - confirmation_code: unique identifier for this request
 *
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 * Compliance:
 * - Verifies HMAC signed_request from Meta
 * - Persists the deletion request to DataDeletionRequest table
 * - Returns the confirmation code so the user can track status
 * - Actual data deletion should be handled asynchronously (e.g., a cron job
 *   that processes pending requests and deletes tokens, cached insights, etc.)
 */

const APP_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sodare.xyz";

export async function POST(req: NextRequest) {
  // Fallback code in case DB insert fails — always return something to Meta
  let confirmationCode: string = crypto.randomUUID();

  try {
    const body = await req.formData().catch(() => null);
    const signedRequest = body?.get("signed_request") as string | null;

    let metaUserId = "unknown";
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET;

    if (signedRequest && appSecret) {
      const decoded = verifySignedRequest(signedRequest, appSecret);
      if (decoded) {
        metaUserId = decoded.user_id || "unknown";
      } else {
        console.warn("[Meta Data Deletion] ⚠️ signed_request HMAC verification failed — rejecting.");
        return NextResponse.json({ error: "Invalid signed_request" }, { status: 403 });
      }
    } else if (!appSecret) {
      console.error("[Meta Data Deletion] ⚠️ FACEBOOK_CLIENT_SECRET not set, cannot verify signed_request");
      // Still persist with unknown user — we can't verify but Meta expects a response
    }

    // Persist the deletion request for compliance tracking
    // The actual deletion is processed asynchronously
    try {
      const deletionRequest = await prisma.dataDeletionRequest.create({
        data: {
          confirmationCode,
          metaUserId,
          status: "pending",
        },
      });
      confirmationCode = deletionRequest.confirmationCode;
      console.log(
        `[Meta Data Deletion] ✅ Persisted request for user ${metaUserId}, code: ${confirmationCode}`
      );
    } catch (dbErr) {
      console.error("[Meta Data Deletion] Failed to persist deletion request:", dbErr);
      // Still respond to Meta with a code — we log for manual follow-up
    }

    // Meta requires this exact JSON response format
    return NextResponse.json({
      url: `${APP_URL}/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error("[Meta Data Deletion] Error:", error);
    // Still return a valid response so Meta does not retry indefinitely
    return NextResponse.json({
      url: `${APP_URL}/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  }
}

// GET: status check endpoint — users can verify their deletion request
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ status: "ok", endpoint: "meta-data-deletion" });
  }

  try {
    const request = await prisma.dataDeletionRequest.findUnique({
      where: { confirmationCode: code },
      select: { status: true, requestedAt: true, completedAt: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: request.status,
      requestedAt: request.requestedAt,
      completedAt: request.completedAt ?? null,
    });
  } catch (err) {
    console.error("[Meta Data Deletion] GET error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

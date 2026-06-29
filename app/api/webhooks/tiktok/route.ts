/**
 * POST /api/webhooks/tiktok
 *
 * TikTok Webhook handler — receives event notifications from TikTok for Business.
 * Validates the X-TikTok-Signature header and processes incoming events.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { logger } from "@/lib/logger";

const TIKTOK_WEBHOOK_SECRET = process.env.TIKTOK_WEBHOOK_SECRET ?? "";

function verifySignature(body: string, signature: string): boolean {
  if (!TIKTOK_WEBHOOK_SECRET) return true; // Skip verification if secret not set yet
  const expected = createHmac("sha256", TIKTOK_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  return `sha256=${expected}` === signature;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-tiktok-signature") ?? "";

    // Verify signature if present
    if (signature && !verifySignature(rawBody, signature)) {
      logger.warn("[TIKTOK WEBHOOK] ❌ Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // Some test events may send non-JSON bodies
      logger.warn("[TIKTOK WEBHOOK] Non-JSON body received");
    }

    const eventType = (payload?.type as string) ?? "unknown";
    logger.info(`[TIKTOK WEBHOOK] ✅ Event received: ${eventType}`);

    // Handle event types
    switch (eventType) {
      case "AUTHORIZATION":
        logger.info("[TIKTOK WEBHOOK] Authorization event");
        break;
      case "AD_STATUS":
        logger.info("[TIKTOK WEBHOOK] Ad status change event");
        break;
      default:
        logger.info(`[TIKTOK WEBHOOK] Unhandled event type: ${eventType}`);
    }

    // TikTok requires a 200 response to confirm receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    logger.error("[TIKTOK WEBHOOK] Error:", message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// TikTok may send GET requests for endpoint verification
export async function GET() {
  return NextResponse.json({ status: "ok", service: "sodare-tiktok-webhook" }, { status: 200 });
}

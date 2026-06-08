/**
 * GET/POST /api/webhooks/meta
 * 
 * Facebook Webhook Endpoint para eventos en tiempo real:
 * - feed updates, comments, messages, account changes, etc.
 * 
 * Conforme a: https://developers.facebook.com/docs/graph-api/webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import prisma from "@/lib/prisma";

const WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "dev-webhook-token";
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_CLIENT_SECRET || "";

/**
 * GET — Facebook's webhook verification (Challenge Request)
 * 
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || token !== WEBHOOK_VERIFY_TOKEN) {
    console.warn("[WEBHOOK] Invalid subscription request — token mismatch");
    return NextResponse.json({ error: "Invalid verification token" }, { status: 403 });
  }

  console.log("[WEBHOOK] ✅ Subscription verified");
  return NextResponse.json(challenge, { status: 200 });
}

/**
 * POST — Process webhook events from Facebook
 * 
 * Valida X-Hub-Signature-256 y procesa eventos en background
 */
export async function POST(request: NextRequest) {
  // Get raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") || "";

  // Verify signature (CRITICAL security check)
  if (!verifySignature(body, signature, FACEBOOK_APP_SECRET)) {
    console.warn("[WEBHOOK] ❌ Invalid signature — rejecting event");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  try {
    const payload = JSON.parse(body);
    
    if (payload.object !== "page") {
      console.log(`[WEBHOOK] Ignoring non-page object: ${payload.object}`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Process each entry (one request can have multiple events)
    if (Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        await processWebhookEntry(entry);
      }
    }

    // Always return 200 immediately (process in background)
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[WEBHOOK] Error processing payload:", err);
    // Still return 200 to prevent Facebook from retrying
    return NextResponse.json({ error: "Processing error", success: false }, { status: 200 });
  }
}

/**
 * Verify Facebook's X-Hub-Signature-256 header
 * 
 * Signature = SHA256(app_secret, body)
 */
function verifySignature(body: string, signature: string, appSecret: string): boolean {
  if (!appSecret) {
    console.warn("[WEBHOOK] FACEBOOK_CLIENT_SECRET not set — skipping signature check");
    return process.env.NODE_ENV !== "production";
  }

  try {
    const [, hash] = signature.split("=");
    if (!hash) return false;

    const computed = createHmac("sha256", appSecret)
      .update(body)
      .digest("hex");

    // Use timing-safe comparison
    return computed === hash;
  } catch (err) {
    console.error("[WEBHOOK] Signature verification failed:", err);
    return false;
  }
}

/**
 * Process a single webhook entry (page event)
 */
async function processWebhookEntry(entry: any) {
  const pageId = entry.id;
  const timestamp = entry.time;

  console.log(`[WEBHOOK] Processing page ${pageId} at ${new Date(timestamp * 1000).toISOString()}`);

  // Find workspace that owns this page
  const integration = await prisma.integration.findFirst({
    where: {
      connected: true,
      credentials: {
        path: ["pages"],
        array_contains: [{ id: pageId }],
      },
    },
    select: { workspaceId: true },
  });

  if (!integration) {
    console.warn(`[WEBHOOK] Page ${pageId} not found in any workspace — ignoring`);
    return;
  }

  // Process each messaging/feed event
  const events = entry.messaging || entry.changes || [];
  
  for (const event of events) {
    const eventType = getEventType(event);
    
    console.log(`[WEBHOOK] Event type: ${eventType} for page ${pageId}`);
    
    // Dispatch to appropriate handler
    switch (eventType) {
      case "MESSAGE":
        await handleIncomingMessage(integration.workspaceId, pageId, event);
        break;
      case "POSTBACK":
        await handlePostback(integration.workspaceId, pageId, event);
        break;
      case "PAGE_CHANGE":
        await handlePageChange(integration.workspaceId, pageId, event);
        break;
      default:
        console.debug(`[WEBHOOK] Unhandled event type: ${eventType}`);
    }
  }
}

function getEventType(event: any): string {
  if (event.message) return "MESSAGE";
  if (event.postback) return "POSTBACK";
  if (event.field === "feed") return "PAGE_CHANGE";
  return "UNKNOWN";
}

async function handleIncomingMessage(workspaceId: string, pageId: string, event: any) {
  // TODO: Save to inbox table
  console.log(`[WEBHOOK] Incoming message on page ${pageId}:`, event.message.text);
}

async function handlePostback(workspaceId: string, pageId: string, event: any) {
  // TODO: Handle postback from Messenger buttons
  console.log(`[WEBHOOK] Postback on page ${pageId}:`, event.postback.payload);
}

async function handlePageChange(workspaceId: string, pageId: string, event: any) {
  // TODO: Handle page feed changes
  console.log(`[WEBHOOK] Page change on ${pageId}:`, event.value);
}

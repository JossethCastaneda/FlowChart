import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "sodare_webhook_verify_2026";

/**
 * GET — Meta Webhook Verification
 * Meta sends: hub.mode=subscribe, hub.challenge=<random>, hub.verify_token=<your_token>
 * We must return hub.challenge as plain text if verify_token matches.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WEBHOOK] ✅ Verification successful");
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  console.warn("[WEBHOOK] ❌ Verification failed — token mismatch");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST — Receive webhook events from Meta
 * Events include: ad_account changes, page messages, leads, etc.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const object = body.object; // "page", "ad_account", "instagram", "whatsapp_business_account"

    console.log(`[WEBHOOK] Received event — object: ${object}, entries: ${body.entry?.length || 0}`);

    if (!body.entry?.length) {
      return NextResponse.json({ received: true });
    }

    for (const entry of body.entry) {
      const entryId = entry.id;
      const time = entry.time;

      // ═══ AD ACCOUNT EVENTS ═══
      if (object === "ad_account") {
        for (const change of entry.changes || []) {
          const field = change.field; // "campaigns", "adsets", "ads", "account_spending_limit_reached", etc.
          const value = change.value;

          console.log(`[WEBHOOK] Ad Account ${entryId} — field: ${field}`, JSON.stringify(value).slice(0, 200));

          // Budget/spending alerts
          if (field === "account_spending_limit_reached" || field === "funding_source_removed") {
            await createWebhookAlert({
              type: "account_alert",
              severity: "critical",
              title: field === "account_spending_limit_reached" 
                ? "Límite de gasto de cuenta alcanzado" 
                : "Fuente de fondos removida",
              message: `La cuenta publicitaria ${entryId} requiere atención inmediata.`,
              meta: { adAccountId: entryId, field, value, time },
            });
          }

          // Campaign status changes
          if (field === "campaigns" && value?.status) {
            await createWebhookAlert({
              type: "campaign_status",
              severity: value.status === "PAUSED" ? "warning" : "info",
              title: `Campaña ${value.status === "PAUSED" ? "pausada" : "actualizada"}`,
              message: `Campaña "${value.name || entryId}" cambió a estado: ${value.status}`,
              meta: { adAccountId: entryId, campaignId: value.id, status: value.status, time },
            });
          }

          // Ad disapproval
          if (field === "ads" && value?.review_status === "DISAPPROVED") {
            await createWebhookAlert({
              type: "ad_disapproved",
              severity: "critical",
              title: "Anuncio rechazado por Meta",
              message: `El anuncio "${value.name || value.id}" fue rechazado. Revisa las políticas publicitarias.`,
              meta: { adAccountId: entryId, adId: value.id, time },
            });
          }
        }
      }

      // ═══ PAGE EVENTS (messages, leads) ═══
      if (object === "page") {
        for (const msg of entry.messaging || []) {
          // New message received
          if (msg.message) {
            console.log(`[WEBHOOK] Page ${entryId} — New message from ${msg.sender?.id}`);
            await createWebhookAlert({
              type: "new_message",
              severity: "info",
              title: "Nuevo mensaje recibido",
              message: `Mensaje en página ${entryId}: "${(msg.message.text || "").slice(0, 100)}"`,
              meta: { pageId: entryId, senderId: msg.sender?.id, time: msg.timestamp },
            });
          }
        }

        // Lead gen events
        for (const change of entry.changes || []) {
          if (change.field === "leadgen") {
            const leadId = change.value?.leadgen_id;
            console.log(`[WEBHOOK] Page ${entryId} — New lead: ${leadId}`);
            await createWebhookAlert({
              type: "new_lead",
              severity: "info",
              title: "Nuevo lead recibido",
              message: `Lead generado en página ${entryId}. Lead ID: ${leadId}`,
              meta: { pageId: entryId, leadId, formId: change.value?.form_id, time },
            });
          }
        }
      }

      // ═══ WHATSAPP EVENTS ═══
      if (object === "whatsapp_business_account") {
        for (const change of entry.changes || []) {
          if (change.field === "messages") {
            const messages = change.value?.messages || [];
            for (const waMsg of messages) {
              console.log(`[WEBHOOK] WhatsApp — New message from ${waMsg.from}`);
              await createWebhookAlert({
                type: "whatsapp_message",
                severity: "info",
                title: "Mensaje de WhatsApp",
                message: `Nuevo mensaje de ${waMsg.from}: "${(waMsg.text?.body || waMsg.type || "").slice(0, 100)}"`,
                meta: { phoneNumberId: change.value?.metadata?.phone_number_id, from: waMsg.from, time },
              });
            }
          }
        }
      }
    }

    // Meta requires 200 response within 20 seconds
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[WEBHOOK] Processing error:", error);
    // Always return 200 to Meta to prevent retries on processing errors
    return NextResponse.json({ received: true, error: error.message });
  }
}

// ═══ Helper: Create webhook alert in DB ═══
async function createWebhookAlert(alert: {
  type: string;
  severity: string;
  title: string;
  message: string;
  meta?: any;
}) {
  try {
    // Find projects linked to the affected ad account
    const projects = await prisma.project.findMany({
      where: { status: "Activo" },
      include: {
        channels: true,
        members: { select: { userId: true } },
      },
    });

    for (const project of projects) {
      const metaChannel = project.channels.find((c) => {
        const cfg = c.config as any;
        return cfg?.platformId === "meta";
      });

      if (!metaChannel) continue;
      const cfg = metaChannel.config as any;

      // Check if this project is related to the webhook event
      const adAccountId = alert.meta?.adAccountId;
      const pageId = alert.meta?.pageId;
      const isRelated = adAccountId
        ? cfg.adAccounts?.some((a: string) => a.includes(adAccountId) || adAccountId.includes(a))
        : pageId
        ? cfg.pageId === pageId
        : true;

      if (!isRelated) continue;

      // Create in-app notifications for project members
      for (const member of project.members) {
        await prisma.notification.create({
          data: {
            userId: member.userId,
            type: alert.type,
            title: `${project.name}: ${alert.title}`,
            message: alert.message,
            link: `/dashboard/proyectos/${project.id}`,
          },
        });
      }

      console.log(`[WEBHOOK] Alert created for project "${project.name}": ${alert.title}`);
    }
  } catch (err) {
    console.error("[WEBHOOK] Failed to create alert:", err);
  }
}

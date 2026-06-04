import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

/**
 * GET — Meta Webhook Verification
 * Meta sends: hub.mode=subscribe, hub.challenge=<random>, hub.verify_token=<your_token>
 * We must return hub.challenge as plain text if verify_token matches.
 */
export async function GET(req: NextRequest) {
  if (!VERIFY_TOKEN) {
    console.error("[WEBHOOK] META_WEBHOOK_VERIFY_TOKEN not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

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
 * POST — Receive ALL webhook events from Meta
 * Supported objects: page, instagram, ad_account, whatsapp_business_account
 * 
 * SUBSCRIBED FIELDS:
 * ─── Page ───
 *   messages, messaging_postbacks, messaging_optins, messaging_referrals,
 *   message_deliveries, message_reads, feed, mention, ratings,
 *   leadgen, lead_dispatched
 *
 * ─── Instagram ───
 *   messages, messaging_postbacks, comments, mentions, story_insights,
 *   live_comments
 *
 * ─── Ad Account ───
 *   campaigns, adsets, ads, account_spending_limit_reached,
 *   funding_source_removed, ad_review
 *
 * ─── WhatsApp Business ───
 *   messages, message_template_status_update
 */
export async function POST(req: NextRequest) {
  try {
    // ── HMAC-SHA256 Signature Validation (Meta Security Requirement) ──────
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET;

    // Reject if app secret is not configured
    if (!appSecret) {
      console.error("[WEBHOOK] FACEBOOK_CLIENT_SECRET not set");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // Reject if signature is missing
    if (!signature) {
      console.warn("[WEBHOOK] ❌ Missing X-Hub-Signature-256 — rejecting");
      return NextResponse.json({ error: "Missing signature" }, { status: 403 });
    }

    // Verify HMAC with timing-safe comparison
    const { createHmac, timingSafeEqual } = await import("crypto");
    const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      console.warn("[WEBHOOK] ❌ HMAC mismatch — possible spoofed request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body = JSON.parse(rawBody);
    const object = body.object; // "page", "instagram", "ad_account", "whatsapp_business_account"


    console.log(`[WEBHOOK] 📨 Event received — object: ${object}, entries: ${body.entry?.length || 0}`);

    if (!body.entry?.length) {
      return NextResponse.json({ received: true });
    }

    for (const entry of body.entry) {
      const entryId = entry.id;
      const time = entry.time;

      // ═══════════════════════════════════════════════════
      // PAGE EVENTS
      // ═══════════════════════════════════════════════════
      if (object === "page") {
        // ─── Messenger Messages ───
        for (const msg of entry.messaging || []) {
          if (msg.message) {
            await createAlert({
              type: "new_message",
              severity: "info",
              title: "💬 Nuevo mensaje — Messenger",
              message: `Mensaje de usuario ${msg.sender?.id}: "${(msg.message.text || "📎 Adjunto").slice(0, 120)}"`,
              meta: { pageId: entryId, senderId: msg.sender?.id, recipientId: msg.recipient?.id, messageId: msg.message.mid, time: msg.timestamp },
              channel: "messenger",
            });
          }

          // Message delivery confirmation
          if (msg.delivery) {
            console.log(`[WEBHOOK] 📧 Delivery: ${msg.delivery.mids?.length || 0} msgs delivered to ${msg.sender?.id}`);
          }

          // Message read confirmation
          if (msg.read) {
            console.log(`[WEBHOOK] 👁️ Read: messages read by ${msg.sender?.id} up to ${msg.read.watermark}`);
          }

          // Postback (button click in Messenger)
          if (msg.postback) {
            await createAlert({
              type: "messenger_postback",
              severity: "info",
              title: "🔘 Postback — Messenger",
              message: `Botón presionado: "${msg.postback.title}" — Payload: ${msg.postback.payload}`,
              meta: { pageId: entryId, senderId: msg.sender?.id, payload: msg.postback.payload, time: msg.timestamp },
              channel: "messenger",
            });
          }

          // Opt-in (user subscribes via checkbox plugin, etc.)
          if (msg.optin) {
            await createAlert({
              type: "messenger_optin",
              severity: "info",
              title: "✅ Nuevo opt-in — Messenger",
              message: `Usuario ${msg.sender?.id} dio opt-in. Ref: ${msg.optin.ref || "N/A"}`,
              meta: { pageId: entryId, senderId: msg.sender?.id, ref: msg.optin.ref, time: msg.timestamp },
              channel: "messenger",
            });
          }

          // Referral (m.me link, ad click, etc.)
          if (msg.referral) {
            await createAlert({
              type: "messenger_referral",
              severity: "info",
              title: "🔗 Referral — Messenger",
              message: `Referral de ${msg.referral.source || "desconocido"}: ${msg.referral.type || ""} — Ref: ${msg.referral.ref || "N/A"}`,
              meta: { pageId: entryId, senderId: msg.sender?.id, source: msg.referral.source, ref: msg.referral.ref, adId: msg.referral.ad_id, time: msg.timestamp },
              channel: "messenger",
            });
          }
        }

        // ─── Page Feed Events (posts, comments, reactions) ───
        for (const change of entry.changes || []) {
          const field = change.field;
          const value = change.value;

          // Feed: new post, comment, or reaction on page
          if (field === "feed") {
            const item = value?.item; // "post", "comment", "reaction", "share"
            const verb = value?.verb; // "add", "edited", "remove"

            if (item === "comment" && verb === "add") {
              await createAlert({
                type: "page_comment",
                severity: "info",
                title: "💬 Nuevo comentario — Facebook",
                message: `Comentario de ${value.from?.name || "Usuario"}: "${(value.message || "").slice(0, 120)}"`,
                meta: { pageId: entryId, postId: value.post_id, commentId: value.comment_id, from: value.from, time },
                channel: "facebook",
              });
            }

            if (item === "reaction" && verb === "add") {
              await createAlert({
                type: "page_reaction",
                severity: "info",
                title: `👍 Nueva reacción — Facebook`,
                message: `${value.from?.name || "Usuario"} reaccionó con "${value.reaction_type || "like"}" a una publicación`,
                meta: { pageId: entryId, postId: value.post_id, reaction: value.reaction_type, from: value.from, time },
                channel: "facebook",
              });
            }

            if (item === "share" && verb === "add") {
              await createAlert({
                type: "page_share",
                severity: "info",
                title: "🔄 Publicación compartida — Facebook",
                message: `${value.from?.name || "Usuario"} compartió una publicación de tu página`,
                meta: { pageId: entryId, postId: value.post_id, from: value.from, time },
                channel: "facebook",
              });
            }

            if (item === "post" && verb === "add" && value.from?.id !== entryId) {
              await createAlert({
                type: "page_wall_post",
                severity: "info",
                title: "📝 Publicación en tu muro — Facebook",
                message: `${value.from?.name || "Alguien"} publicó en tu página: "${(value.message || "").slice(0, 120)}"`,
                meta: { pageId: entryId, postId: value.post_id, from: value.from, time },
                channel: "facebook",
              });
            }
          }

          // Mention: page was mentioned in a post
          if (field === "mention") {
            await createAlert({
              type: "page_mention",
              severity: "info",
              title: "🏷️ Mención de página — Facebook",
              message: `Tu página fue mencionada. Post ID: ${value?.post_id || "N/A"}`,
              meta: { pageId: entryId, postId: value?.post_id, senderId: value?.sender_id, time },
              channel: "facebook",
            });
          }

          // Ratings / Reviews
          if (field === "ratings") {
            const rating = value?.rating;
            await createAlert({
              type: "page_review",
              severity: rating && rating <= 2 ? "warning" : "info",
              title: `⭐ Nueva reseña — Facebook (${rating || "?"}/5)`,
              message: `${value?.reviewer_name || "Usuario"} dejó una reseña${value?.review_text ? `: "${value.review_text.slice(0, 120)}"` : ""}`,
              meta: { pageId: entryId, rating, reviewer: value?.reviewer_name, text: value?.review_text, time },
              channel: "facebook",
            });
          }

          // Lead gen forms
          if (field === "leadgen") {
            await createAlert({
              type: "new_lead",
              severity: "info",
              title: "📋 Nuevo lead — Facebook",
              message: `Lead generado. Lead ID: ${value?.leadgen_id}. Form ID: ${value?.form_id}`,
              meta: { pageId: entryId, leadId: value?.leadgen_id, formId: value?.form_id, adId: value?.ad_id, time },
              channel: "facebook",
            });
          }

          if (field === "lead_dispatched") {
            await createAlert({
              type: "lead_dispatched",
              severity: "info",
              title: "📤 Lead despachado — Facebook",
              message: `Lead despachado. Lead ID: ${value?.leadgen_id}`,
              meta: { pageId: entryId, leadId: value?.leadgen_id, time },
              channel: "facebook",
            });
          }
        }
      }

      // ═══════════════════════════════════════════════════
      // INSTAGRAM EVENTS
      // ═══════════════════════════════════════════════════
      if (object === "instagram") {
        // ─── Instagram DM Messages ───
        for (const msg of entry.messaging || []) {
          if (msg.message) {
            await createAlert({
              type: "ig_message",
              severity: "info",
              title: "💬 Nuevo DM — Instagram",
              message: `DM de ${msg.sender?.id}: "${(msg.message.text || "📎 Adjunto").slice(0, 120)}"`,
              meta: { igAccountId: entryId, senderId: msg.sender?.id, messageId: msg.message.mid, time: msg.timestamp },
              channel: "instagram",
            });
          }

          // Story reply
          if (msg.message?.reply_to?.story) {
            await createAlert({
              type: "ig_story_reply",
              severity: "info",
              title: "📸 Respuesta a historia — Instagram",
              message: `Respuesta a tu historia: "${(msg.message.text || "").slice(0, 120)}"`,
              meta: { igAccountId: entryId, senderId: msg.sender?.id, storyUrl: msg.message.reply_to.story.url, time: msg.timestamp },
              channel: "instagram",
            });
          }

          // Story mention (user mentioned you in their story)
          if (msg.message?.attachments?.[0]?.type === "story_mention") {
            await createAlert({
              type: "ig_story_mention",
              severity: "info",
              title: "🏷️ Mención en historia — Instagram",
              message: `Usuario ${msg.sender?.id} te mencionó en su historia`,
              meta: { igAccountId: entryId, senderId: msg.sender?.id, mediaUrl: msg.message.attachments[0].payload?.url, time: msg.timestamp },
              channel: "instagram",
            });
          }

          // Postback
          if (msg.postback) {
            await createAlert({
              type: "ig_postback",
              severity: "info",
              title: "🔘 Postback — Instagram",
              message: `Botón: "${msg.postback.title}" — Payload: ${msg.postback.payload}`,
              meta: { igAccountId: entryId, senderId: msg.sender?.id, payload: msg.postback.payload, time: msg.timestamp },
              channel: "instagram",
            });
          }
        }

        // ─── Instagram Feed Events (comments, mentions) ───
        for (const change of entry.changes || []) {
          const field = change.field;
          const value = change.value;

          // Comments on IG posts
          if (field === "comments") {
            await createAlert({
              type: "ig_comment",
              severity: "info",
              title: "💬 Nuevo comentario — Instagram",
              message: `${value?.from?.username || "Usuario"} comentó: "${(value?.text || "").slice(0, 120)}"`,
              meta: { igAccountId: entryId, mediaId: value?.media?.id, commentId: value?.id, from: value?.from, time },
              channel: "instagram",
            });
          }

          // Mentions in IG posts/stories
          if (field === "mentions") {
            await createAlert({
              type: "ig_mention",
              severity: "info",
              title: "🏷️ Mención — Instagram",
              message: `${value?.username || "Usuario"} te mencionó en una publicación`,
              meta: { igAccountId: entryId, mediaId: value?.media_id, commentId: value?.comment_id, time },
              channel: "instagram",
            });
          }

          // Live comments
          if (field === "live_comments") {
            await createAlert({
              type: "ig_live_comment",
              severity: "info",
              title: "🔴 Comentario en Live — Instagram",
              message: `${value?.from?.username || "Usuario"}: "${(value?.text || "").slice(0, 120)}"`,
              meta: { igAccountId: entryId, liveMediaId: value?.media_id, from: value?.from, time },
              channel: "instagram",
            });
          }

          // Story insights (impressions, exits, etc.)
          if (field === "story_insights") {
            console.log(`[WEBHOOK] 📊 Story insights for IG ${entryId}:`, JSON.stringify(value).slice(0, 200));
          }
        }
      }

      // ═══════════════════════════════════════════════════
      // AD ACCOUNT EVENTS
      // ═══════════════════════════════════════════════════
      if (object === "ad_account") {
        for (const change of entry.changes || []) {
          const field = change.field;
          const value = change.value;

          console.log(`[WEBHOOK] 📊 Ad Account ${entryId} — field: ${field}`, JSON.stringify(value).slice(0, 200));

          // Spending limit reached
          if (field === "account_spending_limit_reached") {
            await createAlert({
              type: "account_spending_limit",
              severity: "critical",
              title: "🚨 Límite de gasto alcanzado",
              message: `La cuenta publicitaria ${entryId} alcanzó su límite de gasto. Los anuncios se detendrán.`,
              meta: { adAccountId: entryId, field, value, time },
              channel: "ads",
            });
          }

          // Funding source removed
          if (field === "funding_source_removed") {
            await createAlert({
              type: "funding_removed",
              severity: "critical",
              title: "🚨 Método de pago removido",
              message: `Se removió el método de pago de la cuenta ${entryId}. Los anuncios se detendrán.`,
              meta: { adAccountId: entryId, field, value, time },
              channel: "ads",
            });
          }

          // Campaign changes
          if (field === "campaigns") {
            const statusMap: Record<string, { emoji: string; sev: string }> = {
              PAUSED: { emoji: "⏸️", sev: "warning" },
              ACTIVE: { emoji: "▶️", sev: "info" },
              DELETED: { emoji: "🗑️", sev: "warning" },
              ARCHIVED: { emoji: "📦", sev: "info" },
            };
            const s = statusMap[value?.status] || { emoji: "ℹ️", sev: "info" };
            await createAlert({
              type: "campaign_status",
              severity: s.sev,
              title: `${s.emoji} Campaña ${value?.status === "PAUSED" ? "pausada" : value?.status === "ACTIVE" ? "activada" : "actualizada"}`,
              message: `Campaña "${value?.name || value?.id || entryId}" → ${value?.status || "actualizada"}`,
              meta: { adAccountId: entryId, campaignId: value?.id, status: value?.status, name: value?.name, time },
              channel: "ads",
            });
          }

          // Ad set changes
          if (field === "adsets") {
            await createAlert({
              type: "adset_status",
              severity: value?.status === "PAUSED" ? "warning" : "info",
              title: `📦 Ad Set ${value?.status === "PAUSED" ? "pausado" : "actualizado"}`,
              message: `Ad Set "${value?.name || value?.id}" → ${value?.status || "actualizado"}`,
              meta: { adAccountId: entryId, adsetId: value?.id, status: value?.status, time },
              channel: "ads",
            });
          }

          // Ad changes
          if (field === "ads") {
            if (value?.review_status === "DISAPPROVED" || value?.effective_status === "DISAPPROVED") {
              await createAlert({
                type: "ad_disapproved",
                severity: "critical",
                title: "🚫 Anuncio rechazado por Meta",
                message: `El anuncio "${value.name || value.id}" fue rechazado. Revisa las políticas publicitarias. Razón: ${value.review_feedback || "No especificada"}`,
                meta: { adAccountId: entryId, adId: value.id, name: value.name, feedback: value.review_feedback, time },
                channel: "ads",
              });
            } else {
              await createAlert({
                type: "ad_status",
                severity: "info",
                title: `📢 Anuncio actualizado`,
                message: `Anuncio "${value?.name || value?.id}" → ${value?.effective_status || value?.status || "actualizado"}`,
                meta: { adAccountId: entryId, adId: value?.id, status: value?.effective_status || value?.status, time },
                channel: "ads",
              });
            }
          }

          // Ad review
          if (field === "ad_review") {
            await createAlert({
              type: "ad_review",
              severity: value?.ad_review_status === "DISAPPROVED" ? "critical" : "info",
              title: `📋 Revisión de anuncio: ${value?.ad_review_status || "en proceso"}`,
              message: `Anuncio ${value?.ad_id}: ${value?.ad_review_status || "en revisión"}`,
              meta: { adAccountId: entryId, adId: value?.ad_id, status: value?.ad_review_status, time },
              channel: "ads",
            });
          }
        }
      }

      // ═══════════════════════════════════════════════════
      // WHATSAPP BUSINESS EVENTS
      // ═══════════════════════════════════════════════════
      if (object === "whatsapp_business_account") {
        for (const change of entry.changes || []) {
          const field = change.field;
          const value = change.value;

          if (field === "messages") {
            // Incoming messages
            for (const waMsg of value?.messages || []) {
              const msgType = waMsg.type; // text, image, video, audio, document, sticker, location, contacts, interactive
              const textBody = waMsg.text?.body || waMsg.caption || `[${msgType}]`;

              await createAlert({
                type: "whatsapp_message",
                severity: "info",
                title: "💬 Mensaje — WhatsApp",
                message: `De ${waMsg.from}: "${textBody.slice(0, 120)}"`,
                meta: {
                  phoneNumberId: value?.metadata?.phone_number_id,
                  displayPhone: value?.metadata?.display_phone_number,
                  from: waMsg.from,
                  messageId: waMsg.id,
                  type: msgType,
                  time: waMsg.timestamp,
                },
                channel: "whatsapp",
              });
            }

            // Status updates (sent, delivered, read, failed)
            for (const status of value?.statuses || []) {
              if (status.status === "failed") {
                await createAlert({
                  type: "whatsapp_failed",
                  severity: "warning",
                  title: "⚠️ Mensaje fallido — WhatsApp",
                  message: `Mensaje a ${status.recipient_id} falló. Error: ${status.errors?.[0]?.message || "desconocido"}`,
                  meta: {
                    phoneNumberId: value?.metadata?.phone_number_id,
                    recipientId: status.recipient_id,
                    errors: status.errors,
                    time: status.timestamp,
                  },
                  channel: "whatsapp",
                });
              }
              // Log other statuses
              console.log(`[WEBHOOK] 📱 WhatsApp status: ${status.status} for ${status.recipient_id}`);
            }
          }

          // Template status updates
          if (field === "message_template_status_update") {
            const statusMap: Record<string, string> = {
              APPROVED: "✅ aprobada",
              REJECTED: "🚫 rechazada",
              PENDING: "⏳ pendiente",
              DISABLED: "⛔ deshabilitada",
              PAUSED: "⏸️ pausada",
            };
            const statusText = statusMap[value?.event] || value?.event || "actualizada";

            await createAlert({
              type: "wa_template_status",
              severity: value?.event === "REJECTED" || value?.event === "DISABLED" ? "warning" : "info",
              title: `📋 Plantilla ${statusText} — WhatsApp`,
              message: `Plantilla "${value?.message_template_name}" (ID: ${value?.message_template_id}) fue ${statusText}. Razón: ${value?.reason || "N/A"}`,
              meta: {
                templateId: value?.message_template_id,
                templateName: value?.message_template_name,
                event: value?.event,
                reason: value?.reason,
                time,
              },
              channel: "whatsapp",
            });
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

// ═══════════════════════════════════════════════════════════════
// HELPER: Create alert → Notification + ProjectAlert in DB
// ═══════════════════════════════════════════════════════════════

async function createAlert(alert: {
  type: string;
  severity: string;
  title: string;
  message: string;
  meta?: any;
  channel?: string;
}) {
  try {
    console.log(`[WEBHOOK] 📌 Alert: [${alert.severity.toUpperCase()}] ${alert.title}`);

    // Find projects linked to the source (page, IG, ad account)
    const projects = await prisma.project.findMany({
      where: { status: "Activo" },
      include: {
        channels: true,
        workspace: {
          select: {
            members: { select: { userId: true } },
          },
        },
      },
    });

    for (const project of projects) {
      const metaChannel = project.channels.find((c) => {
        const cfg = c.config as any;
        return cfg?.platformId === "meta" || c.type === "FACEBOOK";
      });

      if (!metaChannel) continue;
      const cfg = metaChannel.config as any;

      // Check if this project is related to the webhook event
      const adAccountId = alert.meta?.adAccountId;
      const pageId = alert.meta?.pageId;
      const igAccountId = alert.meta?.igAccountId;

      let isRelated = false;

      if (adAccountId) {
        isRelated = cfg.adAccounts?.some((a: string) =>
          a.includes(adAccountId) || adAccountId.includes(a)
        );
      } else if (pageId) {
        isRelated = cfg.pageId === pageId || cfg.pages?.some?.((p: any) => p.id === pageId);
      } else if (igAccountId) {
        isRelated = cfg.igAccountId === igAccountId || cfg.instagramAccounts?.some?.((a: any) => a.id === igAccountId);
      } else {
        // Can't determine — skip to avoid noise
        isRelated = false;
      }

      if (!isRelated) continue;

      // Create ProjectAlert for tracking
      try {
        await prisma.projectAlert.create({
          data: {
            projectId: project.id,
            type: alert.type,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
          },
        });
      } catch (dbErr) {
        console.error("[WEBHOOK] Failed to create ProjectAlert:", dbErr);
      }

      // Create in-app notifications for all workspace members
      const members = project.workspace?.members || [];
      for (const member of members) {
        try {
          await prisma.notification.create({
            data: {
              userId: member.userId,
              type: alert.type,
              title: `${project.name}: ${alert.title}`,
              message: alert.message,
              link: getAlertLink(alert, project.id),
            },
          });
        } catch (notifErr) {
          console.error("[WEBHOOK] Failed to create notification:", notifErr);
        }
      }

      console.log(`[WEBHOOK] ✅ Alert saved for "${project.name}": ${alert.title}`);
    }
  } catch (err) {
    console.error("[WEBHOOK] Failed to create alert:", err);
  }
}

/**
 * Determine the best link for the notification based on alert type
 */
function getAlertLink(alert: { type: string; meta?: any; channel?: string }, projectId: string): string {
  const base = `/dashboard`;

  switch (alert.channel) {
    case "messenger":
    case "instagram":
    case "whatsapp":
      return `${base}/publisher?tab=inbox`;
    case "facebook":
      if (alert.type.includes("comment") || alert.type.includes("mention")) {
        return `${base}/publisher?tab=listening`;
      }
      return `${base}/publisher?tab=streams`;
    case "ads":
      return `${base}/proyectos/${projectId}`;
    default:
      return `${base}/proyectos/${projectId}`;
  }
}

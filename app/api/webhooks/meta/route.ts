import { NextRequest, NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { resolveWorkspaceFromPhone } from "@/lib/whatsapp";
import { resolveWorkspaceForMetaAsset, persistInboundMessage, type InboxPlatform } from "@/lib/inbox-store";
import { env } from "@/lib/env";

/**
 * Persiste un DM entrante de Messenger/IG en el inbox (tiempo real). Resuelve el
 * workspace dueño del activo y deduplica por mid. No bloquea el webhook: cualquier
 * fallo se loguea y sigue. Los "echo" (mensajes enviados por la propia página) se
 * guardan como sender "page" para reflejar respuestas hechas fuera de Sodare.
 */
async function persistMetaDm(
  platform: InboxPlatform,
  kind: "page" | "ig_account",
  assetId: string,
  msg: {
    sender?: { id?: string };
    recipient?: { id?: string };
    timestamp?: number | string;
    message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: unknown[] };
  },
): Promise<void> {
  try {
    if (!msg.message) return;
    const isEcho = !!msg.message.is_echo;
    const contactId = isEcho ? msg.recipient?.id : msg.sender?.id;
    if (!assetId || !contactId) return;
    const workspaceId = await resolveWorkspaceForMetaAsset(assetId, kind);
    if (!workspaceId) {
      logger.warn("[WEBHOOK] persistMetaDm: workspace not resolved — message dropped", {
        platform, kind, assetId, contactId, mid: msg.message.mid,
      });
      return;
    }
    await persistInboundMessage({
      workspaceId,
      platform,
      pageId: assetId,
      contactId,
      mid: msg.message.mid ?? null,
      text: msg.message.text || (msg.message.attachments?.length ? "📎 Adjunto" : ""),
      timestampMs: typeof msg.timestamp === "string" ? Number(msg.timestamp) : (msg.timestamp ?? Date.now()),
      sender: isEcho ? "page" : "user",
    });
  } catch (err) {
    logger.warn("[WEBHOOK] persistMetaDm failed", {
      platform,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

const VERIFY_TOKEN = env.META_WEBHOOK_VERIFY_TOKEN;

/**
 * GET — Meta Webhook Verification
 * Meta sends: hub.mode=subscribe, hub.challenge=<random>, hub.verify_token=<your_token>
 * We must return hub.challenge as plain text if verify_token matches.
 */
export async function GET(req: NextRequest) {
  if (!VERIFY_TOKEN) {
    logger.error("[WEBHOOK] META_WEBHOOK_VERIFY_TOKEN not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logger.info("[WEBHOOK] ✅ Verification successful");
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  logger.warn("[WEBHOOK] ❌ Verification failed — token mismatch");
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
    const appSecret = env.FACEBOOK_CLIENT_SECRET;

    // Reject if app secret is not configured
    if (!appSecret) {
      logger.error("[WEBHOOK] FACEBOOK_CLIENT_SECRET not set");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // Reject if signature is missing
    if (!signature) {
      logger.warn("[WEBHOOK] ❌ Missing X-Hub-Signature-256 — rejecting");
      return NextResponse.json({ error: "Missing signature" }, { status: 403 });
    }

    // Verify HMAC with timing-safe comparison
    const { createHmac, timingSafeEqual } = await import("crypto");
    const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      logger.warn("[WEBHOOK] ❌ HMAC mismatch — possible spoofed request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body = JSON.parse(rawBody);
    const object = body.object; // "page", "instagram", "ad_account", "whatsapp_business_account"

    // No loguear el body completo para evitar fugas de PII en Vercel Logs
    logger.info("Webhook received", { object, entries: body.entry?.length || 0 });

    if (!body.entry?.length) {
      return NextResponse.json({ received: true });
    }

    // Process the heavy webhook payload in the background (prevent Meta timeouts)
    after(async () => {
      try {
        await processWebhookEvents(body, object);
      } catch (err) {
        logger.error("[WEBHOOK] Background processing error:", err);
      }
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("[WEBHOOK] Critical error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function processWebhookEvents(body: any, object: string) {
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
            // Persistir en el inbox (tiempo real, modelo DB).
            await persistMetaDm("facebook_messenger", "page", entryId, msg);
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
            logger.info(`[WEBHOOK] 📧 Delivery: ${msg.delivery.mids?.length || 0} msgs delivered to ${msg.sender?.id}`);
          }

          // Message read confirmation
          if (msg.read) {
            logger.info(`[WEBHOOK] 👁️ Read: messages read by ${msg.sender?.id} up to ${msg.read.watermark}`);
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
            // Persistir en el inbox (tiempo real, modelo DB).
            await persistMetaDm("instagram_dm", "ig_account", entryId, msg);
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
            logger.info(`[WEBHOOK] 📊 Story insights for IG ${entryId}:`, JSON.stringify(value).slice(0, 200));
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

          logger.info(`[WEBHOOK] 📊 Ad Account ${entryId} — field: ${field}`, JSON.stringify(value).slice(0, 200));

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
              const phoneNumberId = value?.metadata?.phone_number_id;

              // ── Upsert en Inbox si el número está registrado en WaPhoneSource ──
              if (phoneNumberId) {
                try {
                  const resolved = await resolveWorkspaceFromPhone(phoneNumberId);
                  if (resolved) {
                    const contact = value?.contacts?.find((c: { wa_id: string }) => c.wa_id === waMsg.from);
                    const contactName = contact?.profile?.name ?? waMsg.from;
                    const timestamp = new Date(parseInt(waMsg.timestamp, 10) * 1000);
                    const conversation = await prisma.inboxConversation.upsert({
                      where: { workspaceId_externalId: { workspaceId: resolved.workspaceId, externalId: `wa_${waMsg.from}` } },
                      update: { lastMessage: textBody.slice(0, 255), lastMessageAt: timestamp, unread: true, contactName, updatedAt: new Date() },
                      create: { workspaceId: resolved.workspaceId, platform: "whatsapp", externalId: `wa_${waMsg.from}`, pageId: phoneNumberId, contactName, lastMessage: textBody.slice(0, 255), lastMessageAt: timestamp, unread: true, status: "open", tags: [] },
                    });
                    await prisma.inboxMessage.create({
                      data: { conversationId: conversation.id, externalId: waMsg.id, content: textBody, sender: "user", senderName: contactName, createdAt: timestamp },
                    });
                  }
                } catch (inboxErr) {
                  logger.warn("[WEBHOOK] Error upserting WA inbox", { phoneNumberId, error: inboxErr });
                }
              }

              await createAlert({
                type: "whatsapp_message",
                severity: "info",
                title: "💬 Mensaje — WhatsApp",
                message: `De ${waMsg.from}: "${textBody.slice(0, 120)}"`,
                meta: {
                  phoneNumberId,
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
              logger.info(`[WEBHOOK] 📱 WhatsApp status: ${status.status} for ${status.recipient_id}`);
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

}

// ═══════════════════════════════════════════════════════════════
// HELPER: Find projects linked to a specific Meta source ID
// ═══════════════════════════════════════════════════════════════

/**
 * Finds projects whose Channel config references the given Meta external IDs.
 *
 * Fast path: lookup indexado en MetaSource (externalId → projectId).
 * Slow path (solo si el cache no tiene la fuente): scan de proyectos activos,
 * y los matches se escriben a MetaSource para que el siguiente evento de la
 * misma fuente se resuelva con un solo query.
 */
async function findProjectsForEvent(meta: {
  pageId?: string;
  igAccountId?: string;
  adAccountId?: string;
}) {
  const externalId = meta.pageId ?? meta.igAccountId ?? meta.adAccountId;
  if (!externalId) return [];

  const normalizedId = externalId.replace(/^act_/, "");
  const kind = meta.pageId ? "page" : meta.igAccountId ? "instagram" : "ad_account";

  // ── Fast path: MetaSource cache ──
  const sources = await prisma.metaSource.findMany({
    where: { externalId: { in: [externalId, normalizedId] } },
    select: { projectId: true },
  });
  if (sources.length > 0) {
    return prisma.project.findMany({
      where: {
        id: { in: sources.map((s) => s.projectId) },
        status: "Activo",
      },
      select: {
        id: true,
        name: true,
        workspaceId: true,
        workspace: {
          select: { members: { select: { userId: true } } },
        },
      },
    });
  }

  // ── Slow path: Optimizado para escanear solo canales Meta ──
  // Previene el colapso del Pool de Base de Datos al no cargar
  // el árbol completo de todos los proyectos inactivos o no-Meta.
  // El formulario de proyecto guarda los canales Meta como type "META"
  // (platformId.toUpperCase()); "FACEBOOK" es la forma legacy. Sin "META" el
  // ruteo de eventos (comentarios/leads/ads) a proyectos del formulario fallaba.
  // Mismo criterio que app/api/alerts/check (platformId "meta" || type FACEBOOK).
  const metaChannels = await prisma.channel.findMany({
    where: { type: { in: ["FACEBOOK", "META"] } },
    select: {
      projectId: true,
      config: true,
      project: {
        select: {
          id: true,
          name: true,
          workspaceId: true,
          status: true,
          workspace: {
            select: { members: { select: { userId: true } } },
          },
        },
      },
    },
  });

  type ProjectMatched = {
    id: string;
    name: string;
    workspaceId: string;
    workspace: {
      members: { userId: string }[];
    } | null;
  };

  const matchedProjects = new Map<string, ProjectMatched>();

  for (const c of metaChannels) {
    if (c.project.status !== "Activo") continue;

    const cfg = c.config as Record<string, unknown> | null;
    if (!cfg) continue;

    let isMatch = false;
    if (meta.adAccountId) {
      const accounts = cfg.adAccounts as string[] | undefined;
      isMatch = accounts?.some(
        (a) => a.includes(meta.adAccountId!) || meta.adAccountId!.includes(a)
      ) ?? false;
    } else if (meta.pageId) {
      const pages = cfg.pages as Array<{ id: string }> | undefined;
      isMatch = cfg.pageId === meta.pageId || pages?.some((p) => p.id === meta.pageId) === true;
    } else if (meta.igAccountId) {
      const accounts = cfg.instagramAccounts as Array<{ id: string }> | undefined;
      isMatch =
        cfg.igAccountId === meta.igAccountId ||
        accounts?.some((a) => a.id === meta.igAccountId) === true;
    }

    if (isMatch) {
      // Remover status para cumplir con el tipo de retorno original
      const { status, ...projectData } = c.project;
      matchedProjects.set(c.projectId, projectData);
    }
  }

  const matched = Array.from(matchedProjects.values());

  // Poblar el cache para resolver futuros eventos de esta fuente en O(1).
  if (matched.length > 0) {
    try {
      await prisma.metaSource.createMany({
        data: matched.map((p) => ({
          externalId: normalizedId,
          kind,
          projectId: p.id,
        })),
        skipDuplicates: true,
      });
    } catch (cacheErr) {
      logger.warn("MetaSource cache write failed", { externalId: normalizedId, error: cacheErr });
    }
  }

  return matched;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Create alert → Notification + ProjectAlert in DB
// ═══════════════════════════════════════════════════════════════

async function createAlert(alert: {
  type: string;
  severity: string;
  title: string;
  message: string;
  meta?: Record<string, unknown>;
  channel?: string;
}) {
  try {
    logger.info(`[WEBHOOK] 📌 Alert: [${alert.severity.toUpperCase()}] ${alert.title}`);

    // Resolve only the projects related to this specific event source
    const projects = await findProjectsForEvent({
      pageId: alert.meta?.pageId as string | undefined,
      igAccountId: alert.meta?.igAccountId as string | undefined,
      adAccountId: alert.meta?.adAccountId as string | undefined,
    });

    // ── Fallback para alertas CRÍTICAS sin proyecto resuelto ──────────────
    // Eventos como account_spending_limit_reached / funding_source_removed /
    // ad_disapproved son críticos: si la fuente no está mapeada a ningún
    // proyecto, antes la alerta se perdía en un console.log. Ahora resolvemos
    // el workspace dueño de la cuenta y notificamos a sus OWNER/ADMIN.
    if (projects.length === 0 && alert.severity === "critical") {
      await notifyWorkspaceFallback(alert);
      return;
    }

    for (const project of projects) {
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
        logger.error("[WEBHOOK] Failed to create ProjectAlert:", dbErr);
      }

      // Create in-app notifications for all workspace members — batched
      const members = project.workspace?.members ?? [];
      if (members.length > 0) {
        try {
          await prisma.notification.createMany({
            data: members.map((member) => ({
              userId: member.userId,
              type: alert.type,
              title: `${project.name}: ${alert.title}`,
              message: alert.message,
              link: getAlertLink(alert, project.id),
            })),
            skipDuplicates: true,
          });
        } catch (notifErr) {
          logger.error("[WEBHOOK] Failed to create notifications:", notifErr);
        }
      }

      logger.info(`[WEBHOOK] ✅ Alert saved for "${project.name}": ${alert.title}`);
    }
  } catch (err) {
    logger.error("[WEBHOOK] Failed to create alert:", err);
  }
}



/**
 * Fallback para alertas críticas cuyo origen (página / IG / ad_account) no se
 * resolvió a ningún proyecto. Localiza el workspace dueño del activo vía
 * IntegrationAssetCache (cualquier tipo) o MetaSource y notifica a OWNER/ADMIN.
 * Si no hay workspace identificable, deja un logger.error (visible/alertable).
 */
async function notifyWorkspaceFallback(alert: {
  type: string;
  severity: string;
  title: string;
  message: string;
  meta?: Record<string, unknown>;
  channel?: string;
}) {
  const externalId =
    (alert.meta?.adAccountId as string | undefined) ??
    (alert.meta?.pageId as string | undefined) ??
    (alert.meta?.igAccountId as string | undefined);

  if (!externalId) {
    logger.error("Critical Meta alert without resolvable source", {
      type: alert.type,
      title: alert.title,
    });
    return;
  }

  const normalizedId = externalId.replace(/^act_/, "");
  const candidates = [...new Set([externalId, normalizedId, `act_${normalizedId}`])];

  // 1. IntegrationAssetCache (activos cacheados al conectar/sincronizar)
  let workspaceId: string | null = null;
  const asset = await prisma.integrationAssetCache.findFirst({
    where: { externalId: { in: candidates } },
    select: { workspaceId: true },
  });
  workspaceId = asset?.workspaceId ?? null;

  // 2. MetaSource → proyecto → workspace (fuente mapeada a proyecto inactivo, etc.)
  if (!workspaceId) {
    const source = await prisma.metaSource.findFirst({
      where: { externalId: { in: candidates } },
      select: { project: { select: { workspaceId: true } } },
    });
    workspaceId = source?.project?.workspaceId ?? null;
  }

  if (!workspaceId) {
    logger.error("Critical Meta alert: no workspace owns the source", {
      type: alert.type,
      title: alert.title,
      externalId: normalizedId,
    });
    return;
  }

  const admins = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: { in: ["OWNER", "ADMIN"] } },
    select: { userId: true },
  });

  if (admins.length === 0) {
    logger.error("Critical Meta alert: workspace has no OWNER/ADMIN", {
      type: alert.type,
      workspaceId,
    });
    return;
  }

  await prisma.notification.createMany({
    data: admins.map((m) => ({
      userId: m.userId,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      link: "/dashboard/proyectos",
    })),
    skipDuplicates: true,
  });

  logger.warn("Critical Meta alert routed to workspace admins (no project match)", {
    type: alert.type,
    workspaceId,
    externalId: normalizedId,
    notified: admins.length,
  });
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
      return `${base}/inbox`;
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

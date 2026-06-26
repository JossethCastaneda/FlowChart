import { NextRequest, NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { resolveVariableBag } from "@/lib/botmaker/aliases";
import type { CanonicalFieldSnapshot } from "@/lib/botmaker/aliases";
import { maskPhone, maskNip, maskEmail } from "@/lib/botmaker/normalize";

/**
 * POST /api/botmaker/webhook
 *
 * Receives session/conversation events from Botmaker and persists
 * BotmakerLeadRequest + field snapshots + Intelix + Zapier records.
 *
 * Expected payload:
 * {
 *   "sessionId": "...",          // required
 *   "botId": "...",
 *   "channelId": "...",
 *   "platform": "whatsapp",
 *   "event": "session_closed",
 *   "variables": {               // Botmaker variable bag
 *     "NombreCliente": { "value": "Juan" },
 *     "Nip_cliente": { "value": "1234" },
 *     ...
 *   },
 *   "intelixResponse": { ... },  // optional — Intelix CRM response
 *   "zapierResponse": { ... }    // optional — Zapier webhook response
 * }
 *
 * Env vars:
 *   BOTMAKER_WEBHOOK_SECRET     — HMAC-SHA256 secret (optional, validates X-Botmaker-Signature)
 *   BOTMAKER_BOT_WORKSPACE_MAP  — JSON map { botId: workspaceId }
 *   BOTMAKER_STORE_RAW_PAYLOADS — "true" to store Intelix/Zapier raw payloads
 */
export async function POST(req: NextRequest) {
  try {
    // ── 1. Security: validate webhook secret ──────────────────────────────────
    const secret = process.env.BOTMAKER_WEBHOOK_SECRET;
    if (secret) {
      const sig = req.headers.get("x-botmaker-signature") ?? req.headers.get("x-hub-signature-256") ?? "";
      if (!sig || !sig.startsWith("sha256=")) {
        return NextResponse.json({ error: "Missing or invalid signature" }, { status: 401 });
      }
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    const rawBody = await req.text();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // ── 3. Extract core fields ─────────────────────────────────────────────────
    const sessionId = String(payload.sessionId ?? payload.chatId ?? payload.id ?? "");
    const botId = String(payload.botId ?? payload.bot_id ?? "");
    const channelId = String(payload.channelId ?? payload.channel_id ?? "");
    const platform = String(payload.platform ?? "unknown");
    const event = String(payload.event ?? "unknown");

    // Normalize Botmaker variable bag → Map<CanonicalField, CanonicalFieldSnapshot>
    const rawVars = (payload.variables ?? {}) as Record<string, unknown>;
    // Convert to format expected by resolveVariableBag: Record<string, { value: string }>
    const normalizedVars: Record<string, { value: string }> = {};
    for (const [k, v] of Object.entries(rawVars)) {
      if (v !== null && v !== undefined) {
        if (typeof v === "object" && "value" in (v as object)) {
          normalizedVars[k] = { value: String((v as { value: unknown }).value ?? "") };
        } else {
          normalizedVars[k] = { value: String(v) };
        }
      }
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // ── 4. Resolve workspace ──────────────────────────────────────────────────
    const botMapping: Record<string, string> = process.env.BOTMAKER_BOT_WORKSPACE_MAP
      ? JSON.parse(process.env.BOTMAKER_BOT_WORKSPACE_MAP)
      : {};

    let workspaceId: string = botMapping[botId] ?? "";
    if (!workspaceId) {
      const firstWs = await prisma.workspace.findFirst({ select: { id: true } });
      workspaceId = firstWs?.id ?? "";
    }
    if (!workspaceId) {
      return NextResponse.json({ error: "Cannot resolve workspaceId" }, { status: 500 });
    }

    // ── 5. Resolve canonical variable bag ─────────────────────────────────────
    const canonicalMap = resolveVariableBag(normalizedVars, "unknown");
    const canonicalBag = new Map(canonicalMap);

    const getCanonical = (field: string) =>
      canonicalBag.get(field as import("@/lib/botmaker/aliases").CanonicalField);

    // ── 6. Determine product type and source kind ──────────────────────────────
    const productType = detectProductType(normalizedVars);
    const sourceKind = detectSourceKind(platform, normalizedVars);

    // ── 7. Derive lead status ─────────────────────────────────────────────────
    const intelixResponse = payload.intelixResponse as Record<string, unknown> | undefined;
    const zapierResponse = payload.zapierResponse as Record<string, unknown> | undefined;
    const leadStatus = deriveLeadStatus(event, canonicalBag, intelixResponse, zapierResponse);

    // ── 8. Upsert lead request in background to prevent Botmaker timeouts ──────
    const now = new Date();
    const storeRaw = process.env.BOTMAKER_STORE_RAW_PAYLOADS === "true";

    after(async () => {
      try {
        let leadRequest = await prisma.botmakerLeadRequest.findFirst({
          where: { workspaceId, sessionId },
          select: { id: true, leadStatus: true },
        });

        if (!leadRequest) {
          leadRequest = await prisma.botmakerLeadRequest.create({
            data: {
              workspaceId,
              sessionId,
              requestId: `${workspaceId.slice(0, 8)}-${sessionId.slice(0, 12)}-${Date.now()}`,
              botId: botId || null,
              channelId: channelId || null,
              platform: platform || null,
              sourceKind,
              productType,
              leadStatus,
              startedAt: now,
              lastStepName: event,
            },
            select: { id: true, leadStatus: true },
          });
        } else {
          await prisma.botmakerLeadRequest.update({
            where: { id: leadRequest.id },
            data: {
              leadStatus,
              lastStepName: event,
              botId: botId || undefined,
              channelId: channelId || undefined,
              ...(["intelix_accepted", "zapier_sent", "ads_attributed"].includes(leadStatus) ? { completedAt: now } : {}),
              ...(leadStatus === "abandoned" ? { abandonedAt: now } : {}),
            },
          });
        }

        const leadRequestId = leadRequest.id;

        // ── 9. Upsert field snapshots ─────────────────────────────────────────────
        for (const [canonicalField, snapshot] of canonicalBag.entries()) {
          const maskedValue = maskCanonicalValue(canonicalField, snapshot.rawValue);
          const normalizedValue = normalizeCanonicalValue(canonicalField, snapshot.rawValue);
          const { isValid, validationError } = validateCanonicalField(canonicalField, snapshot.rawValue);

          const existing = await prisma.botmakerLeadFieldSnapshot.findFirst({
            where: { leadRequestId, canonicalField },
            select: { id: true },
          });

          if (existing) {
            await prisma.botmakerLeadFieldSnapshot.update({
              where: { id: existing.id },
              data: {
                sourceVariableName: snapshot.sourceVariableName,
                rawValue: storeRaw ? snapshot.rawValue : null,
                normalizedValue,
                maskedValue,
                isPresent: snapshot.isPresent,
                isValid,
                validationError: isValid ? null : validationError,
                capturedAt: now,
              },
            });
          } else {
            await prisma.botmakerLeadFieldSnapshot.create({
              data: {
                leadRequestId,
                canonicalField,
                sessionId,
                sourceVariableName: snapshot.sourceVariableName,
                rawValue: storeRaw ? snapshot.rawValue : null,
                normalizedValue,
                maskedValue,
                isPresent: snapshot.isPresent,
                isValid,
                validationError: isValid ? null : validationError,
                capturedAt: now,
              },
            });
          }
        }

        // ── 10. Persist Intelix submission ────────────────────────────────────────
        if (intelixResponse) {
          const intelixCode = String(intelixResponse.code ?? intelixResponse.status ?? "unknown");
          const isAccepted = ["0", "00", "OK", "ACEPTADO", "ACCEPTED"].includes(intelixCode.toUpperCase());

          await prisma.intelixSubmission.create({
            data: {
              leadRequestId,
              sessionId,
              productType,
              status: isAccepted ? "accepted" : "rejected",
              intelixFolio: String(intelixResponse.folio ?? intelixResponse.folioId ?? "") || null,
              intelixErrorCode: isAccepted ? null : intelixCode,
              intelixErrorMessage: isAccepted ? null : String(intelixResponse.message ?? intelixResponse.descripcion ?? "") || null,
              submittedAt: now,
              requestPayload: storeRaw ? (intelixResponse as Parameters<typeof prisma.intelixSubmission.create>[0]["data"]["requestPayload"]) : undefined,
              responsePayload: storeRaw ? (intelixResponse as Parameters<typeof prisma.intelixSubmission.create>[0]["data"]["responsePayload"]) : undefined,
            },
          });
        }

        // ── 11. Persist Zapier event ──────────────────────────────────────────────
        if (zapierResponse) {
          const zapierStatus = String(zapierResponse.status ?? zapierResponse.success ?? "");
          const isSuccess = ["ok", "success", "true", "1", "200"].includes(zapierStatus.toLowerCase());

          const gaCid = String(getCanonical("ga_cid")?.rawValue ?? zapierResponse.gaCid ?? "") || null;
          const igPostId = String(getCanonical("ig_post_id")?.rawValue ?? zapierResponse.igPostId ?? "") || null;
          const fromName = String(getCanonical("from_name")?.rawValue ?? zapierResponse.fromName ?? "") || null;

          await prisma.zapierConversionEvent.create({
            data: {
              leadRequestId,
              sessionId,
              platformTarget: detectPlatformTarget(normalizedVars, gaCid, igPostId),
              status: isSuccess ? "success" : "failed",
              gaCid,
              igPostId,
              fromName,
              sentAt: now,
              responseAt: now,
              errorMessage: isSuccess ? null : String(zapierResponse.error ?? zapierResponse.message ?? "") || null,
            },
          });
        }
      } catch (dbErr) {
        console.error("[botmaker-webhook] Background DB error:", dbErr);
      }
    });

    // Respond immediately to prevent Botmaker timeout
    return NextResponse.json({ success: true, received: true });
  } catch (err) {
    console.error("[webhook]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function detectProductType(vars: Record<string, { value: string }>): string {
  const v = (vars["tipoServicio"]?.value ?? vars["tipo_servicio"]?.value ?? "").toLowerCase();
  if (v.includes("prepago") || v.includes("pre")) return "prepago";
  if (v.includes("pospago") || v.includes("pos")) return "pospago";
  return "unknown";
}

function detectSourceKind(platform: string, vars: Record<string, { value: string }>): string {
  const p = platform.toLowerCase();
  if (p.includes("whatsapp")) return "whatsapp";
  if (p.includes("messenger") || p.includes("facebook")) return "messenger";
  if (p.includes("instagram")) return "instagram";
  if (p.includes("webchat") || p.includes("web")) return "webchat";
  if (vars["igCommentId"]?.value || vars["ig_comment_id"]?.value) return "comment";
  return p || "unknown";
}

function deriveLeadStatus(
  event: string,
  bag: Map<string, CanonicalFieldSnapshot>,
  intelixResponse?: Record<string, unknown>,
  zapierResponse?: Record<string, unknown>
): string {
  if (zapierResponse) {
    const s = String(zapierResponse.status ?? "").toLowerCase();
    return ["ok", "success", "true", "200"].includes(s) ? "ads_attributed" : "zapier_failed";
  }
  if (intelixResponse) {
    const code = String(intelixResponse.code ?? intelixResponse.status ?? "");
    return ["0", "00", "OK", "ACEPTADO", "ACCEPTED"].includes(code.toUpperCase())
      ? "intelix_accepted"
      : "intelix_rejected";
  }
  const get = (f: string) => bag.get(f as import("@/lib/botmaker/aliases").CanonicalField);
  if (get("nip")?.rawValue && get("phone_to_change")?.rawValue) return "data_confirmed";
  if (get("ocr_image_url")?.rawValue) return "ocr_pending";
  if (get("nip")?.rawValue) return "nip_captured";
  if (get("phone_to_change")?.rawValue) return "phone_captured";
  if (get("name")?.rawValue || get("full_name")?.rawValue) return "name_captured";
  if (event.includes("closed") || event.includes("abandoned")) return "abandoned";
  return "started";
}

function detectPlatformTarget(
  vars: Record<string, { value: string }>,
  gaCid: string | null,
  igPostId: string | null
): string {
  if (gaCid || vars["gclid"]?.value) return "google_ads";
  if (igPostId || vars["fbclid"]?.value) return "meta_ads";
  if (vars["zapierPrepagoRespuesta"]?.value || vars["zapierPospagoRespuesta"]?.value) return "meta_ads";
  return "unknown";
}

function maskCanonicalValue(field: string, value: string): string {
  if (!value) return value;
  if (field === "nip") return maskNip(value);
  if (field === "phone_to_change" || field === "phone") return maskPhone(value);
  if (field === "email") return maskEmail(value);
  if (field === "last_name" || field === "full_name") {
    return value.length > 2 ? value[0] + "*".repeat(value.length - 2) + value[value.length - 1] : "**";
  }
  return value;
}

function normalizeCanonicalValue(field: string, value: string): string {
  if (!value) return value;
  const t = value.trim();
  if (field === "phone_to_change" || field === "phone") {
    return t.replace(/[^0-9+]/g, "").replace(/^\+52/, "").replace(/^52/, "");
  }
  if (field === "nip") return t.replace(/[^0-9]/g, "");
  if (field === "nip_expiration_date") {
    const parts = t.split(/[/\-\.]/);
    if (parts.length === 3) {
      const [a, b, c] = parts.map(p => p.trim().padStart(2, "0"));
      if (a.length === 4) return `${a}-${b}-${c}`;
      if (c.length === 4) return `${c}-${b}-${a}`;
    }
    return t;
  }
  return t;
}

function validateCanonicalField(field: string, value: string): { isValid: boolean; validationError: string | null } {
  if (!value) return { isValid: false, validationError: "Campo vacío" };
  if (field === "nip") {
    const ok = /^[0-9]{4}$/.test(value.replace(/[^0-9]/g, ""));
    return { isValid: ok, validationError: ok ? null : "NIP debe ser 4 dígitos numéricos" };
  }
  if (field === "phone_to_change" || field === "phone") {
    const n = value.replace(/[^0-9]/g, "").replace(/^52/, "");
    const ok = n.length === 10;
    return { isValid: ok, validationError: ok ? null : `Teléfono tiene ${n.length} dígitos (esperados 10)` };
  }
  return { isValid: true, validationError: null };
}

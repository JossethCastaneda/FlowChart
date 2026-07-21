import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { verifySignedRequest } from "@/lib/meta-signed-request";
import { deleteMetaDataForUser } from "@/lib/meta-data-deletion";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

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
 * - Executes the deletion immediately (tokens + Facebook account link) via
 *   lib/meta-data-deletion; failures stay "failed" for manual follow-up
 * - Returns the confirmation code so the user can track status
 */

const APP_URL = env.NEXTAUTH_URL || env.NEXT_PUBLIC_APP_URL || "https://zefirus.xyz";

export async function POST(req: NextRequest) {
  // Fallback code in case DB insert fails — always return something to Meta
  let confirmationCode: string = crypto.randomUUID();

  try {
    const body = await req.formData().catch(() => null);
    const signedRequest = body?.get("signed_request") as string | null;
    const appSecret = env.META_APP_SECRET;

    // SEGURIDAD: exigir un signed_request VERIFICADO antes de persistir. Antes, una
    // petición sin signed_request (o con META_APP_SECRET ausente) creaba una fila
    // DataDeletionRequest con metaUserId='unknown' → cualquiera podía spamear la tabla.
    if (!appSecret) {
      logger.error("[Meta Data Deletion] META_APP_SECRET no configurado");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 503 });
    }
    if (!signedRequest) {
      return NextResponse.json({ error: "signed_request requerido" }, { status: 400 });
    }
    const decoded = verifySignedRequest(signedRequest, appSecret);
    if (!decoded) {
      logger.warn("[Meta Data Deletion] ⚠️ signed_request HMAC verification failed — rejecting.");
      return NextResponse.json({ error: "Invalid signed_request" }, { status: 403 });
    }
    const metaUserId = decoded.user_id || "unknown";

    // Persist the deletion request for compliance tracking
    try {
      const deletionRequest = await prisma.dataDeletionRequest.create({
        data: {
          confirmationCode,
          metaUserId,
          status: "pending",
        },
      });
      confirmationCode = deletionRequest.confirmationCode;

      // Ejecutar el borrado REAL de inmediato: tokens de integraciones Meta
      // autorizadas por el usuario + vínculo OAuth con Facebook. Si falla,
      // la solicitud queda "failed" para reproceso/seguimiento manual.
      if (metaUserId !== "unknown") {
        try {
          await deleteMetaDataForUser(metaUserId);
          await prisma.dataDeletionRequest.update({
            where: { confirmationCode },
            data: { status: "completed", completedAt: new Date() },
          });
        } catch (deletionErr) {
          logger.error("[Meta Data Deletion] Deletion processing failed:", deletionErr);
          await prisma.dataDeletionRequest
            .update({ where: { confirmationCode }, data: { status: "failed" } })
            .catch(() => {});
        }
      }
    } catch (dbErr) {
      logger.error("[Meta Data Deletion] Failed to persist deletion request:", dbErr);
      // Still respond to Meta with a code — we log for manual follow-up
    }

    // Meta requires this exact JSON response format
    return NextResponse.json({
      url: `${APP_URL}/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    logger.error("[Meta Data Deletion] Error:", error);
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
    logger.error("[Meta Data Deletion] GET error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

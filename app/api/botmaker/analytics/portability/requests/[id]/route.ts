import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/**
 * GET /api/botmaker/analytics/portability/requests/[id]
 *
 * Returns full drilldown for a single lead request:
 * - All captured field snapshots (masked)
 * - OCR extractions
 * - All Intelix submissions
 * - All Zapier events
 * - Lead timeline (status changes)
 */
export const GET = withWorkspace(async (req: NextRequest, { workspaceId, params }) => {
  try {
    const id = (params as { id?: string })?.id;
    if (!id) return apiError("ID requerido", "MISSING_ID", 400);

    const lead = await prisma.botmakerLeadRequest.findFirst({
      where: { id, workspaceId },
      include: {
        fieldSnapshots: {
          orderBy: { capturedAt: "asc" },
        },
        ocrExtractions: {
          orderBy: { executedAt: "asc" },
        },
        intelixSubmissions: {
          orderBy: { submittedAt: "asc" },
        },
        zapierEvents: {
          orderBy: { sentAt: "asc" },
        },
      },
    });

    if (!lead) return apiError("Solicitud no encontrada", "NOT_FOUND", 404);

    // Mask sensitive fields
    const maskedSnapshots = lead.fieldSnapshots.map((f) => ({
      field: f.canonicalField,
      sourceVariable: f.sourceVariableName,
      value: f.maskedValue ?? f.normalizedValue, // Never expose rawValue
      isPresent: f.isPresent,
      isValid: f.isValid,
      validationError: f.validationError,
      capturedAt: f.capturedAt,
    }));

    const storeRaw = process.env.BOTMAKER_STORE_RAW_PAYLOADS === "true";

    return apiSuccess({
      id: lead.id,
      requestId: lead.requestId,
      sessionId: lead.sessionId,
      botId: lead.botId,
      channelId: lead.channelId,
      platform: lead.platform,
      sourceKind: lead.sourceKind,
      productType: lead.productType,
      leadStatus: lead.leadStatus,
      startedAt: lead.startedAt,
      completedAt: lead.completedAt,
      abandonedAt: lead.abandonedAt,
      lastStepName: lead.lastStepName,
      lastIntentName: lead.lastIntentName,
      lastFlowState: lead.lastFlowState,
      errorSource: lead.errorSource,
      errorCode: lead.errorCode,
      errorMessage: lead.errorMessage,
      fields: maskedSnapshots,
      ocr: lead.ocrExtractions.map((o) => ({
        id: o.id,
        extractionStatus: o.extractionStatus,
        extractedNip: o.extractedNip ? "****" + o.extractedNip.slice(-2) : null, // Always mask NIP
        hasExpirationDate: !!o.extractedNipExpirationDate,
        extractionError: o.extractionError,
        codeActionName: o.codeActionName,
        executedAt: o.executedAt,
        // Raw payload only if env allows it
        rawPayload: storeRaw ? o.rawPayload : undefined,
      })),
      intelix: lead.intelixSubmissions.map((s) => ({
        id: s.id,
        status: s.status,
        productType: s.productType,
        submittedAt: s.submittedAt,
        intelixFolio: s.intelixFolio,
        intelixErrorCode: s.intelixErrorCode,
        intelixErrorMessage: s.intelixErrorMessage,
        latencyMs: s.latencyMs,
        retryCount: s.retryCount,
        // Raw payloads only if env allows it
        requestPayload: storeRaw ? s.requestPayload : undefined,
        responsePayload: storeRaw ? s.responsePayload : undefined,
      })),
      zapier: lead.zapierEvents.map((z) => ({
        id: z.id,
        platformTarget: z.platformTarget,
        status: z.status,
        sentAt: z.sentAt,
        responseAt: z.responseAt,
        gaCid: z.gaCid,
        igPostId: z.igPostId,
        fromName: z.fromName,
        errorMessage: z.errorMessage,
      })),
    });
  } catch (err) {
    console.error("[portability/requests/[id]]", err);
    return apiError("Error obteniendo detalle de solicitud", "DETAIL_ERROR", 500);
  }
});

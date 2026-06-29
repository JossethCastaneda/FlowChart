import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/**
 * GET /api/botmaker/analytics/portability/overview
 *
 * Returns the commercial summary for Portabilidad / Cambio de Compañía:
 * started, with min data, sent to Intelix, accepted, rejected, Zapier conversions, etc.
 *
 * Query params: from, to, botId, channelId, platform, productType,
 *   sourceKind, intelixStatus, zapierStatus, withOcr, withGaCid
 */
export const GET = withWorkspace(async (req: NextRequest, { workspaceId }) => {
  try {
    const url = new URL(req.url);
    const from = new Date(url.searchParams.get("from") ?? new Date(Date.now() - 7 * 86400000).toISOString());
    const to = new Date(url.searchParams.get("to") ?? new Date().toISOString());
    const botId = url.searchParams.get("botId") ?? undefined;
    const channelId = url.searchParams.get("channelId") ?? undefined;
    const platform = url.searchParams.get("platform") ?? undefined;
    void platform;
    const sourceKind = url.searchParams.get("sourceKind") ?? undefined;
    const productType = url.searchParams.get("productType") ?? undefined;

    // Base filter
    const where = {
      workspaceId,
      startedAt: { gte: from, lte: to },
      ...(botId ? { botId } : {}),
      ...(channelId ? { channelId } : {}),
      ...(productType ? { productType } : {}),
      ...(sourceKind ? { sourceKind } : {}),
    };

    const [
      totalStarted,
      withMinData,
      withOcr,
      withOcrSuccess,
      dataConfirmed,
      sentToIntelix,
      intelixAccepted,
      intelixRejected,
      zapierSent,
      zapierSuccess,
      withGaCid,
      withIgPostId,
      byProduct,
      bySourceKind,
      byBot,
      byChannel,
      topIntelixErrors,
    ] = await Promise.all([
      // Total started
      prisma.botmakerLeadRequest.count({ where }),

      // With minimum required fields (name + phone + nip)
      prisma.botmakerLeadRequest.count({
        where: {
          ...where,
          leadStatus: { notIn: ["started"] },
        },
      }),

      // With OCR (ocr_pending or later)
      prisma.botmakerLeadRequest.count({
        where: {
          ...where,
          leadStatus: {
            in: [
              "ocr_pending", "ocr_success", "ocr_failed",
              "data_confirmed", "sent_to_intelix",
              "intelix_accepted", "intelix_rejected",
              "zapier_sent", "zapier_failed", "ads_attributed",
            ],
          },
        },
      }),

      // OCR success
      prisma.botmakerLeadRequest.count({
        where: { ...where, leadStatus: { in: ["ocr_success", "data_confirmed", "sent_to_intelix", "intelix_accepted", "intelix_rejected", "zapier_sent", "zapier_failed", "ads_attributed"] } },
      }),

      // Data confirmed
      prisma.botmakerLeadRequest.count({
        where: { ...where, leadStatus: { in: ["data_confirmed", "sent_to_intelix", "intelix_accepted", "intelix_rejected", "zapier_sent", "zapier_failed", "ads_attributed"] } },
      }),

      // Sent to Intelix
      prisma.botmakerLeadRequest.count({
        where: { ...where, leadStatus: { in: ["sent_to_intelix", "intelix_accepted", "intelix_rejected", "zapier_sent", "zapier_failed", "ads_attributed"] } },
      }),

      // Intelix accepted
      prisma.botmakerLeadRequest.count({
        where: { ...where, leadStatus: { in: ["intelix_accepted", "zapier_sent", "zapier_failed", "ads_attributed"] } },
      }),

      // Intelix rejected
      prisma.botmakerLeadRequest.count({
        where: { ...where, leadStatus: "intelix_rejected" },
      }),

      // Zapier sent
      prisma.botmakerLeadRequest.count({
        where: { ...where, leadStatus: { in: ["zapier_sent", "ads_attributed"] } },
      }),

      // Zapier success
      prisma.zapierConversionEvent.count({
        where: {
          status: "success",
          leadRequest: { ...where },
        },
      }),

      // With ga_cid
      prisma.zapierConversionEvent.count({
        where: {
          gaCid: { not: null },
          leadRequest: { ...where },
        },
      }),

      // With igPostId
      prisma.zapierConversionEvent.count({
        where: {
          igPostId: { not: null },
          leadRequest: { ...where },
        },
      }),

      // By product type
      prisma.botmakerLeadRequest.groupBy({
        by: ["productType"],
        where,
        _count: { id: true },
      }),

      // By source kind (channel type)
      prisma.botmakerLeadRequest.groupBy({
        by: ["sourceKind"],
        where,
        _count: { id: true },
      }),

      // By bot
      prisma.botmakerLeadRequest.groupBy({
        by: ["botId"],
        where,
        _count: { id: true },
      }),

      // By channel
      prisma.botmakerLeadRequest.groupBy({
        by: ["channelId"],
        where,
        _count: { id: true },
      }),

      // Top Intelix error codes
      prisma.intelixSubmission.groupBy({
        by: ["intelixErrorCode", "intelixErrorMessage"],
        where: {
          status: "rejected",
          leadRequest: { ...where },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 10000) / 100 : 0);

    return apiSuccess({
      from: from.toISOString(),
      to: to.toISOString(),
      totalStarted,
      withMinData,
      withOcr,
      withOcrSuccess,
      withOcrFailed: withOcr - withOcrSuccess,
      dataConfirmed,
      sentToIntelix,
      intelixAccepted,
      intelixRejected,
      zapierSent,
      zapierSuccess,
      withGaCid,
      withIgPostId,
      rates: {
        dataCompleteness: pct(withMinData, totalStarted),
        ocrUsage: pct(withOcr, totalStarted),
        ocrSuccess: pct(withOcrSuccess, withOcr),
        dataConfirmation: pct(dataConfirmed, totalStarted),
        intelixSend: pct(sentToIntelix, totalStarted),
        intelixAcceptance: pct(intelixAccepted, sentToIntelix),
        intelixRejection: pct(intelixRejected, sentToIntelix),
        zapierSend: pct(zapierSent, intelixAccepted),
        zapierSuccess: pct(zapierSuccess, zapierSent),
        gaCidPresence: pct(withGaCid, zapierSent),
        overallConversion: pct(intelixAccepted, totalStarted),
      },
      byProduct: Object.fromEntries(byProduct.map((r) => [r.productType, r._count.id])),
      bySourceKind: Object.fromEntries(bySourceKind.map((r) => [r.sourceKind, r._count.id])),
      byBot: Object.fromEntries(byBot.filter((r) => r.botId).map((r) => [r.botId!, r._count.id])),
      byChannel: Object.fromEntries(byChannel.filter((r) => r.channelId).map((r) => [r.channelId!, r._count.id])),
      topIntelixErrors: topIntelixErrors.map((r) => ({
        code: r.intelixErrorCode,
        message: r.intelixErrorMessage,
        count: r._count.id,
      })),
    });
  } catch (err) {
    console.error("[portability/overview]", err);
    return apiError("Error calculando resumen de portabilidad", "OVERVIEW_ERROR", 500);
  }
});

import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/**
 * GET /api/botmaker/analytics/portability/funnel
 *
 * Returns the portability commercial funnel with drop-off at each step.
 *
 * Funnel steps (in order):
 * 1. Inicio de conversación
 * 2. Selección de producto / intención
 * 3. Captura de nombre
 * 4. Captura de apellido / nombre completo
 * 5. Captura de número a cambiar
 * 6. Captura de NIP
 * 7. Captura de fecha vigencia NIP
 * 8. Carga de imagen OCR
 * 9. Extracción OCR exitosa
 * 10. Confirmación de datos
 * 11. Envío a Intelix
 * 12. Intelix aceptado
 * 13. Intelix rechazado (parallel path)
 * 14. Notificación final al usuario
 * 15. Envío a Zapier
 * 16. Conversión enviada a Ads
 */
export const GET = withWorkspace(async (req: NextRequest, { workspaceId }) => {
  try {
    const url = new URL(req.url);
    const from = new Date(url.searchParams.get("from") ?? new Date(Date.now() - 7 * 86400000).toISOString());
    const to = new Date(url.searchParams.get("to") ?? new Date().toISOString());
    const botId = url.searchParams.get("botId") ?? undefined;
    const channelId = url.searchParams.get("channelId") ?? undefined;
    const productType = url.searchParams.get("productType") ?? undefined;
    const sourceKind = url.searchParams.get("sourceKind") ?? undefined;

    const where = {
      workspaceId: workspaceId,
      startedAt: { gte: from, lte: to },
      ...(botId ? { botId } : {}),
      ...(channelId ? { channelId } : {}),
      ...(productType ? { productType } : {}),
      ...(sourceKind ? { sourceKind } : {}),
    };

    // Count leads that have each canonical field captured
    const [
      totalStarted,
      hasName,
      hasLastName,
      hasPhone,
      hasNip,
      hasNipExpiration,
      hasOcr,
      ocrSuccess,
      dataConfirmed,
      sentToIntelix,
      intelixAccepted,
      intelixRejected,
      zapierSent,
      adsAttributed,
    ] = await Promise.all([
      prisma.botmakerLeadRequest.count({ where }),

      // Has name (either name or full_name field captured)
      prisma.botmakerLeadFieldSnapshot.groupBy({
        by: ["leadRequestId"],
        where: {
          canonicalField: { in: ["name", "full_name"] },
          isPresent: true,
          leadRequest: { ...where },
        },
        _count: { leadRequestId: true },
      }).then((r) => r.length),

      // Has last_name (or full_name with space)
      prisma.botmakerLeadFieldSnapshot.groupBy({
        by: ["leadRequestId"],
        where: {
          canonicalField: { in: ["last_name", "full_name"] },
          isPresent: true,
          leadRequest: { ...where },
        },
        _count: { leadRequestId: true },
      }).then((r) => r.length),

      // Has phone
      prisma.botmakerLeadFieldSnapshot.groupBy({
        by: ["leadRequestId"],
        where: {
          canonicalField: "phone_to_change",
          isPresent: true,
          leadRequest: { ...where },
        },
        _count: { leadRequestId: true },
      }).then((r) => r.length),

      // Has NIP
      prisma.botmakerLeadFieldSnapshot.groupBy({
        by: ["leadRequestId"],
        where: {
          canonicalField: "nip",
          isPresent: true,
          leadRequest: { ...where },
        },
        _count: { leadRequestId: true },
      }).then((r) => r.length),

      // Has NIP expiration date
      prisma.botmakerLeadFieldSnapshot.groupBy({
        by: ["leadRequestId"],
        where: {
          canonicalField: "nip_expiration_date",
          isPresent: true,
          leadRequest: { ...where },
        },
        _count: { leadRequestId: true },
      }).then((r) => r.length),

      // Has OCR image
      prisma.botmakerLeadFieldSnapshot.groupBy({
        by: ["leadRequestId"],
        where: {
          canonicalField: "ocr_image_url",
          isPresent: true,
          leadRequest: { ...where },
        },
        _count: { leadRequestId: true },
      }).then((r) => r.length),

      // OCR success
      prisma.botmakerLeadRequest.count({
        where: {
          ...where,
          leadStatus: { in: ["ocr_success", "data_confirmed", "sent_to_intelix", "intelix_accepted", "intelix_rejected", "zapier_sent", "zapier_failed", "ads_attributed"] },
        },
      }),

      // Data confirmed
      prisma.botmakerLeadRequest.count({
        where: {
          ...where,
          leadStatus: { in: ["data_confirmed", "sent_to_intelix", "intelix_accepted", "intelix_rejected", "zapier_sent", "zapier_failed", "ads_attributed"] },
        },
      }),

      // Sent to Intelix
      prisma.botmakerLeadRequest.count({
        where: {
          ...where,
          leadStatus: { in: ["sent_to_intelix", "intelix_accepted", "intelix_rejected", "zapier_sent", "zapier_failed", "ads_attributed"] },
        },
      }),

      // Intelix accepted
      prisma.botmakerLeadRequest.count({
        where: {
          ...where,
          leadStatus: { in: ["intelix_accepted", "zapier_sent", "zapier_failed", "ads_attributed"] },
        },
      }),

      // Intelix rejected
      prisma.botmakerLeadRequest.count({
        where: { ...where, leadStatus: "intelix_rejected" },
      }),

      // Zapier sent
      prisma.botmakerLeadRequest.count({
        where: { ...where, leadStatus: { in: ["zapier_sent", "ads_attributed"] } },
      }),

      // Ads attributed
      prisma.botmakerLeadRequest.count({
        where: { ...where, leadStatus: "ads_attributed" },
      }),
    ]);

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 10000) / 100 : 0);
    const dropPct = (prev: number, curr: number) => (prev > 0 ? Math.round(((prev - curr) / prev) * 10000) / 100 : 0);

    const steps = [
      { step: 1, name: "Inicio de conversación", count: totalStarted, retention: 100, dropOff: 0, dropOffPct: 0 },
      { step: 2, name: "Captura de nombre", count: hasName, retention: pct(hasName, totalStarted), dropOff: totalStarted - hasName, dropOffPct: dropPct(totalStarted, hasName) },
      { step: 3, name: "Captura de apellido", count: hasLastName, retention: pct(hasLastName, totalStarted), dropOff: hasName - hasLastName, dropOffPct: dropPct(hasName, hasLastName) },
      { step: 4, name: "Número a cambiar", count: hasPhone, retention: pct(hasPhone, totalStarted), dropOff: hasLastName - hasPhone, dropOffPct: dropPct(hasLastName, hasPhone) },
      { step: 5, name: "NIP", count: hasNip, retention: pct(hasNip, totalStarted), dropOff: hasPhone - hasNip, dropOffPct: dropPct(hasPhone, hasNip) },
      { step: 6, name: "Vigencia NIP", count: hasNipExpiration, retention: pct(hasNipExpiration, totalStarted), dropOff: hasNip - hasNipExpiration, dropOffPct: dropPct(hasNip, hasNipExpiration) },
      { step: 7, name: "Imagen OCR", count: hasOcr, retention: pct(hasOcr, totalStarted), dropOff: hasNipExpiration - hasOcr, dropOffPct: dropPct(hasNipExpiration, hasOcr) },
      { step: 8, name: "OCR exitoso", count: ocrSuccess, retention: pct(ocrSuccess, totalStarted), dropOff: hasOcr - ocrSuccess, dropOffPct: dropPct(hasOcr, ocrSuccess) },
      { step: 9, name: "Confirmación de datos", count: dataConfirmed, retention: pct(dataConfirmed, totalStarted), dropOff: ocrSuccess - dataConfirmed, dropOffPct: dropPct(ocrSuccess, dataConfirmed) },
      { step: 10, name: "Envío a Intelix", count: sentToIntelix, retention: pct(sentToIntelix, totalStarted), dropOff: dataConfirmed - sentToIntelix, dropOffPct: dropPct(dataConfirmed, sentToIntelix) },
      { step: 11, name: "Intelix aceptado", count: intelixAccepted, retention: pct(intelixAccepted, totalStarted), dropOff: sentToIntelix - intelixAccepted, dropOffPct: dropPct(sentToIntelix, intelixAccepted) },
      { step: 12, name: "Envío a Zapier / Ads", count: zapierSent, retention: pct(zapierSent, totalStarted), dropOff: intelixAccepted - zapierSent, dropOffPct: dropPct(intelixAccepted, zapierSent) },
      { step: 13, name: "Conversión atribuida a Ads", count: adsAttributed, retention: pct(adsAttributed, totalStarted), dropOff: zapierSent - adsAttributed, dropOffPct: dropPct(zapierSent, adsAttributed) },
    ];

    return apiSuccess({
      from: from.toISOString(),
      to: to.toISOString(),
      totalStarted,
      intelixRejected,
      intelixRejectionRate: pct(intelixRejected, sentToIntelix),
      overallConversionRate: pct(intelixAccepted, totalStarted),
      steps,
    });
  } catch (err) {
    console.error("[portability/funnel]", err);
    return apiError("Error calculando funnel de portabilidad", "ANALYTICS_ERROR", 500);
  }
});


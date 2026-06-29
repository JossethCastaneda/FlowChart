import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/**
 * GET /api/botmaker/analytics/portability/ocr
 *
 * Returns OCR extraction analytics:
 * - Success / partial / failed counts
 * - Cases where OCR detected NIP but it wasn't saved in `nip` variable
 * - Cases where OCR detected date but it wasn't saved in expiration variable
 */
export const GET = withWorkspace(async (req: NextRequest, { workspaceId }) => {
  try {
    const url = new URL(req.url);
    const from = new Date(url.searchParams.get("from") ?? new Date(Date.now() - 7 * 86400000).toISOString());
    const to = new Date(url.searchParams.get("to") ?? new Date().toISOString());
    const botId = url.searchParams.get("botId") ?? undefined;
    const channelId = url.searchParams.get("channelId") ?? undefined;

    const leadWhere = {
      workspaceId: workspaceId,
      startedAt: { gte: from, lte: to },
      ...(botId ? { botId } : {}),
      ...(channelId ? { channelId } : {}),
    };

    const [totalExtractions, byStatus, nipMismatch, dateMismatch, topErrors] = await Promise.all([
      prisma.botmakerOcrExtraction.count({ where: { leadRequest: { ...leadWhere } } }),

      prisma.botmakerOcrExtraction.groupBy({
        by: ["extractionStatus"],
        where: { leadRequest: { ...leadWhere } },
        _count: { id: true },
      }),

      // Cases where OCR detected NIP but nip canonical field not saved
      prisma.botmakerOcrExtraction.count({
        where: {
          extractedNip: { not: null },
          leadRequest: {
            ...leadWhere,
            fieldSnapshots: {
              none: { canonicalField: "nip", isPresent: true },
            },
          },
        },
      }),

      // Cases where OCR detected date but nip_expiration_date not saved
      prisma.botmakerOcrExtraction.count({
        where: {
          extractedNipExpirationDate: { not: null },
          leadRequest: {
            ...leadWhere,
            fieldSnapshots: {
              none: { canonicalField: "nip_expiration_date", isPresent: true },
            },
          },
        },
      }),

      // Top extraction errors
      prisma.botmakerOcrExtraction.groupBy({
        by: ["extractionError"],
        where: {
          extractionStatus: { in: ["failed", "partial"] },
          extractionError: { not: null },
          leadRequest: { ...leadWhere },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 10000) / 100 : 0);
    const byStatusMap = Object.fromEntries(byStatus.map((r) => [r.extractionStatus, r._count.id]));

    return apiSuccess({
      from: from.toISOString(),
      to: to.toISOString(),
      totalExtractions,
      byStatus: byStatusMap,
      rates: {
        success: pct(byStatusMap["success"] ?? 0, totalExtractions),
        partial: pct(byStatusMap["partial"] ?? 0, totalExtractions),
        failed: pct(byStatusMap["failed"] ?? 0, totalExtractions),
      },
      inconsistencies: {
        nipDetectedNotSaved: nipMismatch,
        dateDetectedNotSaved: dateMismatch,
      },
      topErrors: topErrors.map((e) => ({
        error: e.extractionError,
        count: e._count.id,
      })),
    });
  } catch (err) {
    console.error("[portability/ocr]", err);
    return apiError("Error calculando métricas de OCR", "ANALYTICS_ERROR", 500);
  }
});


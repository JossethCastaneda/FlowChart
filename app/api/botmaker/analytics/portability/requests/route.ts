import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { maskPhone, maskEmail, maskNip } from "@/lib/botmaker/normalize";

/**
 * GET /api/botmaker/analytics/portability/requests
 *
 * Returns paginated list of lead requests with their current status.
 *
 * Query params: from, to, botId, channelId, productType, sourceKind,
 *   leadStatus, page (default 1), limit (default 50)
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
    const leadStatus = url.searchParams.get("leadStatus") ?? undefined;
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));

    const where = {
      workspaceId: workspaceId,
      startedAt: { gte: from, lte: to },
      ...(botId ? { botId } : {}),
      ...(channelId ? { channelId } : {}),
      ...(productType ? { productType } : {}),
      ...(sourceKind ? { sourceKind } : {}),
      ...(leadStatus ? { leadStatus } : {}),
    };

    const [total, requests] = await Promise.all([
      prisma.botmakerLeadRequest.count({ where }),
      prisma.botmakerLeadRequest.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          fieldSnapshots: {
            select: {
              canonicalField: true,
              isPresent: true,
              isValid: true,
              maskedValue: true,
            },
          },
          intelixSubmissions: {
            select: { status: true, intelixErrorCode: true, latencyMs: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          zapierEvents: {
            select: { status: true, platformTarget: true, gaCid: true, igPostId: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    return apiSuccess({
      from: from.toISOString(),
      to: to.toISOString(),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      requests: requests.map((r) => ({
        id: r.id,
        requestId: r.requestId,
        sessionId: r.sessionId,
        botId: r.botId,
        channelId: r.channelId,
        platform: r.platform,
        sourceKind: r.sourceKind,
        productType: r.productType,
        leadStatus: r.leadStatus,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        abandonedAt: r.abandonedAt,
        lastStepName: r.lastStepName,
        errorCode: r.errorCode,
        fields: r.fieldSnapshots.map((f) => ({
          field: f.canonicalField,
          present: f.isPresent,
          valid: f.isValid,
          value: f.maskedValue, // Always masked
        })),
        intelix: r.intelixSubmissions[0] ?? null,
        zapier: r.zapierEvents[0] ?? null,
      })),
    });
  } catch (err) {
    console.error("[portability/requests]", err);
    return apiError("Error listando solicitudes de portabilidad", "ANALYTICS_ERROR", 500);
  }
});


import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/**
 * GET /api/botmaker/analytics/portability/data-quality
 *
 * Returns field-level data capture quality:
 * - How many leads have each canonical field (name, phone, nip, etc.)
 * - Validation success rate per field
 * - Drop-off analysis by field
 */
export const GET = withWorkspace(async (req: NextRequest, { workspaceId }) => {
  try {
    const url = new URL(req.url);
    const from = new Date(url.searchParams.get("from") ?? new Date(Date.now() - 7 * 86400000).toISOString());
    const to = new Date(url.searchParams.get("to") ?? new Date().toISOString());
    const botId = url.searchParams.get("botId") ?? undefined;
    const channelId = url.searchParams.get("channelId") ?? undefined;
    const productType = url.searchParams.get("productType") ?? undefined;

    const leadWhere = {
      workspaceId: workspaceId,
      startedAt: { gte: from, lte: to },
      ...(botId ? { botId } : {}),
      ...(channelId ? { channelId } : {}),
      ...(productType ? { productType } : {}),
    };

    const totalLeads = await prisma.botmakerLeadRequest.count({ where: leadWhere });

    // Group field snapshots by canonicalField
    const fieldStats = await prisma.botmakerLeadFieldSnapshot.groupBy({
      by: ["canonicalField", "isPresent", "isValid"],
      where: { leadRequest: { ...leadWhere } },
      _count: { id: true },
    });

    // Aggregate by field
    const fieldMap = new Map<string, { present: number; valid: number; invalid: number; missing: number }>();
    for (const row of fieldStats) {
      const key = row.canonicalField;
      if (!fieldMap.has(key)) fieldMap.set(key, { present: 0, valid: 0, invalid: 0, missing: 0 });
      const entry = fieldMap.get(key)!;
      if (row.isPresent) {
        entry.present += row._count.id;
        if (row.isValid) entry.valid += row._count.id;
        else entry.invalid += row._count.id;
      } else {
        entry.missing += row._count.id;
      }
    }

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 10000) / 100 : 0);

    const fields = Array.from(fieldMap.entries()).map(([field, stats]) => ({
      field,
      present: stats.present,
      valid: stats.valid,
      invalid: stats.invalid,
      missing: stats.missing,
      captureRate: pct(stats.present, totalLeads),
      validityRate: pct(stats.valid, stats.present),
    }));

    // Most common validation errors
    const validationErrors = await prisma.botmakerLeadFieldSnapshot.groupBy({
      by: ["canonicalField", "validationError"],
      where: {
        isValid: false,
        validationError: { not: null },
        leadRequest: { ...leadWhere },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });

    return apiSuccess({
      from: from.toISOString(),
      to: to.toISOString(),
      totalLeads,
      fields,
      validationErrors: validationErrors.map((e) => ({
        field: e.canonicalField,
        error: e.validationError,
        count: e._count.id,
      })),
    });
  } catch (err) {
    console.error("[portability/data-quality]", err);
    return apiError("Error calculando calidad de captura de datos", "ANALYTICS_ERROR", 500);
  }
});


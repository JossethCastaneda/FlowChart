/* ════════════════════════════════════════════════════════════
   GET /api/reportes/public/[slug] — Vista pública sin auth
   Devuelve los datos del reporte si es activo y no expirado.
   Seguridad:
   - X-Robots-Tag: noindex para evitar indexación de links compartidos
   - Solo se devuelven campos seguros del snapshot (no report.data completo)
   ════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Campos del snapshot (ReportSnapshot en lib/reportes/generator.ts) que se exponen
 * en la vista pública. DEBEN coincidir con las claves reales del snapshot; el
 * allowlist previo listaba claves inexistentes (summary/creatives/projectMeta/channels)
 * y strippeaba kpis/topCreatives/pacing/insights → la página pública quedaba vacía.
 */
const PUBLIC_DATA_FIELDS = [
  "projectName", "projectAlias", "client", "vertical",
  "kpis", "timeSeries", "topCreatives", "pacing", "insights",
  "dateFrom", "dateTo", "generatedAt",
] as const;

function pickPublicData(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const d = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const field of PUBLIC_DATA_FIELDS) {
    if (field in d) out[field] = d[field];
  }
  return out;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const report = await prisma.report.findUnique({
      where: { slug },
      include: {
        project: { select: { name: true, alias: true, client: true, vertical: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ success: false, error: "Reporte no encontrado" }, { status: 404 });
    }

    // Check expiration
    if (report.expiresAt && new Date() > report.expiresAt) {
      return NextResponse.json({ success: false, error: "Reporte expirado" }, { status: 410 });
    }

    if (report.status !== "active") {
      return NextResponse.json({ success: false, error: "Reporte no disponible" }, { status: 403 });
    }

    // Return allowlisted data only (never dump report.data raw)
    const response = NextResponse.json({
      success: true,
      data: {
        title: report.title,
        dateFrom: report.dateFrom,
        dateTo: report.dateTo,
        data: pickPublicData(report.data),
        settings: report.settings,
        project: report.project,
        createdAt: report.createdAt,
        expiresAt: report.expiresAt,
      },
    });

    // Prevent search engines from indexing shared report links
    response.headers.set("X-Robots-Tag", "noindex, nofollow");

    return response;
  } catch (e: unknown) {
    logger.error("[API reportes/public GET]", { error: e });
    return NextResponse.json({ success: false, error: "Error interno" }, { status: 500 });
  }
}

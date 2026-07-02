/* ════════════════════════════════════════════════════════════
   GET /api/reportes/public/[slug] — Vista pública sin auth
   Devuelve los datos del reporte si es activo y no expirado.
   ════════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    // Return data without workspace details (public view)
    return NextResponse.json({
      success: true,
      data: {
        title: report.title,
        dateFrom: report.dateFrom,
        dateTo: report.dateTo,
        data: report.data,
        settings: report.settings,
        project: report.project,
        createdAt: report.createdAt,
      },
    });
  } catch (e: any) {
    console.error("[API reportes/public GET]", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

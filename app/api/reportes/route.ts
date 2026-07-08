/* ════════════════════════════════════════════════════════════
   POST /api/reportes  — Genera un nuevo reporte
   GET  /api/reportes  — Lista reportes del workspace
   ════════════════════════════════════════════════════════════ */

import { NextRequest } from "next/server";
import { withWorkspace, type WorkspaceContext } from "@/lib/api-handler";
import { apiSuccess, apiError, apiForbidden } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { buildReportData, generateReportSlug } from "@/lib/reportes/generator";
import type { ReportSettings } from "@/lib/reportes/generator";

// ── GET: listar reportes del workspace ──────────────────────
export const GET = withWorkspace(async (req: NextRequest, ctx: WorkspaceContext) => {
  const projectId = req.nextUrl.searchParams.get("projectId");

  const reports = await prisma.report.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      dateFrom: true,
      dateTo: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      project: { select: { name: true, alias: true, client: true } },
      createdBy: { select: { name: true, image: true } },
    },
  });

  return apiSuccess(reports);
});

// ── POST: generar un nuevo reporte ──────────────────────────
export const POST = withWorkspace(async (req: NextRequest, ctx: WorkspaceContext) => {
  const body = await req.json();
  const { projectId, title, dateFrom, dateTo, insightsData, settings } = body;

  if (!projectId || !title || !dateFrom || !dateTo) {
    return apiError("Faltan campos: projectId, title, dateFrom, dateTo", "VALIDATION_ERROR");
  }

  // Verify project belongs to workspace
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspaceId },
  });
  if (!project) {
    return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  }

  // Build report data
  const snapshot = await buildReportData(projectId, dateFrom, dateTo, insightsData);

  // Get workspace settings for white-label defaults
  const wsSettings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: ctx.workspaceId },
    select: { branding: true },
  });

  const branding = (wsSettings?.branding ?? {}) as Record<string, any>;
  const reportSettings: ReportSettings = {
    logoUrl: branding.logoUrl || undefined,
    ...((settings as ReportSettings) || {}),
  };

  // Default expiration: 90 days from now (never null in new reports)
  const DEFAULT_EXPIRY_DAYS = 90;
  const expiresAt = body.expiresAt
    ? new Date(body.expiresAt)
    : new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Create report
  const report = await prisma.report.create({
    data: {
      workspaceId: ctx.workspaceId,
      projectId,
      title,
      slug: generateReportSlug(),
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      data: snapshot as any,
      settings: reportSettings as any,
      createdById: ctx.userId,
      expiresAt,
    },
  });

  return apiSuccess(report);
});

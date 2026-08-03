/* ════════════════════════════════════════════════════════════
   POST /api/reportes  — Genera un nuevo reporte
   GET  /api/reportes  — Lista reportes del workspace
   ════════════════════════════════════════════════════════════ */

import { NextRequest } from "next/server";
import { z } from "zod";
import { withWorkspace, type WorkspaceContext } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import prisma from "@/lib/prisma";
import { buildReportData, generateReportSlug } from "@/lib/reportes/generator";
import type { ReportSettings } from "@/lib/reportes/generator";

const isoDate = z
  .string()
  .refine((s) => !Number.isNaN(new Date(s).getTime()), "Fecha inválida");

const CreateReportSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(300),
  dateFrom: isoDate,
  dateTo: isoDate,
  insightsData: z.unknown().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  expiresAt: isoDate.optional(),
});

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
  const parsed = await validateBody(req, CreateReportSchema);
  if (!parsed.ok) return parsed.response;
  const { projectId, title, dateFrom, dateTo, insightsData, settings, expiresAt: expiresAtRaw } = parsed.data;

  // Verify project belongs to workspace
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspaceId },
  });
  if (!project) {
    return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  }

  // Build report data
  const snapshot = await buildReportData(
    projectId,
    dateFrom,
    dateTo,
    insightsData as Parameters<typeof buildReportData>[3]
  );

  // Get workspace settings for white-label defaults
  const wsSettings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: ctx.workspaceId },
    select: { branding: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const branding = (wsSettings?.branding ?? {}) as Record<string, any>;
  const reportSettings: ReportSettings = {
    logoUrl: branding.logoUrl || undefined,
    ...((settings as ReportSettings) || {}),
  };

  // Default expiration: 90 days from now (never null in new reports)
  const DEFAULT_EXPIRY_DAYS = 90;
  const expiresAt = expiresAtRaw
    ? new Date(expiresAtRaw)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      data: snapshot as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      settings: reportSettings as any,
      createdById: ctx.userId,
      expiresAt,
    },
  });

  return apiSuccess(report);
});

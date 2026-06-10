import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withWorkspace } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { logger } from "@/lib/logger";
import {
  parseWorkflow,
  DEFAULT_WORKFLOW,
  WorkflowConfigSchema,
  BrandingSchema,
} from "@/lib/workflow-config";

/**
 * GET  /api/workspace/settings — workflow config (areas, leads, SLA). Any member.
 * PUT  /api/workspace/settings — replace areas + requireLeadReview. OWNER/ADMIN.
 *
 * Degrades gracefully to defaults if the WorkspaceSettings table isn't migrated
 * yet, so the rest of the app keeps working.
 */
export const GET = withWorkspace(async (_req, ctx) => {
  try {
    const row = await prisma.workspaceSettings.findUnique({
      where: { workspaceId: ctx.workspaceId },
    });
    const cfg = row
      ? parseWorkflow({ areas: row.areas, requireLeadReview: row.requireLeadReview })
      : DEFAULT_WORKFLOW;
    const branding = BrandingSchema.safeParse(row?.branding ?? {});
    return NextResponse.json({
      ...cfg,
      branding: branding.success ? branding.data : {},
      configured: !!row,
    });
  } catch (err) {
    logger.warn("workspace/settings read failed (table not migrated?)", {
      workspaceId: ctx.workspaceId,
      error: err,
    });
    return NextResponse.json({ ...DEFAULT_WORKFLOW, configured: false, needsMigration: true });
  }
});

export const PUT = withWorkspace(async (req, ctx) => {
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      role: { in: ["OWNER", "ADMIN"] },
    },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "Solo OWNER/ADMIN pueden editar áreas y flujos." },
      { status: 403 }
    );
  }

  // Validación estricta en escritura: payloads malformados se rechazan con 422
  // en lugar de coercionarse en silencio hacia áreas vacías.
  const result = await validateBody(
    req,
    WorkflowConfigSchema.extend({ branding: BrandingSchema.optional() })
  );
  if (!result.ok) return result.response;
  const cfg = parseWorkflow(result.data);
  const branding = result.data.branding;

  try {
    await prisma.workspaceSettings.upsert({
      where: { workspaceId: ctx.workspaceId },
      update: {
        areas: cfg.areas as unknown as object[],
        requireLeadReview: cfg.requireLeadReview,
        ...(branding !== undefined && { branding }),
      },
      create: {
        workspaceId: ctx.workspaceId,
        areas: cfg.areas as unknown as object[],
        requireLeadReview: cfg.requireLeadReview,
        ...(branding !== undefined && { branding }),
      },
    });
    return NextResponse.json({ success: true, ...cfg, ...(branding !== undefined && { branding }) });
  } catch (err: unknown) {
    logger.error("workspace/settings write failed", {
      workspaceId: ctx.workspaceId,
      error: err,
    });
    const e = err as { code?: string; message?: string };
    const tableMissing = e?.code === "P2021" || /does not exist/i.test(String(e?.message || ""));
    return NextResponse.json(
      {
        error: tableMissing
          ? "Falta la tabla en la base de datos. Aplica el schema (npm run db:push) y reintenta."
          : "No se pudo guardar la configuración.",
      },
      { status: 500 }
    );
  }
});

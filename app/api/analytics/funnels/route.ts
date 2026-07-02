import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError, apiForbidden } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { validateBody } from "@/lib/validate";
import { parseFilters, buildConversationWhere } from "@/lib/analytics/query";
import { scopeFromRequest } from "@/lib/analytics/project-scope.server";
import { evaluateConfiguredFunnel, type FunnelStepDef } from "@/lib/analytics/funnels/evaluate";
import { isWorkspaceAdmin } from "@/lib/analytics/rbac";
import { writeAuditLog } from "@/lib/analytics/audit";

// GET /api/analytics/funnels — funnel de conversión (spec §24)
// - Sin `funnelId`: funnel canónico bot→resolución (fallback) + lista de funnels
//   configurados disponibles en el alcance.
// - Con `funnelId`: evalúa el funnel configurable (pasos/condiciones) sobre las
//   conversaciones del alcance, con conversión, drop-off y tiempo entre pasos.
export const GET = withWorkspace(async (req, ctx) => {
  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);
  const scopeRes = await scopeFromRequest(sp, ctx.workspaceId);
  if (!scopeRes.ok) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);
  const scope = scopeRes.scope;
  const where = buildConversationWhere(ctx.workspaceId, filters, scope);

  // Funnels configurados disponibles en el alcance (proyecto o global del workspace).
  const available = await prisma.analyticsFunnel.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      ...(scope?.projectId ? { OR: [{ projectId: scope.projectId }, { projectId: null }] } : {}),
    },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  const funnelId = sp.get("funnelId");
  if (funnelId) {
    const funnel = available.find((f) => f.id === funnelId);
    if (!funnel) return apiError("Funnel no encontrado", "NOT_FOUND", 404);

    const conversations = await prisma.normalizedConversation.findMany({
      where,
      select: {
        id: true, status: true, outcome: true, resolvedBy: true, wasBotOnly: true,
        wasHandoff: true, tags: true, conversationStartedAt: true, closedAt: true,
      },
    });
    const convIds = conversations.map((c) => c.id);
    const messages = convIds.length
      ? await prisma.normalizedMessage.findMany({
          where: { workspaceId: ctx.workspaceId, conversationId: { in: convIds } },
          select: {
            conversationId: true, intent: true, topic: true, messageType: true,
            senderType: true, isFallback: true, sentAt: true,
          },
        })
      : [];
    const byConv = new Map<string, typeof messages>();
    for (const m of messages) {
      const arr = byConv.get(m.conversationId) || [];
      arr.push(m);
      byConv.set(m.conversationId, arr);
    }
    const withMessages = conversations.map((c) => ({ ...c, messages: byConv.get(c.id) ?? [] }));
    const stepDefs: FunnelStepDef[] = funnel.steps.map((s) => ({
      name: s.name, orderIndex: s.orderIndex,
      conditionType: s.conditionType as FunnelStepDef["conditionType"], conditionValue: s.conditionValue,
    }));

    return apiSuccess({
      funnelId: funnel.id,
      name: funnel.name,
      mode: "configured",
      steps: evaluateConfiguredFunnel(stepDefs, withMessages),
      available: available.map((f) => ({ id: f.id, name: f.name, steps: f.steps.length })),
    });
  }

  // Fallback canónico.
  const [total, engaged, noFallback, resolved] = await Promise.all([
    prisma.normalizedConversation.count({ where }),
    prisma.normalizedConversation.count({ where: { ...where, totalUserMessages: { gt: 0 } } }),
    prisma.normalizedConversation.count({ where: { ...where, totalFallbacks: 0 } }),
    prisma.normalizedConversation.count({ where: { ...where, outcome: "resolved" } }),
  ]);

  const steps = [
    { name: "Iniciaron", count: total, conversionFromPrev: 100 },
    { name: "Interactuaron", count: engaged, conversionFromPrev: total > 0 ? (engaged / total) * 100 : 0 },
    { name: "Entendidos", count: noFallback, conversionFromPrev: engaged > 0 ? (noFallback / engaged) * 100 : 0 },
    { name: "Resueltos", count: resolved, conversionFromPrev: noFallback > 0 ? (resolved / noFallback) * 100 : 0 },
  ];

  return apiSuccess({
    mode: "canonical",
    steps,
    available: available.map((f) => ({ id: f.id, name: f.name, steps: f.steps.length })),
  });
});

const StepSchema = z.object({
  name: z.string().min(1).max(120),
  orderIndex: z.number().int().min(0),
  conditionType: z.enum(["intent", "event", "message_text", "tag", "status"]),
  conditionValue: z.string().min(1).max(200),
});

const FunnelSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  projectId: z.string().optional(),
  provider: z.string().optional(),
  channel: z.string().optional(),
  botId: z.string().optional(),
  steps: z.array(StepSchema).min(1).max(20),
});

// POST /api/analytics/funnels — crea un funnel configurable (admin).
export const POST = withWorkspace(async (req, ctx) => {
  if (!(await isWorkspaceAdmin(ctx.workspaceId, ctx.userId))) {
    return apiForbidden("Solo administradores pueden crear funnels");
  }
  const result = await validateBody(req, FunnelSchema);
  if (!result.ok) return result.response;
  const data = result.data;

  if (data.projectId) {
    const p = await prisma.project.findFirst({ where: { id: data.projectId, workspaceId: ctx.workspaceId } });
    if (!p) return apiError("Proyecto no válido", "BAD_REQUEST", 400);
  }

  const funnel = await prisma.analyticsFunnel.create({
    data: {
      workspaceId: ctx.workspaceId,
      projectId: data.projectId || null,
      name: data.name,
      description: data.description || null,
      provider: data.provider || null,
      channel: data.channel || null,
      botId: data.botId || null,
      steps: { create: data.steps.map((s) => ({ ...s })) },
    },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });

  await writeAuditLog({
    workspaceId: ctx.workspaceId, projectId: data.projectId || null, userId: ctx.userId,
    action: "funnel_create", resourceType: "funnel", resourceId: funnel.id,
    metadata: { name: funnel.name, steps: funnel.steps.length },
  });
  return apiSuccess(funnel);
});

const UpdateSchema = FunnelSchema.partial().extend({ id: z.string().min(1) });

// PATCH /api/analytics/funnels — actualiza un funnel y reemplaza sus pasos (admin).
export const PATCH = withWorkspace(async (req, ctx) => {
  if (!(await isWorkspaceAdmin(ctx.workspaceId, ctx.userId))) {
    return apiForbidden("Solo administradores pueden editar funnels");
  }
  const result = await validateBody(req, UpdateSchema);
  if (!result.ok) return result.response;
  const data = result.data;

  const existing = await prisma.analyticsFunnel.findFirst({
    where: { id: data.id, workspaceId: ctx.workspaceId },
  });
  if (!existing) return apiError("Funnel no encontrado", "NOT_FOUND", 404);

  const funnel = await prisma.$transaction(async (tx) => {
    if (data.steps) {
      await tx.analyticsFunnelStep.deleteMany({ where: { funnelId: data.id } });
    }
    return tx.analyticsFunnel.update({
      where: { id: data.id },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        provider: data.provider ?? undefined,
        channel: data.channel ?? undefined,
        botId: data.botId ?? undefined,
        ...(data.steps ? { steps: { create: data.steps.map((s) => ({ ...s })) } } : {}),
      },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });
  });

  await writeAuditLog({
    workspaceId: ctx.workspaceId, projectId: existing.projectId, userId: ctx.userId,
    action: "funnel_update", resourceType: "funnel", resourceId: funnel.id,
  });
  return apiSuccess(funnel);
});

// DELETE /api/analytics/funnels?id=... — elimina un funnel (admin).
export const DELETE = withWorkspace(async (req, ctx) => {
  if (!(await isWorkspaceAdmin(ctx.workspaceId, ctx.userId))) {
    return apiForbidden("Solo administradores pueden eliminar funnels");
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return apiError("Falta id", "BAD_REQUEST", 400);
  const existing = await prisma.analyticsFunnel.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
  });
  if (!existing) return apiError("Funnel no encontrado", "NOT_FOUND", 404);

  await prisma.analyticsFunnel.delete({ where: { id } });
  await writeAuditLog({
    workspaceId: ctx.workspaceId, projectId: existing.projectId, userId: ctx.userId,
    action: "funnel_delete", resourceType: "funnel", resourceId: id,
  });
  return apiSuccess({ deleted: true });
});

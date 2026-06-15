import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";
import { resolveProjectScope } from "@/lib/analytics/project-scope.server";
import { maskIdentifier } from "@/lib/analytics/privacy";
import { canViewSensitive } from "@/lib/analytics/sensitive";
import { writeAuditLog } from "@/lib/analytics/audit";

// GET /api/projects/[id]/analytics/conversations/[conversationId]
// Detalle de una conversación, acotado: debe pertenecer al workspace de la sesión
// Y al proveedor/canal configurados del proyecto de la ruta. PII enmascarada por
// defecto; con ?reveal=1 + permiso view_sensitive se muestra sin enmascarar y se
// registra audit log. Nunca se devuelve texto crudo (solo metadatos de mensaje).
export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const { id, conversationId } = await ctx.params;

  const scope = await resolveProjectScope(ctx.workspaceId, id);
  if (!scope) return apiError("Proyecto no encontrado", "NOT_FOUND", 404);

  const reveal =
    req.nextUrl.searchParams.get("reveal") === "1" &&
    (await canViewSensitive(ctx.workspaceId, ctx.userId));

  const c = await prisma.normalizedConversation.findFirst({
    where: {
      id: conversationId,
      workspaceId: ctx.workspaceId,
      provider: { in: scope.providers },
      channel: { in: scope.channels },
    },
  });
  if (!c) return apiError("Conversación no encontrada", "NOT_FOUND", 404);

  const messages = await prisma.normalizedMessage.findMany({
    where: { workspaceId: ctx.workspaceId, conversationId: c.id },
    orderBy: { sentAt: "asc" },
    take: 1000,
    select: {
      id: true, senderType: true, messageType: true, intent: true, topic: true,
      isFallback: true, isError: true, status: true, sentAt: true,
    },
  });

  return apiSuccess({
    conversation: {
      id: c.id,
      provider: c.provider,
      channel: c.channel,
      botName: c.botName,
      agentName: c.agentName,
      queueName: c.queueName,
      skillName: c.skillName,
      customer: maskIdentifier(c.customerId),
      status: c.status,
      outcome: c.outcome,
      resolvedBy: c.resolvedBy,
      wasBotOnly: c.wasBotOnly,
      wasHandoff: c.wasHandoff,
      csatScore: c.csatScore,
      npsScore: c.npsScore,
      tags: c.tags,
      campaignId: c.campaignId,
      serviceId: c.serviceId,
      requiresReview: c.requiresReview,
      appliedRuleId: c.appliedRuleId,
      durationSeconds: c.durationSeconds,
      firstResponseTimeSeconds: c.firstResponseTimeSeconds,
      handleTimeSeconds: c.handleTimeSeconds,
      startedAt: c.conversationStartedAt.toISOString(),
      endedAt: c.conversationEndedAt?.toISOString() ?? null,
    },
    messages: messages.map((m) => ({
      id: m.id,
      senderType: m.senderType,
      messageType: m.messageType,
      intent: m.intent,
      topic: m.topic,
      isFallback: m.isFallback,
      isError: m.isError,
      status: m.status,
      sentAt: m.sentAt.toISOString(),
    })),
  });
});

export const maxDuration = 60;

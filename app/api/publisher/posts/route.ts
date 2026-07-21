import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import prisma from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import {
  startPublishWorkflowSchedule,
  validatePublisherScheduledAt,
} from "@/lib/publisher/schedule";
import { logger } from "@/lib/logger";

// GET /api/publisher/posts - list posts for workspace
export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const channel = searchParams.get("channel");
  // limit no numérico daba NaN → take: NaN → 500. Se clampa a [1, 500] con default 100.
  const limitRaw = parseInt(searchParams.get("limit") || "100", 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 100;

  const where: Prisma.ScheduledPostWhereInput = { workspaceId: ctx.workspaceId };
  if (status) {
    where.status = { in: status.split(",").map((s) => s.trim()) };
  }
  if (channel) {
    where.channels = { has: channel };
  }

  const posts = await prisma.scheduledPost.findMany({
    where,
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return apiSuccess({ posts });
});

// POST /api/publisher/posts - create a new post
export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const parsed = await validateBody(
    req,
    z.object({
      content: z.string().min(1, "El contenido es obligatorio").optional(),
      channels: z.array(z.string()).min(1, "Selecciona al menos un canal"),
      mediaUrls: z.array(z.string()).optional(),
      // Fecha válida siempre que venga (un Draft con scheduledAt basura crasheaba en
      // new Date(...) → 500). El estado solo puede ser Draft/Scheduled (no Published/
      // Publishing — evita historial falso o filas inmutables).
      scheduledAt: z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), "Fecha inválida").optional(),
      status: z.enum(["Draft", "Scheduled"]).optional(),
      type: z.string().optional(),
      hashtags: z.array(z.string()).optional(),
      projectId: z.string().optional(),
      pageName: z.string().optional(),
      pageId: z.string().optional(),
      // El Composer envía estos y las columnas existen, pero Zod los strippeaba →
      // el texto por-plataforma y el primer comentario nunca se persistían.
      contentByPlatform: z.record(z.string(), z.string()).optional(),
      firstComment: z.string().optional(),
    })
  );

  if (!parsed.ok) return parsed.response;
  const {
    content,
    channels,
    mediaUrls,
    scheduledAt,
    status,
    type,
    hashtags,
    projectId,
    pageName,
    pageId,
    contentByPlatform,
    firstComment,
  } = parsed.data;

  if (!content || content.trim().length < 1) {
    return apiError("El contenido es obligatorio", "VALIDATION_ERROR", 400);
  }

  const validStatus = status || "Draft";
  if (validStatus === "Scheduled" && !scheduledAt) {
    return apiError("Fecha de publicacion es obligatoria para programar", "VALIDATION_ERROR", 400);
  }

  if (validStatus === "Scheduled" && scheduledAt) {
    const scheduleError = validatePublisherScheduledAt(new Date(scheduledAt));
    if (scheduleError) return apiError(scheduleError, "VALIDATION_ERROR", 400);
  }

  const post = await prisma.scheduledPost.create({
    data: {
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      content: content.trim(),
      channels,
      mediaUrls: mediaUrls || [],
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: validStatus,
      type: type || "post",
      hashtags: hashtags || [],
      projectId: projectId || null,
      pageName: pageName || null,
      pageId: pageId || null,
      contentByPlatform: contentByPlatform ?? undefined,
      firstComment: firstComment ?? null,
    },
  });

  if (post.status === "Scheduled" && post.scheduledAt) {
    try {
      const scheduleToken = await startPublishWorkflowSchedule(post.id, post.scheduledAt);
      const scheduled = await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { qStashMessageId: scheduleToken, error: null },
      });
      return apiSuccess({ post: scheduled }, 201);
    } catch (error) {
      logger.error("Failed to start publisher workflow", {
        route: "api/publisher/posts",
        postId: post.id,
        workspaceId: ctx.workspaceId,
        error,
      });
      const warning =
        "El post se guardo, pero no se pudo programar el workflow de publicacion. Revisa los logs o publicalo manualmente.";
      const broken = await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { error: warning },
      });
      return apiSuccess({ post: broken, warning }, 201);
    }
  }

  return apiSuccess({ post }, 201);
});

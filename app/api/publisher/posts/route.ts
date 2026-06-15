import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import prisma from "@/lib/prisma";
import { z } from "zod";

// GET /api/publisher/posts — list posts for workspace
export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // comma-separated: "Draft,Scheduled"
  const channel = searchParams.get("channel");
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  const where: any = { workspaceId: ctx.workspaceId };
  if (status) {
    const statuses = status.split(",").map((s) => s.trim());
    where.status = { in: statuses };
  }
  if (channel) {
    where.channels = { has: channel };
  }

  const posts = await prisma.scheduledPost.findMany({
    where,
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(limit, 500),
  });

  return apiSuccess({ posts });
});

// POST /api/publisher/posts — create a new post
export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const _validate = await validateBody(req, z.object({
    content: z.string().min(1, "El contenido es obligatorio").optional(), // Need optional so we can manually check and return specific message for backward compatibility if needed, but actually let's use zod.
    channels: z.array(z.string()).min(1, "Selecciona al menos un canal"),
    mediaUrls: z.array(z.string()).optional(),
    scheduledAt: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
    projectId: z.string().optional(),
    pageName: z.string().optional(),
    pageId: z.string().optional(),
  }));

  if (!_validate.ok) return _validate.response;
  const body = _validate.data;

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
  } = body;

  if (!content || content.trim().length < 1) {
    return apiError("El contenido es obligatorio", "VALIDATION_ERROR", 400);
  }

  const validStatus = status || "Draft";
  if (validStatus === "Scheduled" && !scheduledAt) {
    return apiError("Fecha de publicación es obligatoria para programar", "VALIDATION_ERROR", 400);
  }

  if (validStatus === "Scheduled" && scheduledAt) {
    const scheduleDate = new Date(scheduledAt);
    const diffMin = (scheduleDate.getTime() - Date.now()) / (1000 * 60);
    if (diffMin < 11) {
      return apiError("Meta requiere programar con al menos 11 minutos de antelación", "VALIDATION_ERROR", 400);
    }
    if (diffMin > (75 * 24 * 60)) {
      return apiError("Meta permite programar hasta un máximo de 75 días", "VALIDATION_ERROR", 400);
    }
  }

  const post = await prisma.scheduledPost.create({
    data: {
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      content: content.trim(),
      channels: channels || [],
      mediaUrls: mediaUrls || [],
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: validStatus,
      type: type || "post",
      hashtags: hashtags || [],
      projectId: projectId || null,
      pageName: pageName || null,
      pageId: pageId || null,
    },
  });

  return apiSuccess({ post }, 201);
});

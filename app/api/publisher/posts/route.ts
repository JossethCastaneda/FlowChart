import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { z } from "zod";
import { validateBody } from "@/lib/validate";

// GET /api/publisher/posts — list posts for workspace
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ posts: [] });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // comma-separated: "Draft,Scheduled"
    const channel = searchParams.get("channel");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const where: any = { workspaceId };
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

    return NextResponse.json({ posts });
  } catch (err: any) {
    console.error("[PUBLISHER] GET error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}

// POST /api/publisher/posts — create a new post
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(workspaceId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const _validate = await validateBody(req, z.object({ content: z.any().optional(), channels: z.any().optional(), mediaUrls: z.any().optional(), scheduledAt: z.any().optional(), status: z.any().optional(), type: z.any().optional(), hashtags: z.any().optional(), projectId: z.any().optional(), pageName: z.any().optional(), pageId: z.any().optional() }));
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

    if (!content || typeof content !== "string" || content.trim().length < 1) {
      return NextResponse.json({ error: "El contenido es obligatorio" }, { status: 400 });
    }

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return NextResponse.json({ error: "Selecciona al menos un canal" }, { status: 400 });
    }

    const validStatus = status || "Draft";
    if (validStatus === "Scheduled" && !scheduledAt) {
      return NextResponse.json({ error: "Fecha de publicación es obligatoria para programar" }, { status: 400 });
    }

    if (validStatus === "Scheduled" && scheduledAt) {
      const scheduleDate = new Date(scheduledAt);
      const diffMin = (scheduleDate.getTime() - Date.now()) / (1000 * 60);
      if (diffMin < 11) {
        return NextResponse.json({ error: "Meta requiere programar con al menos 11 minutos de antelación" }, { status: 400 });
      }
      if (diffMin > (75 * 24 * 60)) {
        return NextResponse.json({ error: "Meta permite programar hasta un máximo de 75 días" }, { status: 400 });
      }
    }

    const post = await prisma.scheduledPost.create({
      data: {
        workspaceId,
        userId: session.user.id,
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

    if (validStatus === "Scheduled" && scheduledAt) {
      // INICIO INTEGRACION WORKFLOW:
      // Programamos el post de manera durable
      // (The Vercel cron job handles picking up Scheduled posts and publishing them)
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (err: any) {
    console.error("[PUBLISHER] POST error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}

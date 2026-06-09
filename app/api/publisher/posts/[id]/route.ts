import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";
import { z } from "zod";
import { validateBody } from "@/lib/validate";

interface Params { params: Promise<{ id: string }> }

// GET /api/publisher/posts/[id]
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const post = await prisma.scheduledPost.findFirst({
      where: { id, workspaceId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

// PUT /api/publisher/posts/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(workspaceId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify post belongs to workspace
    const existing = await prisma.scheduledPost.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
    }

    // Only allow editing Draft or Scheduled posts
    if (!["Draft", "Scheduled"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Solo puedes editar posts en borrador o programados" },
        { status: 400 }
      );
    }

    const _validate = await validateBody(req, z.any());
          if (!_validate.ok) return _validate.response;
          const body = _validate.data;
    const updateData: any = {};

    if (body.content !== undefined) updateData.content = body.content;
    if (body.channels !== undefined) updateData.channels = body.channels;
    if (body.mediaUrls !== undefined) updateData.mediaUrls = body.mediaUrls;
    if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.hashtags !== undefined) updateData.hashtags = body.hashtags;
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.pageName !== undefined) updateData.pageName = body.pageName;
    if (body.pageId !== undefined) updateData.pageId = body.pageId;

    if (updateData.status === "Scheduled" && !updateData.scheduledAt && !existing.scheduledAt) {
      return NextResponse.json({ error: "Fecha requerida para programar" }, { status: 400 });
    }

    const post = await prisma.scheduledPost.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ post });
  } catch (err: any) {
    console.error("[PUBLISHER] PUT error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

// DELETE /api/publisher/posts/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(workspaceId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.scheduledPost.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
    }

    await prisma.scheduledPost.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

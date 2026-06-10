import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import {
  getActiveWorkspaceId,
  ACTIVE_WORKSPACE_COOKIE,
} from "@/lib/active-workspace";
import { z } from "zod";
import { validateBody } from "@/lib/validate";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.user.id },
      include: {
        workspace: {
          include: {
            _count: { select: { members: true, projects: true } },
          },
        },
      },
      orderBy: { workspace: { createdAt: "asc" } },
    });

    const activeId = await getActiveWorkspaceId(session.user.id);

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      memberCount: m.workspace._count.members,
      projectCount: m.workspace._count.projects,
      createdAt: m.workspace.createdAt,
    }));

    // Ordenar: active primero
    workspaces.sort((a, b) => {
      if (a.id === activeId) return -1;
      if (b.id === activeId) return 1;
      return 0;
    });

    return NextResponse.json({ data: workspaces });
  } catch (err: any) {
    console.error("[WORKSPACE] GET error:", err);
    return NextResponse.json(
      { error: "Error al obtener workspaces" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
    try {
          const result = await validateBody(req, RequestSchema);
          if (!result.ok) return result.response;
          const { name } = result.data;
          
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }




    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "El nombre del workspace debe tener al menos 2 caracteres" },
        { status: 400 }
      );
    }

    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let attempts = 0;

    while (attempts < 10) {
      const existing = await prisma.workspace.findUnique({ where: { slug } });
      if (!existing) break;
      attempts++;
      slug = `${baseSlug}-${attempts}`;
    }

    console.log("[WORKSPACE] Creating workspace for user:", session.user.id, "slug:", slug);

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        slug,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
    });

    console.log("[WORKSPACE] Created successfully:", workspace.id);

    return NextResponse.json({ data: { id: workspace.id, name: workspace.name, slug: workspace.slug } }, { status: 201 });
    } catch (err: any) {
    console.error("[WORKSPACE] Error creating workspace:", err);
    return NextResponse.json(
      { error: "Error interno al crear workspace" },
      { status: 500 }
    );
    }
}

let RequestSchema = z.object({ name: z.string().min(2, "Name required") });

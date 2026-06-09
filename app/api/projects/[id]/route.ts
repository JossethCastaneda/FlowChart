import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/projects/[id] — get a single project
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { id } = await context.params;
    
    const project = await prisma.project.findUnique({
      where: { id },
      include: { channels: true },
    });

    if (!project) return apiNotFound("Proyecto no encontrado");

    const authorized = await verifyWorkspaceAccess(project.workspaceId, session.user.id);
    if (!authorized) return apiForbidden("No tienes acceso a este proyecto");

    return apiSuccess(project);
  } catch (error) {
    return apiServerError(error);
  }
}

// ---------------------------------------------------------------------------
// PUT /api/projects/[id] — update a project
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { id } = await context.params;
    
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) return apiNotFound("Proyecto no encontrado");

    const authorized = await verifyWorkspaceAccess(project.workspaceId, session.user.id);
    if (!authorized) return apiForbidden("No tienes acceso a este proyecto");

    const body = await request.json();

    // Separate channels from the rest of the update data
    const { channels, ...updateData } = body;

    // Only pass through fields that exist on the Project model
    const allowedFields = [
      "name",
      "alias",
      "client",
      "vertical",
      "fanpage",
      "instagram",
      "whatsapp",
      "website",
      "persona",
      "geo",
      "status",
      "dateStart",
      "dateEnd",
    ] as const;

    const sanitized: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in updateData) {
        sanitized[field] = updateData[field];
      }
    }

    // Update project fields
    const updatedProject = await prisma.project.update({
      where: { id },
      data: sanitized,
    });

    // FIX: use $transaction — delete + recreate channels atomically
    if (Array.isArray(channels)) {
      await prisma.$transaction(async (tx) => {
        await tx.channel.deleteMany({ where: { projectId: id } });
        if (channels.length > 0) {
          await tx.channel.createMany({
            data: channels.map((c: { name: string; type: string; config?: any }) => ({
              name: c.name,
              type: c.type,
              config: c.config ?? null,
              projectId: id,
            })),
          });
        }
      });
    }

    // Re-fetch with channels
    const result = await prisma.project.findUnique({
      where: { id },
      include: { channels: true },
    });

    return apiSuccess(result);
  } catch (error) {
    return apiServerError(error);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/projects/[id] — delete a project
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { id } = await context.params;
    
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) return apiNotFound("Proyecto no encontrado");

    // Only OWNER/ADMIN can delete projects
    const authorized = await verifyWorkspaceAccess(project.workspaceId, session.user.id, ["OWNER", "ADMIN"]);
    if (!authorized) return apiForbidden("Solo OWNER o ADMIN pueden eliminar proyectos");

    // Cascade delete handles channels, briefs, members, etc.
    await prisma.project.delete({ where: { id } });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiServerError(error);
  }
}

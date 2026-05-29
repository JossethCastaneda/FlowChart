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

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// Helper: verify the user can access a project (via workspace membership)
// ---------------------------------------------------------------------------
async function verifyProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { channels: true },
  });

  if (!project) return { project: null, authorized: false, notFound: true };

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: project.workspaceId,
        userId,
      },
    },
  });

  return {
    project,
    authorized: !!membership,
    notFound: false,
  };
}

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
    const { project, authorized, notFound } = await verifyProjectAccess(
      id,
      session.user.id
    );

    if (notFound) return apiNotFound("Proyecto no encontrado");
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
    const { project, authorized, notFound } = await verifyProjectAccess(
      id,
      session.user.id
    );

    if (notFound) return apiNotFound("Proyecto no encontrado");
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

    // If channels are provided, replace existing ones (delete + recreate)
    if (Array.isArray(channels)) {
      await prisma.channel.deleteMany({ where: { projectId: id } });

      if (channels.length > 0) {
        await prisma.channel.createMany({
          data: channels.map((c: { name: string; type: string; config?: any }) => ({
            name: c.name,
            type: c.type,
            config: c.config ?? null,
            projectId: id,
          })),
        });
      }
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
    const { project, authorized, notFound } = await verifyProjectAccess(
      id,
      session.user.id
    );

    if (notFound) return apiNotFound("Proyecto no encontrado");
    if (!authorized) return apiForbidden("No tienes acceso a este proyecto");

    // Cascade delete handles channels, briefs, members, etc.
    await prisma.project.delete({ where: { id } });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiServerError(error);
  }
}

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiError,
  apiServerError,
} from "@/lib/api-response";

// ---------------------------------------------------------------------------
// GET /api/projects — list all projects the user has access to
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    // Filtrar por workspace ACTIVO (no todos los workspaces)
    const activeWorkspaceId = await getActiveWorkspaceId(session.user.id);
    if (!activeWorkspaceId) {
      return apiSuccess([]);
    }

    const projects = await prisma.project.findMany({
      where: { workspaceId: activeWorkspaceId },
      include: { channels: true },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(projects);
  } catch (error) {
    return apiServerError(error);
  }
}

// ---------------------------------------------------------------------------
// POST /api/projects — create a new project
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const body = await request.json();

    // Validate required fields
    const { name } = body;
    let { workspaceId } = body;

    if (!name) {
      return apiError(
        "El campo 'name' es obligatorio",
        "VALIDATION_ERROR",
        400
      );
    }

    // Infer workspaceId from active workspace if not provided
    if (!workspaceId) {
      workspaceId = await getActiveWorkspaceId(session.user.id);
    }
    if (!workspaceId) {
      return apiError(
        "No tienes un workspace activo",
        "VALIDATION_ERROR",
        400
      );
    }

    // Verify the user is a member of the target workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return apiForbidden("No tienes acceso a este workspace");
    }

    // Extract optional fields
    const {
      alias,
      client,
      vertical,
      fanpage,
      instagram,
      whatsapp,
      website,
      persona,
      geo,
      status,
      dateStart,
      dateEnd,
      channels,
    } = body;

    // Create the project
    const project = await prisma.project.create({
      data: {
        name,
        workspaceId,
        ...(alias !== undefined && { alias }),
        ...(client !== undefined && { client }),
        ...(vertical !== undefined && { vertical }),
        ...(fanpage !== undefined && { fanpage }),
        ...(instagram !== undefined && { instagram }),
        ...(whatsapp !== undefined && { whatsapp }),
        ...(website !== undefined && { website }),
        ...(persona !== undefined && { persona }),
        ...(geo !== undefined && { geo }),
        ...(status !== undefined && { status }),
        ...(dateStart !== undefined && { dateStart }),
        ...(dateEnd !== undefined && { dateEnd }),
      },
    });

    // Create channels if provided
    if (Array.isArray(channels) && channels.length > 0) {
      await prisma.channel.createMany({
        data: channels.map((c: { name: string; type: string; config?: any }) => ({
          name: c.name,
          type: c.type,
          config: c.config ?? null,
          projectId: project.id,
        })),
      });
    }

    // Re-fetch with channels included
    const projectWithChannels = await prisma.project.findUnique({
      where: { id: project.id },
      include: { channels: true },
    });

    return apiSuccess(projectWithChannels, 201);
  } catch (error) {
    return apiServerError(error);
  }
}

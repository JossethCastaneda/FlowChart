import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth.config";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/projects-error
 *
 * Endpoint temporal que ejecuta el mismo flujo que GET /api/projects
 * pero expone el error real (en lugar de "Error interno del servidor").
 * 
 * USAR SOLO PARA DIAGNOSTICAR. ELIMINAR DESPUÉS.
 */
export async function GET(_req: NextRequest) {
  const steps: Record<string, unknown> = {};

  try {
    // Step 1: session
    steps.step = "getServerSession";
    const session = await getServerSession(authOptions);
    steps.hasSession = !!session;
    steps.userId = session?.user?.id ?? null;

    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "No session", steps }, { status: 401 });
    }

    const userId = session.user.id;

    // Step 2: active workspace
    steps.step = "getActiveWorkspaceId";
    const activeWorkspaceId = await getActiveWorkspaceId(userId);
    steps.activeWorkspaceId = activeWorkspaceId;

    if (!activeWorkspaceId) {
      return NextResponse.json({ ok: false, error: "No active workspace", steps }, { status: 200 });
    }

    // Step 3: project query
    steps.step = "prisma.project.findMany";
    const projects = await prisma.project.findMany({
      where: { workspaceId: activeWorkspaceId },
      select: { id: true, name: true, alias: true, workspaceId: true },
      orderBy: { createdAt: "desc" },
    });
    steps.projectCount = projects.length;

    return NextResponse.json({ ok: true, steps, projects }, { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack?.slice(0, 500) : undefined;
    return NextResponse.json({
      ok: false,
      failedAt: steps.step,
      steps,
      error: errorMessage,
      stack: errorStack,
    }, { status: 500 });
  }
}

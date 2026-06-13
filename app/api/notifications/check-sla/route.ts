import { safeGetSession } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSLAWarnings } from "@/lib/notifications";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * GET /api/notifications/check-sla
 *
 * Vercel Cron invoca este endpoint con GET + Authorization: Bearer <CRON_SECRET>.
 * También puede ser invocado manualmente por un usuario autenticado para revisar
 * su propio workspace.
 *
 * Cron schedule: 0 8 * * * (vercel.json)
 */
export async function GET(req: NextRequest) {
  try {
    // Cron job: verificar con CRON_SECRET via Bearer header (método Vercel estándar)
    if (verifyCronAuth(req)) {
      const workspaces = await prisma.workspace.findMany({ select: { id: true } });
      for (const ws of workspaces) {
        await checkSLAWarnings(ws.id);
      }
      return NextResponse.json({ success: true, checked: workspaces.length });
    }

    // Invocación manual: verificar sesión de usuario
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    await checkSLAWarnings(workspaceId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[SLA CHECK] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Mantener POST para compatibilidad con invocaciones manuales existentes desde el dashboard
export async function POST(req: NextRequest) {
  return GET(req);
}

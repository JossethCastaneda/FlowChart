import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

// GET /api/integrations — list integrations for the active workspace
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ data: [] });
    }

    const integrations = await prisma.integration.findMany({
      where: { workspaceId },
      select: {
        id: true,
        provider: true,
        connected: true,
        connectedAt: true,
        createdAt: true,
      },
      orderBy: { provider: "asc" },
    });

    return NextResponse.json({ data: integrations });
  } catch (err: any) {
    console.error("[INTEGRATIONS] GET error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

// DELETE /api/integrations — disconnect an integration
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(workspaceId, session.user.id, ["OWNER", "ADMIN"]);
    if (!hasAccess) {
      return NextResponse.json({ error: "Solo OWNER o ADMIN pueden desconectar integraciones" }, { status: 403 });
    }

    const { provider } = await req.json();
    if (!provider) {
      return NextResponse.json({ error: "Provider requerido" }, { status: 400 });
    }

    // Soft disconnect — keep credentials but mark as disconnected
    await prisma.integration.updateMany({
      where: { workspaceId, provider },
      data: { connected: false },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[INTEGRATIONS] DELETE error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

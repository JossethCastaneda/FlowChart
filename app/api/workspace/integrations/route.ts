import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { encryptToken } from "@/lib/encryption";
import { z } from "zod";
import { validateBody } from "@/lib/validate";

/**
 * GET: List all integrations for the active workspace.
 * All workspace members can SEE integrations.
 * Response includes `canDisconnect` flag per integration.
 */
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

    // Get user's role in this workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: session.user.id },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "No eres miembro de este workspace" }, { status: 403 });
    }

    const integrations = await prisma.integration.findMany({
      where: { workspaceId },
      select: {
        id: true,
        provider: true,
        connected: true,
        connectedAt: true,
        connectedBy: true,
        connectedUser: {
          select: { id: true, name: true, image: true },
        },
        // NEVER select credentials — contains access tokens
      },
    });

    const data = integrations.map((intg) => ({
      id: intg.id,
      provider: intg.provider,
      connected: intg.connected,
      connectedAt: intg.connectedAt,
      connectedBy: intg.connectedUser
        ? { id: intg.connectedUser.id, name: intg.connectedUser.name, image: intg.connectedUser.image }
        : null,
      // Permission: can disconnect if user is OWNER, or is the one who connected
      canDisconnect:
        membership.role === "OWNER" ||
        intg.connectedBy === session.user.id,
    }));

    return NextResponse.json({
      data,
      userRole: membership.role,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[INTEGRATIONS] List error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Connect a token-based integration (e.g. BotMaker).
 * Only OWNER/ADMIN can save tokens. The token is encrypted at rest.
 *
 * Body: { provider: string, token: string }
 */
const ConnectSchema = z.object({
  provider: z.string().min(1, "provider requerido"),
  token: z.string().min(1, "token requerido"),
});

export async function POST(req: NextRequest) {
  try {
    const result = await validateBody(req, ConnectSchema);
    if (!result.ok) return result.response;
    const { provider, token } = result.data;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    // RBAC: only OWNER or ADMIN
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: session.user.id },
      },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Solo OWNER/ADMIN pueden conectar integraciones" },
        { status: 403 }
      );
    }

    // Encrypt + upsert
    const credentials = {
      accessToken: encryptToken(token),
      connectedAt: new Date().toISOString(),
    };

    await prisma.integration.upsert({
      where: {
        workspaceId_provider: { workspaceId, provider },
      },
      create: {
        workspaceId,
        provider,
        credentials,
        connected: true,
        connectedAt: new Date(),
        connectedBy: session.user.id,
      },
      update: {
        credentials,
        connected: true,
        connectedAt: new Date(),
        connectedBy: session.user.id,
      },
    });

    console.log(`[INTEGRATIONS] ✅ ${provider} connected by ${session.user.id} for workspace ${workspaceId}`);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[INTEGRATIONS] Connect error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: Disconnect an integration.
 * Only OWNER or the user who connected can disconnect.
 */
const DisconnectSchema = z.object({ provider: z.string().min(1, "provider requerido") });

export async function DELETE(req: NextRequest) {
    try {
          const result = await validateBody(req, DisconnectSchema);
          if (!result.ok) return result.response;
          const { provider } = result.data;
          
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    if (!provider) {
      return NextResponse.json({ error: "provider requerido" }, { status: 400 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    // Check membership and role
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: session.user.id },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "No eres miembro" }, { status: 403 });
    }

    // Find the integration
    const integration = await prisma.integration.findUnique({
      where: {
        workspaceId_provider: { workspaceId, provider },
      },
    });

    if (!integration) {
      return NextResponse.json({ error: "Integración no encontrada" }, { status: 404 });
    }

    // Permission check: only OWNER or the connector can disconnect
    const canDisconnect =
      membership.role === "OWNER" ||
      integration.connectedBy === session.user.id;

    if (!canDisconnect) {
      return NextResponse.json(
        { error: "Solo el usuario que conectó esta integración o el OWNER puede desconectarla" },
        { status: 403 }
      );
    }

    // Disconnect: clear credentials, set connected = false
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        connected: false,
        credentials: {},
        connectedAt: null,
        connectedBy: null,
      },
    });

    return NextResponse.json({ success: true });
    } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[INTEGRATIONS] Disconnect error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
    }
}


import { safeGetSession } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { encryptToken } from "@/lib/encryption";
import { z } from "zod";
import { validateBody } from "@/lib/validate";
import { GOOGLE_MODULES, isModuleConnected } from "@/lib/integrations/google/registry";

/**
 * GET: List all integrations for the active workspace.
 * All workspace members can SEE integrations.
 * Response includes `canDisconnect` flag per integration.
 */
export async function GET() {
  try {
    const session = await safeGetSession();
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
        credentials: true,
      },
    });

    const data = integrations.map((intg) => {
      const creds = (intg.credentials as Record<string, any>) || {};
      let connectedModules = creds.modules || [];
      
      if (intg.provider === "google") {
        // Compute dynamically based on grantedScopes
        connectedModules = GOOGLE_MODULES.filter((m) =>
          isModuleConnected(m.id, creds.grantedScopes)
        ).map((m) => m.id);
      }
      
      const resources = creds.resources || {};

      return {
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
        connectedModules,
        resources,
      };
    });

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
  baseUrl: z.string().trim().max(500).optional(),
  refreshToken: z.string().trim().max(4000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const result = await validateBody(req, ConnectSchema);
    if (!result.ok) return result.response;
    const { provider, token, baseUrl, refreshToken } = result.data;

    const session = await safeGetSession();
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

    // Encrypt + upsert. Tokens are AES-256 encrypted; baseUrl is stored plain.
    const credentials: Record<string, unknown> = {
      accessToken: encryptToken(token),
      connectedAt: new Date().toISOString(),
    };
    if (baseUrl) credentials.baseUrl = baseUrl;
    if (refreshToken) credentials.refreshToken = encryptToken(refreshToken);

    await prisma.integration.upsert({
      where: {
        workspaceId_provider_userId: { workspaceId, provider, userId: "workspace" },
      },
      create: {
        workspaceId,
        provider,
        credentials: credentials as any,
        connected: true,
        connectedAt: new Date(),
        connectedBy: session.user.id,
      },
      update: {
        credentials: credentials as any,
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
          
    const session = await safeGetSession();
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
        workspaceId_provider_userId: { workspaceId, provider, userId: "workspace" },
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

    // Política de Google: revocar el grant en Google antes de borrar
    // las credenciales locales (best-effort — el wipe local siempre ocurre).
    if (provider === "google" || provider.startsWith("google_")) {
      const { revokeGoogleToken } = await import("@/lib/integrations/google/oauth");
      await revokeGoogleToken(
        integration.credentials as import("@/lib/integrations/google/oauth").GoogleCredentials
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


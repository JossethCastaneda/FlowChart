import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

const GoogleSourcesSchema = z.object({
  adsCustomerId: z.string().max(64).optional(),
  ga4PropertyId: z.string().max(64).optional(),
  gtmAccountId: z.string().max(64).optional(),
  gtmContainerId: z.string().max(64).optional(),
});

export interface GoogleSources {
  adsCustomerId?: string;
  ga4PropertyId?: string;
  gtmAccountId?: string;
  gtmContainerId?: string;
}

/** GET: Returns the Google resources linked to a specific project */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const project = await prisma.project.findFirst({
    where: { id, workspaceId },
    select: { id: true, googleSources: true },
  });

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json({
    success: true,
    data: (project.googleSources as GoogleSources) || {},
  });
}

/** PUT: Saves Google resource links for a specific project */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const hasAccess = await verifyWorkspaceAccess(workspaceId, jwt.sub, ["OWNER", "ADMIN"]);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const project = await prisma.project.findFirst({
    where: { id, workspaceId },
    select: { id: true, googleSources: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });


  // Verify Google is connected at workspace level
  const googleIntegration = await prisma.integration.findUnique({
    where: {
      workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" },
    },
    select: { connected: true },
  });

  if (!googleIntegration?.connected) {
    return NextResponse.json({ error: "Google not connected. Connect Google in Integrations first." }, { status: 400 });
  }

  // Parse seguro: request.json() lanza con body malformado → antes crasheaba (500).
  const rawBody = await request.json().catch(() => null);
  const parsed = GoogleSourcesSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const body = parsed.data;
  const current = (project.googleSources as GoogleSources) || {};

  const newSources: GoogleSources = {
    ...current,
    // Only update fields that are explicitly provided
    ...(body.adsCustomerId !== undefined && { adsCustomerId: body.adsCustomerId }),
    ...(body.ga4PropertyId !== undefined && { ga4PropertyId: body.ga4PropertyId }),
    ...(body.gtmAccountId !== undefined && { gtmAccountId: body.gtmAccountId }),
    ...(body.gtmContainerId !== undefined && { gtmContainerId: body.gtmContainerId }),
  };

  await prisma.project.update({
    where: { id },
    data: { googleSources: newSources as any },
  });

  return NextResponse.json({ success: true, data: newSources });
}

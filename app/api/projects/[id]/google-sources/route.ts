import { NextRequest, NextResponse } from "next/server";
import { withWorkspace, withWorkspaceRole } from "@/lib/api-handler";
import { z } from "zod";
import prisma from "@/lib/prisma";

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
export const GET = withWorkspace(async (request, ctx) => {
  const { id } = await ctx.params;
  const workspaceId = ctx.workspaceId;

  const project = await prisma.project.findFirst({
    where: { id, workspaceId },
    select: { id: true, googleSources: true },
  });

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json({
    success: true,
    data: (project.googleSources as GoogleSources) || {},
  });
});

/** PUT: Saves Google resource links for a specific project */
export const PUT = withWorkspaceRole(["OWNER", "ADMIN"])(async (request, ctx) => {
  const { id } = await ctx.params;
  const workspaceId = ctx.workspaceId;

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
    ...(body.adsCustomerId !== undefined && { adsCustomerId: body.adsCustomerId }),
    ...(body.ga4PropertyId !== undefined && { ga4PropertyId: body.ga4PropertyId }),
    ...(body.gtmAccountId !== undefined && { gtmAccountId: body.gtmAccountId }),
    ...(body.gtmContainerId !== undefined && { gtmContainerId: body.gtmContainerId }),
  };

  // Validación Z11: Asegurar que los assets de Google pertenezcan al Workspace usando IntegrationAssetCache
  const validateOwnership = async (assetType: string, externalId: string | undefined) => {
    if (!externalId) return true; // Si es undefined (desvincular o no se modificó), o si es string vacío, pasamos
    const cache = await prisma.integrationAssetCache.findFirst({
      where: { workspaceId, provider: "google", assetType, externalId }
    });
    return !!cache;
  };

  if (body.adsCustomerId && !(await validateOwnership("google_ads", body.adsCustomerId))) {
    return NextResponse.json({ error: `La cuenta de Google Ads (${body.adsCustomerId}) no está vinculada al workspace. Conéctala en Integraciones primero.` }, { status: 403 });
  }
  if (body.ga4PropertyId && !(await validateOwnership("ga4_property", body.ga4PropertyId))) {
    return NextResponse.json({ error: `La propiedad de GA4 (${body.ga4PropertyId}) no está vinculada al workspace. Conéctala en Integraciones primero.` }, { status: 403 });
  }
  if (body.gtmAccountId && !(await validateOwnership("gtm_account", body.gtmAccountId))) {
    return NextResponse.json({ error: `La cuenta de GTM (${body.gtmAccountId}) no está vinculada al workspace. Conéctala en Integraciones primero.` }, { status: 403 });
  }
  if (body.gtmContainerId && !(await validateOwnership("gtm_container", body.gtmContainerId))) {
    return NextResponse.json({ error: `El contenedor de GTM (${body.gtmContainerId}) no está vinculado al workspace. Conéctalo en Integraciones primero.` }, { status: 403 });
  }

  // Update transaction: JSON on Project AND relational GoogleSource mapping (Additive Migration Z11)
  await prisma.$transaction(async (tx) => {
    // 1. Update Project's legacy JSON field
    await tx.project.update({
      where: { id },
      data: { googleSources: newSources as any },
    });

    // 2. Synchronize relational GoogleSource table. We delete existing and re-create to keep it simple.
    await tx.googleSource.deleteMany({
      where: { projectId: id }
    });
    
    const sourcesToCreate = [];
    if (newSources.adsCustomerId) {
      sourcesToCreate.push({ externalId: newSources.adsCustomerId, kind: "google_ads", projectId: id });
    }
    if (newSources.ga4PropertyId) {
      sourcesToCreate.push({ externalId: newSources.ga4PropertyId, kind: "ga4_property", projectId: id });
    }
    if (newSources.gtmContainerId) {
      sourcesToCreate.push({ externalId: newSources.gtmContainerId, kind: "gtm_container", projectId: id });
    }

    if (sourcesToCreate.length > 0) {
      await tx.googleSource.createMany({
        data: sourcesToCreate
      });
    }
  });

  return NextResponse.json({ success: true, data: newSources });
});

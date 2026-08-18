import { NextResponse } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import prisma from "@/lib/prisma";
import { put, del } from "@vercel/blob";
import { logger } from "@/lib/logger";

export const POST = withWorkspace(async (req, ctx) => {
  try {
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Blob storage not configured" }, { status: 500 });
    }

    const filename = `workspaces/${ctx.workspaceId}/logo-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const blob = await put(filename, file, { access: "public" });

    const settings = await prisma.workspaceSettings.findUnique({
      where: { workspaceId: ctx.workspaceId },
    });
    const currentBranding = (settings?.branding as any) || {};

    await prisma.workspaceSettings.upsert({
      where: { workspaceId: ctx.workspaceId },
      update: {
        branding: { ...currentBranding, logoUrl: blob.url },
      },
      create: {
        workspaceId: ctx.workspaceId,
        branding: { logoUrl: blob.url },
      },
    });

    return NextResponse.json({ logoUrl: blob.url });
  } catch (error) {
    logger.error("Logo upload failed", { error, workspaceId: ctx.workspaceId });
    return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 });
  }
});

export const DELETE = withWorkspace(async (req, ctx) => {
  try {
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await prisma.workspaceSettings.findUnique({
      where: { workspaceId: ctx.workspaceId },
    });

    const currentBranding = (settings?.branding as any) || {};
    const logoUrl = currentBranding.logoUrl;

    if (logoUrl && logoUrl.includes("public.blob.vercel-storage.com")) {
      try {
        await del(logoUrl);
      } catch (e) {
        logger.warn("Failed to delete logo blob", { error: e, url: logoUrl });
      }
    }

    const newBranding = { ...currentBranding };
    delete newBranding.logoUrl;

    await prisma.workspaceSettings.update({
      where: { workspaceId: ctx.workspaceId },
      data: { branding: newBranding },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Logo delete failed", { error, workspaceId: ctx.workspaceId });
    return NextResponse.json({ error: "Failed to delete logo" }, { status: 500 });
  }
});

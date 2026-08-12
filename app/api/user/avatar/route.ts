import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-handler";
import prisma from "@/lib/prisma";
import { put, del } from "@vercel/blob";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (req, ctx) => {
  try {
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

    const filename = `avatars/${ctx.userId}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const blob = await put(filename, file, { access: "public" });

    const updated = await prisma.user.update({
      where: { id: ctx.userId },
      data: { image: blob.url },
      select: { image: true },
    });

    return NextResponse.json({ avatarUrl: updated.image });
  } catch (error) {
    logger.error("Avatar upload failed", { error, userId: ctx.userId });
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req, ctx) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { image: true },
    });

    if (user?.image && user.image.includes("public.blob.vercel-storage.com")) {
      try {
        await del(user.image);
      } catch (e) {
        logger.warn("Failed to delete blob", { error: e, url: user.image });
      }
    }

    await prisma.user.update({
      where: { id: ctx.userId },
      data: { image: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Avatar delete failed", { error, userId: ctx.userId });
    return NextResponse.json({ error: "Failed to delete avatar" }, { status: 500 });
  }
});

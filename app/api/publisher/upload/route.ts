import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { randomUUID } from "crypto";

/**
 * POST /api/publisher/upload
 * 
 * Accepts multipart form data with a "file" field.
 * Returns a base64 data URL for browser preview.
 * The data URL is stored in the post's mediaUrls and
 * the publish route handles converting it to a multipart upload.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic",
      "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido: ${file.type}. Usa JPEG, PNG, GIF, WebP, MP4, MOV.` },
        { status: 400 }
      );
    }

    // Max 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "El archivo excede 10MB" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob if configured, otherwise fallback to base64
    let fileUrl = "";
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      
      // Ensure the file name has the correct extension so Vercel Blob saves it properly
      let finalName = file.name || "upload";
      if (!finalName.includes(".")) {
        const extMatch = file.type.split("/")[1];
        let ext = extMatch || "bin";
        // Handle specific mime types
        if (ext === "quicktime") ext = "mov";
        if (ext === "x-msvideo") ext = "avi";
        if (ext === "jpeg") ext = "jpg";
        finalName = `${finalName}.${ext}`;
      }

      const blob = await put(finalName, file, { access: 'public' });
      fileUrl = blob.url;
    } else {
      // Read file buffer and convert to base64 data URL
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      fileUrl = `data:${file.type};base64,${base64}`;
    }

    return NextResponse.json({
      url: fileUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (err: any) {
    console.error("[PUBLISHER] Upload error:", err);
    return NextResponse.json({ error: err?.message || "Error al subir archivo" }, { status: 500 });
  }
}

export const maxDuration = 30;

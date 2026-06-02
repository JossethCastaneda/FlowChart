import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/**
 * POST /api/publisher/upload
 * 
 * Accepts multipart form data with a "file" field.
 * Saves to public/uploads/ and returns the public URL.
 * 
 * NOTE: For production, replace with cloud storage (S3/Cloudinary/Firebase Storage).
 * This local storage approach works for development and small-scale deployments.
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

    // Max 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "El archivo excede 50MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = path.extname(file.name) || (file.type.startsWith("image/") ? ".jpg" : ".mp4");
    const filename = `${randomUUID()}${ext}`;

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    // Return public URL
    const url = `/uploads/${filename}`;

    return NextResponse.json({
      url,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (err: any) {
    console.error("[PUBLISHER] Upload error:", err);
    return NextResponse.json({ error: err?.message || "Error al subir archivo" }, { status: 500 });
  }
}

// Increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

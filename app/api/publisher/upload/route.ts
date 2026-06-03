import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import os from "os";

/**
 * POST /api/publisher/upload
 * 
 * Accepts multipart form data with a "file" field.
 * Saves to /tmp/uploads/ (Vercel compatible) and returns
 * a base64 data URL for preview + the temp path for publishing.
 * 
 * On Vercel, the filesystem is read-only except for /tmp.
 * Files in /tmp are ephemeral (cleared between invocations)
 * but persist during the same request lifecycle.
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

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename
    const ext = path.extname(file.name) || (file.type.startsWith("image/") ? ".jpg" : ".mp4");
    const filename = `${randomUUID()}${ext}`;

    // Save to /tmp (works on Vercel, local dev, and Docker)
    const uploadsDir = path.join(os.tmpdir(), "sodare-uploads");
    await mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    // Generate base64 data URL for preview in browser
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      url: dataUrl,                // For browser preview
      tmpPath: filePath,           // For server-side publishing
      filename: file.name,         // Original filename
      size: file.size,
      type: file.type,
    });
  } catch (err: any) {
    console.error("[PUBLISHER] Upload error:", err);
    return NextResponse.json({ error: err?.message || "Error al subir archivo" }, { status: 500 });
  }
}

// App Router handles formData() natively — no bodyParser config needed.
// Set max duration for large file uploads on serverless.
export const maxDuration = 30;

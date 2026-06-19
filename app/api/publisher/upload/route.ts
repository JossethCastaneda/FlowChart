import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";

/**
 * POST /api/publisher/upload
 * 
 * Accepts multipart form data with a "file" field.
 * Returns a base64 data URL for browser preview.
 * The data URL is stored in the post's mediaUrls and
 * the publish route handles converting it to a multipart upload.
 */
export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return apiError("No se recibió archivo", "VALIDATION_ERROR", 400);
  }

  // Validate file type
  const allowedTypes = [
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic",
    "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm",
  ];

  if (!allowedTypes.includes(file.type)) {
    return apiError(
      `Tipo de archivo no permitido: ${file.type}. Usa JPEG, PNG, GIF, WebP, MP4, MOV.`,
      "VALIDATION_ERROR",
      400
    );
  }

  // Max 10MB
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return apiError("El archivo excede 10MB", "VALIDATION_ERROR", 400);
  }

  // Upload to Vercel Blob if configured, otherwise fallback to base64
  let fileUrl = "";
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      
      // Sanitize the filename: strip path traversal chars, unicode, and limit length
      let finalName = (file.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
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
    } catch (uploadError) {
      logger.warn("[PUBLISHER] Vercel Blob upload failed, falling back to base64:", uploadError);
      // Read file buffer and convert to base64 data URL
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      fileUrl = `data:${file.type};base64,${base64}`;
    }
  } else {
    // Read file buffer and convert to base64 data URL
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    fileUrl = `data:${file.type};base64,${base64}`;
  }

  return apiSuccess({
    url: fileUrl,
    filename: file.name,
    size: file.size,
    type: file.type,
  });
});

export const maxDuration = 30;

import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * POST /api/publisher/upload
 *
 * Accepts multipart form data with a "file" field (optionally "width"/"height"
 * for images, captured client-side before upload). Returns a base64 data URL
 * for browser preview and persists a MediaAsset row so el archivo aparezca en
 * la Biblioteca — antes este endpoint nunca escribía en MediaAsset, así que
 * la pestaña Biblioteca no tenía ningún archivo real que listar.
 * The data URL is stored in the post's mediaUrls and
 * the publish route handles converting it to a multipart upload.
 */
export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const widthRaw = formData.get("width");
  const heightRaw = formData.get("height");
  const width = typeof widthRaw === "string" && widthRaw ? parseInt(widthRaw, 10) : null;
  const height = typeof heightRaw === "string" && heightRaw ? parseInt(heightRaw, 10) : null;

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

  // Límite real: el body de una función serverless de Vercel está topado a ~4.5MB, así
  // que anunciar 10MB era engañoso (la plataforma rechazaba el request antes de llegar
  // aquí). Para media más pesada se necesita subida directa cliente→Blob (pendiente).
  const MAX_SIZE = 4.5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return apiError("El archivo excede 4.5MB (límite de subida directa). Para videos más grandes, comprime el archivo.", "VALIDATION_ERROR", 400);
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

      // Namespacing por workspace + UUID: evita colisiones globales de nombre entre
      // tenants (dos "photo.jpg" chocarían) que degradaban a base64-en-DB.
      const blobPath = `publisher/${ctx.workspaceId}/${randomUUID()}-${finalName}`;
      const blob = await put(blobPath, file, { access: 'public' });
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

  // Solo se registra en Biblioteca cuando el archivo quedó en un almacenamiento
  // real (Vercel Blob). El fallback base64 produce un data: URL de varios MB:
  // guardarlo como fila de MediaAsset inflaría la base de datos y haría que el
  // listado de Biblioteca devolviera megabytes por archivo. Ese fallback sigue
  // sirviendo para adjuntar el medio al post, pero no es un activo de biblioteca.
  const isPersistableUrl = !fileUrl.startsWith("data:");
  let assetId: string | null = null;
  if (isPersistableUrl) {
    try {
      const asset = await prisma.mediaAsset.create({
        data: {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          url: fileUrl,
          fileName: file.name || "upload",
          mimeType: file.type,
          size: file.size,
          width: width && Number.isFinite(width) ? width : null,
          height: height && Number.isFinite(height) ? height : null,
        },
        select: { id: true },
      });
      assetId = asset.id;
    } catch (persistError) {
      // No bloquear la subida (el post puede seguir usando fileUrl) si falla el
      // registro en Biblioteca — solo se pierde la entrada de la biblioteca.
      logger.error("Failed to persist MediaAsset", { workspaceId: ctx.workspaceId, error: persistError });
    }
  }

  return apiSuccess({
    url: fileUrl,
    filename: file.name,
    size: file.size,
    type: file.type,
    assetId,
  });
});

export const maxDuration = 30;

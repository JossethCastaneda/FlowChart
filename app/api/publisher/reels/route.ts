import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getMetaAccessToken, metaFetch, resolvePageToken } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { z } from "zod";
import { validateBody } from "@/lib/validate";
import { logger } from "@/lib/logger";

const META_V = process.env.META_API_VERSION || "v25.0";

/**
 * POST /api/publisher/reels
 *
 * Publishes a Reel to Facebook and/or Instagram.
 *
 * Body:
 *   platform: "facebook" | "instagram"
 *   videoUrl: string (publicly accessible URL)
 *   caption: string
 *   pageId: string (Facebook page ID)
 *   igUserId?: string (Instagram business account ID)
 *   pageToken: string (encrypted page access token)
 *   shareToFeed?: boolean (IG only, default true)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
export const POST = withWorkspace(async (req: NextRequest, _ctx) => {
  // Try module-specific token, then fallback
  const token = await getMetaAccessToken(req, "publisher_facebook");
  if (!token) {
    return apiError("No hay token Meta. Ve a Integraciones y conecta tu cuenta.", "UNAUTHORIZED", 401);
  }

  const _validate = await validateBody(req, z.object({
    platform: z.enum(["facebook", "instagram"]),
    videoUrl: z.string().url("videoUrl debe ser una URL válida"),
    caption: z.string().optional(),
    pageId: z.string().optional(),
    igUserId: z.string().optional(),
    pageToken: z.string().optional(),
    shareToFeed: z.boolean().optional(),
  }));

  if (!_validate.ok) return _validate.response;
  
  const {
    platform,
    videoUrl,
    caption,
    pageId,
    igUserId,
    shareToFeed = true,
  } = _validate.data;

  // SEGURIDAD: resolver el PAGE token server-side (los endpoints video_reels/media de
  // página/IG lo requieren). Nunca confiar en un pageToken enviado por el cliente.
  const resolved = await resolvePageToken(token, { pageId, igUserId });
  if (!resolved) {
    return apiError(
      "No se pudo resolver el token de la página/cuenta. Verifica que esté conectada en Integraciones.",
      "PAGE_TOKEN_UNRESOLVED",
      400,
    );
  }
  const pageToken = resolved.pageToken;

  // ═══════════════════════════════════════════
  // Facebook Reel
  // ═══════════════════════════════════════════
  if (platform === "facebook") {
    if (!pageId) {
      return apiError("pageId es requerido para Facebook", "VALIDATION_ERROR", 400);
    }

    // Facebook Reels use a resumable upload flow:
    // Step 1: Start upload session
    const startRes = await metaFetch(
      `https://graph.facebook.com/${META_V}/${pageId}/video_reels`,
      pageToken,
      {
        method: "POST",
        body: JSON.stringify({ upload_phase: "start" }),
      }
    );
    const startData = await startRes.json();
    if (!startRes.ok || !startData.video_id) {
      return apiError(mapMetaError(startData?.error).user_message, "META_API_ERROR", 422);
    }

    const videoId = startData.video_id;

    // Step 2: Upload the video via URL
    const uploadRes = await fetch(
      `https://rupload.facebook.com/video-upload/${META_V}/${videoId}`,
      {
        method: "POST",
        headers: {
          Authorization: `OAuth ${pageToken}`,
          file_url: videoUrl,
        },
      }
    );
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.success) {
      return apiError("Error al subir el video a Facebook. Verifica que la URL sea accesible.", "UPLOAD_ERROR", 422);
    }

    // Step 3: Finish / publish
    const finishRes = await metaFetch(
      `https://graph.facebook.com/${META_V}/${pageId}/video_reels`,
      pageToken,
      {
        method: "POST",
        body: JSON.stringify({
          upload_phase: "finish",
          video_id: videoId,
          description: caption || "",
          published: true,
        }),
      }
    );
    const finishData = await finishRes.json();
    if (!finishRes.ok || finishData.error) {
      return apiError(mapMetaError(finishData?.error).user_message, "META_API_ERROR", 422);
    }

    logger.info(`[REELS]  Facebook Reel published: ${finishData.video_id || videoId}`);
    return apiSuccess({
      success: true,
      reelId: finishData.video_id || videoId,
      platform: "facebook",
    });
  }

  // ═══════════════════════════════════════════
  // Instagram Reel
  // ═══════════════════════════════════════════
  if (platform === "instagram") {
    if (!igUserId) {
      return apiError("igUserId es requerido para Instagram Reels", "VALIDATION_ERROR", 400);
    }

    // Step 1: Create media container
    const containerRes = await metaFetch(
      `https://graph.facebook.com/${META_V}/${igUserId}/media`,
      pageToken,
      {
        method: "POST",
        body: JSON.stringify({
          media_type: "REELS",
          video_url: videoUrl,
          caption: caption || "",
          share_to_feed: shareToFeed,
        }),
      }
    );
    const containerData = await containerRes.json();
    if (!containerRes.ok || !containerData.id) {
      return apiError(mapMetaError(containerData?.error).user_message, "META_API_ERROR", 422);
    }

    const containerId = containerData.id;

    // Step 2: Poll for processing status (max 12 × 10s = 2 min)
    let ready = false;
    for (let i = 0; i < 12; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10_000));

      const statusRes = await metaFetch(
        `https://graph.facebook.com/${META_V}/${containerId}?fields=status_code`,
        pageToken,
        // Sin no-store, metaFetch aplica next.revalidate=3600 a los GET y el polling
        // leería el MISMO status cacheado por 1h → siempre timeout.
        { cache: "no-store" }
      );
      const statusData = await statusRes.json();

      if (statusData.status_code === "FINISHED") {
        ready = true;
        break;
      }
      if (statusData.status_code === "ERROR") {
        logger.error("[REELS] IG container error:", statusData);
        return apiError("Error procesando el Reel en Instagram. Verifica el formato del video.", "META_API_ERROR", 422);
      }
      // IN_PROGRESS — continue polling
    }

    if (!ready) {
      return apiError("Tiempo agotado esperando que Instagram procese el Reel. Intenta de nuevo.", "TIMEOUT", 422);
    }

    // Step 3: Publish
    const publishRes = await metaFetch(
      `https://graph.facebook.com/${META_V}/${igUserId}/media_publish`,
      pageToken,
      {
        method: "POST",
        body: JSON.stringify({ creation_id: containerId }),
      }
    );
    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData.id) {
      return apiError(mapMetaError(publishData?.error).user_message, "META_API_ERROR", 422);
    }

    logger.info(`[REELS]  Instagram Reel published: ${publishData.id}`);
    return apiSuccess({
      success: true,
      reelId: publishData.id,
      platform: "instagram",
    });
  }

  // En teoría Zod ya filtra que sea "facebook" | "instagram", así que esto no se ejecutaría
  return apiError(`Plataforma "${platform}" no soportada. Usa "facebook" o "instagram".`, "VALIDATION_ERROR", 400);
});

// El polling puede tardar ~2 min + overhead de subida; 300s es el máximo de la
// plataforma y evita que la función muera a mitad del polling (perdiendo el reel).
export const maxDuration = 300;

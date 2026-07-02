import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { decryptToken } from "@/lib/encryption";
import { z } from "zod";
import { validateBody } from "@/lib/validate";
import { logger } from "@/lib/logger";

const META_V = process.env.META_API_VERSION || "v25.0";

/**
 * POST /api/publisher/stories
 *
 * Publishes a Story to Facebook and/or Instagram.
 *
 * Body:
 *   platform: "facebook" | "instagram"
 *   mediaUrl: string (publicly accessible URL — image or video)
 *   mediaType?: "image" | "video" (auto-detected if omitted)
 *   pageId: string (Facebook page ID)
 *   igUserId?: string (Instagram business account ID)
 *   pageToken: string (encrypted page access token)
 */
export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const token = await getMetaAccessToken(req, "publisher_facebook");
  if (!token) {
    return apiError("No hay token Meta. Ve a Integraciones y conecta tu cuenta.", "UNAUTHORIZED", 401);
  }

  const _validate = await validateBody(req, z.object({
    platform: z.enum(["facebook", "instagram"]),
    mediaUrl: z.string().url("mediaUrl debe ser una URL válida"),
    explicitMediaType: z.enum(["image", "video"]).optional(),
    mediaType: z.enum(["image", "video"]).optional(),
    pageId: z.string().optional(),
    igUserId: z.string().optional(),
    encryptedPageToken: z.string().optional(),
    pageToken: z.string().optional()
  }));

  if (!_validate.ok) return _validate.response;
  
  const {
    platform,
    mediaUrl,
    mediaType: explicitMediaTypeBody,
    explicitMediaType,
    pageId,
    igUserId,
    pageToken: bodyPageToken,
    encryptedPageToken: bodyEncryptedPageToken,
  } = _validate.data;

  // Manejo de compatibilidad: explicitMediaType o mediaType
  const mediaType = explicitMediaTypeBody || explicitMediaType;
  const encryptedPageToken = bodyEncryptedPageToken || bodyPageToken;

  const pageToken = encryptedPageToken ? decryptToken(encryptedPageToken) || token : token;

  // Auto-detect media type from URL extension
  const isVideo =
    mediaType === "video" ||
    (!mediaType && /\.(mp4|mov|avi|wmv|webm)(?:[?#].*)?$/i.test(mediaUrl));

  // ═══════════════════════════════════════════
  // Facebook Story
  // ═══════════════════════════════════════════
  if (platform === "facebook") {
    if (!pageId) {
      return apiError("pageId es requerido para Facebook", "VALIDATION_ERROR", 400);
    }

    if (isVideo) {
      // Facebook Video Story — resumable upload flow
      // Step 1: Initialize upload
      const initRes = await metaFetch(
        `https://graph.facebook.com/${META_V}/${pageId}/video_stories`,
        pageToken,
        {
          method: "POST",
          body: JSON.stringify({ upload_phase: "start" }),
        }
      );
      const initData = await initRes.json();
      if (!initRes.ok || !initData.video_id) {
        return apiError(mapMetaError(initData?.error).user_message, "META_API_ERROR", 422);
      }

      // Step 2: Upload via URL
      const uploadRes = await fetch(
        `https://rupload.facebook.com/video-upload/${META_V}/${initData.video_id}`,
        {
          method: "POST",
          headers: {
            Authorization: `OAuth ${pageToken}`,
            file_url: mediaUrl,
          },
        }
      );
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        return apiError("Error al subir el video para Story de Facebook.", "UPLOAD_ERROR", 422);
      }

      // Step 3: Finish
      const finishRes = await metaFetch(
        `https://graph.facebook.com/${META_V}/${pageId}/video_stories`,
        pageToken,
        {
          method: "POST",
          body: JSON.stringify({
            upload_phase: "finish",
            video_id: initData.video_id,
            published: true,
          }),
        }
      );
      const finishData = await finishRes.json();
      if (!finishRes.ok || finishData.error) {
        return apiError(mapMetaError(finishData?.error).user_message, "META_API_ERROR", 422);
      }

      logger.info(`[STORIES] ✅ FB Video Story published: ${finishData.post_id || initData.video_id}`);
      return apiSuccess({
        success: true,
        storyId: finishData.post_id || initData.video_id,
        platform: "facebook",
      });
    } else {
      // Facebook Photo Story — 2-step flow per Meta docs:
      // 1. Upload photo as unpublished
      // 2. Post photo_id to /photo_stories
      const uploadRes = await metaFetch(
        `https://graph.facebook.com/${META_V}/${pageId}/photos`,
        pageToken,
        {
          method: "POST",
          body: JSON.stringify({ url: mediaUrl, published: false }),
        }
      );
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.id) {
        return apiError(mapMetaError(uploadData?.error).user_message || "Error subiendo foto para Story", "UPLOAD_ERROR", 422);
      }

      const res = await metaFetch(
        `https://graph.facebook.com/${META_V}/${pageId}/photo_stories`,
        pageToken,
        {
          method: "POST",
          body: JSON.stringify({ photo_id: uploadData.id }),
        }
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        return apiError(mapMetaError(data?.error).user_message, "META_API_ERROR", 422);
      }

      logger.info(`[STORIES] ✅ FB Photo Story published: ${data.post_id || data.id}`);
      return apiSuccess({
        success: true,
        storyId: data.post_id || data.id,
        platform: "facebook",
      });
    }
  }

  // ═══════════════════════════════════════════
  // Instagram Story
  // ═══════════════════════════════════════════
  if (platform === "instagram") {
    if (!igUserId) {
      return apiError("igUserId es requerido para Instagram Stories", "VALIDATION_ERROR", 400);
    }

    // Step 1: Create media container
    const containerPayload: Record<string, any> = {
      media_type: "STORIES",
    };
    if (isVideo) {
      containerPayload.video_url = mediaUrl;
    } else {
      containerPayload.image_url = mediaUrl;
    }

    const containerRes = await metaFetch(
      `https://graph.facebook.com/${META_V}/${igUserId}/media`,
      pageToken,
      {
        method: "POST",
        body: JSON.stringify(containerPayload),
      }
    );
    const containerData = await containerRes.json();
    if (!containerRes.ok || !containerData.id) {
      return apiError(mapMetaError(containerData?.error).user_message, "META_API_ERROR", 422);
    }

    const containerId = containerData.id;

    // Step 2: Poll for video processing (only needed for videos)
    if (isVideo) {
      let ready = false;
      for (let i = 0; i < 12; i++) {
        await new Promise((resolve) => setTimeout(resolve, 10_000));
        const statusRes = await metaFetch(
          `https://graph.facebook.com/${META_V}/${containerId}?fields=status_code`,
          pageToken
        );
        const statusData = await statusRes.json();
        if (statusData.status_code === "FINISHED") {
          ready = true;
          break;
        }
        if (statusData.status_code === "ERROR") {
          return apiError("Error procesando el video del Story en Instagram.", "META_API_ERROR", 422);
        }
      }
      if (!ready) {
        return apiError("Tiempo agotado esperando que Instagram procese el video.", "TIMEOUT", 422);
      }
    } else {
      // Images are processed quickly — brief wait
      await new Promise((resolve) => setTimeout(resolve, 3_000));
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

    logger.info(`[STORIES] ✅ IG Story published: ${publishData.id}`);
    return apiSuccess({
      success: true,
      storyId: publishData.id,
      platform: "instagram",
    });
  }

  // Fallback
  return apiError(`Plataforma "${platform}" no soportada. Usa "facebook" o "instagram".`, "VALIDATION_ERROR", 400);
});

// Video stories may take time to process
export const maxDuration = 120;

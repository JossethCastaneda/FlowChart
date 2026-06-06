import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { decryptToken } from "@/lib/encryption";

const META_V = process.env.META_API_VERSION || "v23.0";

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
export async function POST(req: NextRequest) {
  try {
    // ── Auth checks ──
    const jwt = await getToken({ req });
    if (!jwt?.sub) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(jwt.sub);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    let token = await getMetaAccessToken(req, "publisher_facebook");
    if (!token) token = await getMetaAccessToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "No hay token Meta. Ve a Integraciones y conecta tu cuenta." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      platform,
      mediaUrl,
      mediaType: explicitMediaType,
      pageId,
      igUserId,
      pageToken: encryptedPageToken,
    } = body;

    if (!platform || !mediaUrl) {
      return NextResponse.json(
        { error: "platform y mediaUrl son requeridos" },
        { status: 400 }
      );
    }

    const pageToken = decryptToken(encryptedPageToken) || token;

    // Auto-detect media type from URL extension
    const isVideo =
      explicitMediaType === "video" ||
      (!explicitMediaType && /\.(mp4|mov|avi|wmv|webm)(?:[?#].*)?$/i.test(mediaUrl));

    // ═══════════════════════════════════════════
    // Facebook Story
    // ═══════════════════════════════════════════
    if (platform === "facebook") {
      if (!pageId) {
        return NextResponse.json({ error: "pageId es requerido para Facebook" }, { status: 400 });
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
          return NextResponse.json(
            { error: mapMetaError(initData?.error).user_message },
            { status: 422 }
          );
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
          return NextResponse.json(
            { error: "Error al subir el video para Story de Facebook." },
            { status: 422 }
          );
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
          return NextResponse.json(
            { error: mapMetaError(finishData?.error).user_message },
            { status: 422 }
          );
        }

        console.log(`[STORIES] ✅ FB Video Story published: ${finishData.post_id || initData.video_id}`);
        return NextResponse.json({
          success: true,
          storyId: finishData.post_id || initData.video_id,
          platform: "facebook",
        });
      } else {
        // Facebook Photo Story
        const res = await metaFetch(
          `https://graph.facebook.com/${META_V}/${pageId}/photo_stories`,
          pageToken,
          {
            method: "POST",
            body: JSON.stringify({ url: mediaUrl, published: true }),
          }
        );
        const data = await res.json();
        if (!res.ok || data.error) {
          return NextResponse.json(
            { error: mapMetaError(data?.error).user_message },
            { status: 422 }
          );
        }

        console.log(`[STORIES] ✅ FB Photo Story published: ${data.post_id || data.id}`);
        return NextResponse.json({
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
        return NextResponse.json(
          { error: "igUserId es requerido para Instagram Stories" },
          { status: 400 }
        );
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
        return NextResponse.json(
          { error: mapMetaError(containerData?.error).user_message },
          { status: 422 }
        );
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
            return NextResponse.json(
              { error: "Error procesando el video del Story en Instagram." },
              { status: 422 }
            );
          }
        }
        if (!ready) {
          return NextResponse.json(
            { error: "Tiempo agotado esperando que Instagram procese el video." },
            { status: 422 }
          );
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
        return NextResponse.json(
          { error: mapMetaError(publishData?.error).user_message },
          { status: 422 }
        );
      }

      console.log(`[STORIES] ✅ IG Story published: ${publishData.id}`);
      return NextResponse.json({
        success: true,
        storyId: publishData.id,
        platform: "instagram",
      });
    }

    return NextResponse.json(
      { error: `Plataforma "${platform}" no soportada. Usa "facebook" o "instagram".` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[STORIES] Error:", err.message);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

// Video stories may take time to process
export const maxDuration = 120;

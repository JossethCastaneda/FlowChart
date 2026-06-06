import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { decryptToken } from "@/lib/encryption";

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

    // Try module-specific token, then fallback
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
      videoUrl,
      caption,
      pageId,
      igUserId,
      pageToken: encryptedPageToken,
      shareToFeed = true,
    } = body;

    if (!platform || !videoUrl) {
      return NextResponse.json(
        { error: "platform y videoUrl son requeridos" },
        { status: 400 }
      );
    }

    // Decrypt the page token
    const pageToken = decryptToken(encryptedPageToken) || token;

    // ═══════════════════════════════════════════
    // Facebook Reel
    // ═══════════════════════════════════════════
    if (platform === "facebook") {
      if (!pageId) {
        return NextResponse.json({ error: "pageId es requerido para Facebook" }, { status: 400 });
      }

      // Facebook Reels use a resumable upload flow:
      // Step 1: Start upload session
      const startRes = await metaFetch(
        `https://graph.facebook.com/${META_V}/${pageId}/video_reels`,
        pageToken,
        {
          method: "POST",
          body: JSON.stringify({
            upload_phase: "start",
          }),
        }
      );
      const startData = await startRes.json();
      if (!startRes.ok || !startData.video_id) {
        return NextResponse.json(
          { error: mapMetaError(startData?.error).user_message },
          { status: 422 }
        );
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
        return NextResponse.json(
          { error: "Error al subir el video a Facebook. Verifica que la URL sea accesible." },
          { status: 422 }
        );
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
        return NextResponse.json(
          { error: mapMetaError(finishData?.error).user_message },
          { status: 422 }
        );
      }

      console.log(`[REELS] ✅ Facebook Reel published: ${finishData.video_id || videoId}`);
      return NextResponse.json({
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
        return NextResponse.json(
          { error: "igUserId es requerido para Instagram Reels" },
          { status: 400 }
        );
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
        return NextResponse.json(
          { error: mapMetaError(containerData?.error).user_message },
          { status: 422 }
        );
      }

      const containerId = containerData.id;

      // Step 2: Poll for processing status (max 12 × 10s = 2 min)
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
          console.error("[REELS] IG container error:", statusData);
          return NextResponse.json(
            { error: "Error procesando el Reel en Instagram. Verifica el formato del video." },
            { status: 422 }
          );
        }
        // IN_PROGRESS — continue polling
      }

      if (!ready) {
        return NextResponse.json(
          { error: "Tiempo agotado esperando que Instagram procese el Reel. Intenta de nuevo." },
          { status: 422 }
        );
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

      console.log(`[REELS] ✅ Instagram Reel published: ${publishData.id}`);
      return NextResponse.json({
        success: true,
        reelId: publishData.id,
        platform: "instagram",
      });
    }

    return NextResponse.json(
      { error: `Plataforma "${platform}" no soportada. Usa "facebook" o "instagram".` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[REELS] Error:", err.message);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

// Instagram Reels processing can take up to 2 minutes
export const maxDuration = 120;

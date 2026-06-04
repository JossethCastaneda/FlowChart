import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";

const META_V = process.env.META_API_VERSION || "v22.0";

/**
 * GET /api/analytics/reels
 *
 * Fetches Instagram Reel insights for the workspace's IG business account.
 *
 * Query params:
 *   igUserId: string (Instagram business account ID)
 *   limit?: number (default 25, max 100)
 *
 * Returns: { reels: [{ id, timestamp, caption, insights: { comments, likes, plays, reach, saved, shares } }] }
 */
export async function GET(req: NextRequest) {
  try {
    const jwt = await getToken({ req });
    if (!jwt?.sub) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(jwt.sub);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    let token = await getMetaAccessToken(req, "analytics");
    if (!token) token = await getMetaAccessToken(req, "social");
    if (!token) token = await getMetaAccessToken(req, "publisher_facebook");
    if (!token) token = await getMetaAccessToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "No hay token Meta. Ve a Integraciones y conecta tu cuenta." },
        { status: 401 }
      );
    }

    const igUserId = req.nextUrl.searchParams.get("igUserId");
    if (!igUserId) {
      return NextResponse.json({ error: "igUserId es requerido" }, { status: 400 });
    }

    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || "25", 10),
      100
    );

    // Fetch reels (video media) with insights
    const res = await metaFetch(
      `https://graph.facebook.com/${META_V}/${igUserId}/media?fields=id,timestamp,caption,media_type,media_url,thumbnail_url,permalink,insights.metric(comments,likes,plays,reach,saved,shares){name,values}&limit=${limit}`,
      token
    );
    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: mapMetaError(data?.error).user_message },
        { status: 422 }
      );
    }

    // Filter to only Reels (VIDEO type) and normalize insights
    const reels = (data.data || [])
      .filter((m: any) => m.media_type === "VIDEO")
      .map((reel: any) => {
        const insights: Record<string, number> = {};
        if (reel.insights?.data) {
          for (const metric of reel.insights.data) {
            insights[metric.name] = metric.values?.[0]?.value || 0;
          }
        }
        return {
          id: reel.id,
          timestamp: reel.timestamp,
          caption: reel.caption || "",
          mediaUrl: reel.media_url,
          thumbnailUrl: reel.thumbnail_url,
          permalink: reel.permalink,
          insights,
        };
      });

    return NextResponse.json({ reels, total: reels.length });
  } catch (err: any) {
    console.error("[ANALYTICS/REELS] Error:", err.message);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

export const maxDuration = 30;

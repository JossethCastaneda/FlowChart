import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";

const META_V = process.env.META_API_VERSION || "v22.0";

/**
 * GET /api/analytics/stories
 *
 * Fetches Instagram Story insights for the workspace's IG business account.
 *
 * Query params:
 *   igUserId: string (Instagram business account ID)
 *   pageToken?: string (optional, for page-specific token)
 *
 * Returns: { stories: [{ id, timestamp, insights: { exits, impressions, reach, replies, taps_forward, taps_back } }] }
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

    // Fetch stories with insights
    const res = await metaFetch(
      `https://graph.facebook.com/${META_V}/${igUserId}/stories?fields=id,timestamp,media_url,media_type,insights.metric(exits,impressions,reach,replies,taps_forward,taps_back){name,values}`,
      token
    );
    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: mapMetaError(data?.error).user_message },
        { status: 422 }
      );
    }

    // Normalize insights into a flat object per story
    const stories = (data.data || []).map((story: any) => {
      const insights: Record<string, number> = {};
      if (story.insights?.data) {
        for (const metric of story.insights.data) {
          insights[metric.name] = metric.values?.[0]?.value || 0;
        }
      }
      return {
        id: story.id,
        timestamp: story.timestamp,
        mediaUrl: story.media_url,
        mediaType: story.media_type,
        insights,
      };
    });

    return NextResponse.json({ stories, total: stories.length });
  } catch (err: any) {
    console.error("[ANALYTICS/STORIES] Error:", err.message);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

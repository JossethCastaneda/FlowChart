import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";

const META_V = process.env.META_API_VERSION || "v23.0";

/**
 * GET /api/analytics/stories
 *
 * Fetches Instagram Story insights for all IG business accounts in the workspace.
 * Auto-detects IG accounts from connected Facebook Pages.
 *
 * Query params (all optional):
 *   igUserId: string — specific IG account (auto-detected if omitted)
 *   pageIds: string — comma-separated FB page IDs to filter
 *   platform: string — "facebook" | "instagram" (stories only exists for instagram)
 *
 * Returns: { stories: [...], total: number }
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

    // If platform=facebook, stories don't exist for FB
    const platformParam = req.nextUrl.searchParams.get("platform");
    if (platformParam === "facebook") {
      return NextResponse.json({ stories: [], total: 0 });
    }

    // AN-3 FIX: Auto-detect IG accounts from connected pages
    let igUserIds: string[] = [];
    const explicitIgUserId = req.nextUrl.searchParams.get("igUserId");

    if (explicitIgUserId) {
      igUserIds = [explicitIgUserId];
    } else {
      // Fetch pages to discover IG business accounts
      const pagesUrl = metaUrl("me/accounts", {
        fields: "id,instagram_business_account",
        limit: "100",
      });
      const pagesRes = await metaFetch(pagesUrl, token);
      if (pagesRes.ok) {
        const pagesJson = await pagesRes.json();
        let pages: any[] = pagesJson.data || [];

        // Apply pageIds filter if provided
        const pageIdsParam = req.nextUrl.searchParams.get("pageIds");
        if (pageIdsParam) {
          const allowedIds = pageIdsParam.split(",").map((id) => id.trim());
          pages = pages.filter((p) => allowedIds.includes(p.id));
        }

        igUserIds = pages
          .map((p) => p.instagram_business_account?.id)
          .filter(Boolean) as string[];
      }
    }

    if (!igUserIds.length) {
      return NextResponse.json({ stories: [], total: 0, message: "No hay cuentas de Instagram Business conectadas" });
    }

    // Fetch stories from all IG accounts (limit to first 5 to avoid timeout)
    const allStories: any[] = [];
    const accountsToProcess = igUserIds.slice(0, 5);

    const results = await Promise.allSettled(
      accountsToProcess.map(async (igUserId) => {
        const res = await metaFetch(
          `https://graph.facebook.com/${META_V}/${igUserId}/stories?fields=id,timestamp,media_url,media_type,insights.metric(exits,views,reach,replies,taps_forward,taps_back){name,values}`,
          token
        );
        const data = await res.json();
        if (!res.ok || data.error) {
          console.error(`[STORIES] Error for ${igUserId}:`, data?.error?.message);
          return [];
        }
        return (data.data || []).map((story: any) => {
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
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        allStories.push(...r.value);
      }
    }

    // Sort by timestamp descending
    allStories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ stories: allStories, total: allStories.length });
  } catch (err: any) {
    console.error("[ANALYTICS/STORIES] Error:", err.message);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

export const maxDuration = 30;

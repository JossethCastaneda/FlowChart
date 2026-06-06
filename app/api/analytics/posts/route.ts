import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";

// ── Types ──────────────────────────────────────────────────────────────────

interface NormalizedPost {
  id: string;
  text: string;
  channel: "facebook" | "instagram";
  date: string;
  image: string | null;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  engagementRate: number;   // BUG 5 FIX — rate as %
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Extract a numeric metric from FB/IG post insights object */
function insightValue(insights: any, metricName: string): number {
  if (!insights?.data) return 0;
  const found = insights.data.find((d: any) => d.name === metricName);
  return Number(found?.values?.[0]?.value) || 0;
}

/** Process items in chunks to avoid timeout (BUG 4) */
async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Auth gate
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  // BUG 1 FIX — Token fallback multi-módulo
  let token = await getMetaAccessToken(request, "analytics");
  if (!token) token = await getMetaAccessToken(request, "social");
  if (!token) token = await getMetaAccessToken(request, "publisher_facebook");
  if (!token) token = await getMetaAccessToken(request);
  if (!token) return NextResponse.json({ error: "No hay token Meta. Conecta tu cuenta en Integraciones." }, { status: 401 });

  try {
    const limit = request.nextUrl.searchParams.get("limit") || "25";

    // 1. Get all pages (with IG account)
    const pagesUrl = metaUrl("me/accounts", {
      fields: "id,name,access_token,instagram_business_account",
      limit: "100",
    });
    const pagesRes = await metaFetch(pagesUrl, token);
    if (!pagesRes.ok) {
      const err = await pagesRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.error?.message || "Failed to fetch pages" },
        { status: 500 }
      );
    }
    const pagesJson = await pagesRes.json();
    let pages: any[] = pagesJson.data || [];

    // Apply pageIds filter if provided
    const pageIdsParam = request.nextUrl.searchParams.get("pageIds");
    const platformParam = request.nextUrl.searchParams.get("platform");
    if (pageIdsParam) {
      const allowedIds = pageIdsParam.split(",").map((id) => id.trim());
      pages = pages.filter((p) => allowedIds.includes(p.id));
    }

    if (!pages.length) {
      return NextResponse.json({ posts: [] });
    }

    // BUG 4 FIX — Limit to 15 pages max to avoid timeout
    const pagesToProcess = pageIdsParam ? pages : pages.slice(0, 15);
    const allPosts: NormalizedPost[] = [];

    // 2. Fetch posts for each page (BUG 4: chunked, 5 at a time)
    await processInChunks(pagesToProcess, 5, async (page: any) => {
      const pageToken = page.access_token || token;
      const igAccountId = page.instagram_business_account?.id;

      // ── Facebook published posts (skip if platform=instagram) ──────
      const fbPostsUrl = platformParam !== "instagram"
        ? metaUrl(`${page.id}/published_posts`, {
            fields: [
              "id", "message", "created_time", "full_picture",
              "shares",
              "likes.summary(true)",
              "comments.summary(true)",
              "insights.metric(post_total_media_view_unique,post_media_view,post_engaged_users)",
            ].join(","),
            limit,
          })
        : null;

      // ── Instagram media (skip if platform=facebook) ───────────────
      const igMediaUrl = igAccountId && platformParam !== "facebook"
        ? metaUrl(`${igAccountId}/media`, {
            fields: [
              "id", "caption", "timestamp", "media_url", "thumbnail_url",
              "like_count", "comments_count",
              "insights.metric(views,reach,saved)",
            ].join(","),
            limit,
          })
        : null;

      const [fbResult, igResult] = await Promise.allSettled([
        fbPostsUrl
          ? metaFetch(fbPostsUrl, pageToken).then(async (r) => {
              if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                console.error(`[POSTS] FB posts error for page ${page.id}:`, err?.error?.message);
                return null;
              }
              return r.json();
            })
          : Promise.resolve(null),
        igMediaUrl
          ? metaFetch(igMediaUrl, token).then(async (r) => {
              if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                console.error(`[POSTS] IG media error for ${igAccountId}:`, err?.error?.message);
                return null;
              }
              return r.json();
            })
          : Promise.resolve(null),
      ]);

      // ── Normalize Facebook posts ─────────────────────────────────────
      if (fbResult.status === "fulfilled" && fbResult.value?.data) {
        for (const post of fbResult.value.data) {
          const reach = insightValue(post.insights, "post_total_media_view_unique") || insightValue(post.insights, "post_impressions");
          const engaged = insightValue(post.insights, "post_engaged_users");
          const likes = Number(post.likes?.summary?.total_count) || 0;
          const comments = Number(post.comments?.summary?.total_count) || 0;
          const shares = Number(post.shares?.count) || 0;
          const engagementAbs = engaged || (likes + comments + shares);

          allPosts.push({
            id: post.id,
            text: post.message || "",
            channel: "facebook",
            date: post.created_time,
            image: post.full_picture || null,
            reach,
            likes,
            comments,
            shares,
            engagement: engagementAbs,
            // BUG 5 FIX — engagement rate as %
            engagementRate: reach > 0
              ? parseFloat(((engagementAbs / reach) * 100).toFixed(2))
              : 0,
          });
        }
      }

      // ── Normalize Instagram posts ────────────────────────────────────
      if (igResult.status === "fulfilled" && igResult.value?.data) {
        for (const media of igResult.value.data) {
          // BUG 2 FIX — use media.insights, not media directly
          const views = insightValue(media.insights, "views") || insightValue(media.insights, "impressions");
          const reach = insightValue(media.insights, "reach");
          const saved = insightValue(media.insights, "saved");
          const likes = Number(media.like_count) || 0;
          const comments = Number(media.comments_count) || 0;
          const engagementAbs = likes + comments + saved;
          const denominator = reach || views;

          allPosts.push({
            id: media.id,
            text: media.caption || "",
            channel: "instagram",
            date: media.timestamp,
            image: media.media_url || media.thumbnail_url || null,
            reach: reach || views,
            likes,
            comments,
            shares: 0, // IG API doesn't expose shares
            engagement: engagementAbs,
            // BUG 5 FIX — engagement rate as %
            engagementRate: denominator > 0
              ? parseFloat(((engagementAbs / denominator) * 100).toFixed(2))
              : 0,
          });
        }
      }
    });

    // 3. Sort by engagement rate descending (match Hootsuite behavior)
    allPosts.sort((a, b) => b.engagementRate - a.engagementRate);

    return NextResponse.json({ posts: allPosts });
  } catch (error: any) {
    console.error("[POSTS] Unhandled error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// BUG 4 FIX — Extend serverless function timeout
export const maxDuration = 30;

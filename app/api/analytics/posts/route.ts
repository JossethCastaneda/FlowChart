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
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Extract a numeric metric from FB post insights */
function fbInsightValue(insights: any, metricName: string): number {
  if (!insights?.data) return 0;
  const found = insights.data.find((d: any) => d.name === metricName);
  return Number(found?.values?.[0]?.value) || 0;
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Auth gate
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request, "analytics");
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

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
    const pages: any[] = pagesJson.data || [];

    if (!pages.length) {
      return NextResponse.json({ posts: [] });
    }

    const allPosts: NormalizedPost[] = [];

    // 2. Fetch posts for each page in parallel
    const pagePromises = pages.map(async (page: any) => {
      const pageToken = page.access_token || token;
      const igAccountId = page.instagram_business_account?.id;

      // ── Facebook published posts ─────────────────────────────────────
      const fbPostsUrl = metaUrl(`${page.id}/published_posts`, {
        fields: [
          "id", "message", "created_time", "full_picture",
          "shares",
          "likes.summary(true)",
          "comments.summary(true)",
          "insights.metric(post_impressions,post_engaged_users)",
        ].join(","),
        limit,
      });

      // ── Instagram media ──────────────────────────────────────────────
      const igMediaUrl = igAccountId
        ? metaUrl(`${igAccountId}/media`, {
            fields: [
              "id", "caption", "timestamp", "media_url", "thumbnail_url",
              "like_count", "comments_count",
              "insights.metric(impressions,reach,saved)",
            ].join(","),
            limit,
          })
        : null;

      const [fbResult, igResult] = await Promise.allSettled([
        metaFetch(fbPostsUrl, pageToken).then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            console.error(`[POSTS] FB posts error for page ${page.id}:`, err?.error?.message);
            return null;
          }
          return r.json();
        }),
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
          const reach = fbInsightValue(post.insights, "post_impressions");
          const engaged = fbInsightValue(post.insights, "post_engaged_users");
          const likes = Number(post.likes?.summary?.total_count) || 0;
          const comments = Number(post.comments?.summary?.total_count) || 0;
          const shares = Number(post.shares?.count) || 0;

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
            engagement: engaged || (likes + comments + shares),
          });
        }
      }

      // ── Normalize Instagram posts ────────────────────────────────────
      if (igResult.status === "fulfilled" && igResult.value?.data) {
        for (const media of igResult.value.data) {
          const impressions = fbInsightValue(media, "impressions"); // reuses same helper shape
          const reach = fbInsightValue(media, "reach");
          const saved = fbInsightValue(media, "saved");
          const likes = Number(media.like_count) || 0;
          const comments = Number(media.comments_count) || 0;

          allPosts.push({
            id: media.id,
            text: media.caption || "",
            channel: "instagram",
            date: media.timestamp,
            image: media.media_url || media.thumbnail_url || null,
            reach: reach || impressions,
            likes,
            comments,
            shares: 0, // IG API doesn't expose shares
            engagement: likes + comments + saved,
          });
        }
      }
    });

    await Promise.allSettled(pagePromises);

    // 3. Sort by date descending
    allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ posts: allPosts });
  } catch (error: any) {
    console.error("[POSTS] Unhandled error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

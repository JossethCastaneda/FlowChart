import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request, "social");
  if (!token) return NextResponse.json({ posts: [], error: "No Meta token" });
  const q = request.nextUrl.searchParams.get("q")?.replace(/^#/, "");
  if (!q) return NextResponse.json({ error: "q param required" }, { status: 400 });

  try {
    // Get IG user ID from first page
    const pagesRes = await metaFetch(
      metaUrl("me/accounts", { fields: "id,instagram_business_account,access_token" }),
      token
    );
    const pagesData = await pagesRes.json();
    const page = (pagesData.data || []).find((p: any) => p.instagram_business_account);
    if (!page?.instagram_business_account?.id) {
      return NextResponse.json({ posts: [], error: "No IG business account" });
    }
    const igId = page.instagram_business_account.id;
    const pageToken = page.access_token || token;

    // Search for hashtag ID dynamically (stateless)
    const searchRes = await metaFetch(
      metaUrl("ig_hashtag_search", { user_id: igId, q }),
      pageToken
    );
    if (!searchRes.ok) {
      const err = await searchRes.json();
      return NextResponse.json({ posts: [], error: err.error?.message || "Hashtag search failed. Verify instagram_manage_hashtags permission." });
    }
    const searchData = await searchRes.json();
    const hashtagId = searchData.data?.[0]?.id;
    if (!hashtagId) return NextResponse.json({ posts: [], error: "Hashtag not found" });

    // Get recent media for hashtag
    const mediaRes = await metaFetch(
      metaUrl(`${hashtagId}/recent_media`, {
        user_id: igId,
        fields: "id,caption,media_type,media_url,like_count,comments_count,timestamp,permalink",
      }),
      pageToken
    );
    if (!mediaRes.ok) {
      return NextResponse.json({ posts: [], error: "Could not fetch hashtag media" });
    }
    const mediaData = await mediaRes.json();
    const posts = (mediaData.data || []).map((m: any) => ({
      id: m.id,
      caption: m.caption || "",
      mediaType: m.media_type,
      mediaUrl: m.media_url,
      likes: m.like_count || 0,
      comments: m.comments_count || 0,
      timestamp: m.timestamp,
      permalink: m.permalink,
    }));

    return NextResponse.json({ posts, hashtag: q });
  } catch (err: any) {
    logger.error("[HASHTAGS] Error:", err);
    return NextResponse.json({ posts: [], error: err.message || "Error" }, { status: 500 });
  }
}

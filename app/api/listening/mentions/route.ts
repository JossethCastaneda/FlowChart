import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/listening/mentions
 * Fetches tagged posts + page mentions from Meta Graph API
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request, "listening");
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  try {
    // Get pages
    const pagesRes = await metaFetch(
      metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account" }),
      token
    );
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];

    const mentions: any[] = [];

    for (const page of pages) {
      const pageToken = page.access_token || token;

      // 1. Facebook: tagged posts (posts where the page is tagged)
      try {
        const taggedRes = await metaFetch(
          metaUrl(`${page.id}/tagged`, { fields: "id,message,from,created_time,permalink_url", limit: "20" }),
          pageToken
        );
        if (taggedRes.ok) {
          const taggedData = await taggedRes.json();
          for (const post of (taggedData.data || [])) {
            mentions.push({
              id: post.id,
              platform: "facebook",
              content: post.message || "(sin texto)",
              author: post.from?.name || "Usuario",
              authorAvatar: null,
              sentiment: null, // Sentiment analysis would go here
              url: post.permalink_url || null,
              publishedAt: post.created_time,
            });
          }
        }
      } catch { /* skip */ }

      // 2. Instagram: mentioned media (posts where the IG account is tagged)
      const igId = page.instagram_business_account?.id;
      if (igId) {
        try {
          const mentionedRes = await metaFetch(
            metaUrl(`${igId}/tags`, { fields: "id,caption,username,timestamp,permalink", limit: "20" }),
            pageToken
          );
          if (mentionedRes.ok) {
            const mentionedData = await mentionedRes.json();
            for (const media of (mentionedData.data || [])) {
              mentions.push({
                id: media.id,
                platform: "instagram",
                content: media.caption || "(sin texto)",
                author: media.username || "Usuario",
                authorAvatar: null,
                sentiment: null,
                url: media.permalink || null,
                publishedAt: media.timestamp,
              });
            }
          }
        } catch { /* skip */ }

        // 3. Instagram: recent comments mentioning keywords
        try {
          const mediaRes = await metaFetch(
            metaUrl(`${igId}/media`, { fields: "id,caption,comments{id,text,username,timestamp}", limit: "10" }),
            pageToken
          );
          if (mediaRes.ok) {
            const mediaData = await mediaRes.json();
            for (const m of (mediaData.data || [])) {
              for (const comment of (m.comments?.data || [])) {
                mentions.push({
                  id: comment.id,
                  platform: "instagram",
                  content: comment.text,
                  author: comment.username || "Usuario",
                  authorAvatar: null,
                  sentiment: null,
                  url: null,
                  publishedAt: comment.timestamp,
                });
              }
            }
          }
        } catch { /* skip */ }
      }
    }

    // Sort by date descending
    mentions.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return NextResponse.json({ mentions, count: mentions.length });
  } catch (err: any) {
    logger.error("[LISTENING] Error:", err);
    return NextResponse.json({ error: err.message || "Error fetching mentions" }, { status: 500 });
  }
}

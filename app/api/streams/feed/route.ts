import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/streams/feed
 * Fetches page feed or mentions for a stream column
 * Query params: type (home_feed|mentions|published), platform, pageId
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request, "streams");
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  const type = request.nextUrl.searchParams.get("type") || "home_feed";
  const platform = request.nextUrl.searchParams.get("platform") || "facebook";
  const pageId = request.nextUrl.searchParams.get("pageId");

  try {
    // Get pages. cache:no-store en todo el feed: es contenido "en tiempo real"; sin esto
    // metaFetch aplica next.revalidate=3600 y el botón de refrescar sería un no-op (1h stale).
    const pagesRes = await metaFetch(
      metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account,picture" }),
      token,
      { cache: "no-store" }
    );
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];
    if (pages.length === 0) {
      return NextResponse.json({ posts: [], error: "No pages found" });
    }

    const posts: any[] = [];
    // El frontend manda como pageId el id de la PÁGINA FB o el de la CUENTA IG vinculada.
    // Hay que matchear ambos; antes solo comparaba p.id (FB) y para columnas IG caía
    // silenciosamente a pages[0] → mostraba la cuenta equivocada en workspaces con 2+ páginas.
    let page = pages[0];
    if (pageId) {
      const found = pages.find(
        (p: any) => p.id === pageId || p.instagram_business_account?.id === pageId
      );
      if (!found) {
        return NextResponse.json(
          { posts: [], error: "La página/cuenta solicitada no está disponible en esta conexión." },
          { status: 404 }
        );
      }
      page = found;
    }
    const pageToken = page.access_token || token;

    if (platform === "facebook") {
      if (type === "home_feed" || type === "published") {
        // Published posts from the page
        const feedRes = await metaFetch(
          metaUrl(`${page.id}/published_posts`, {
            fields: "id,message,created_time,from,full_picture,shares,likes.summary(true),comments.summary(true)",
            limit: "15",
          }),
          pageToken,
          { cache: "no-store" }
        );
        if (feedRes.ok) {
          const feedData = await feedRes.json();
          for (const post of (feedData.data || [])) {
            posts.push({
              id: post.id,
              author: post.from?.name || page.name,
              handle: `@${(page.name || "").toLowerCase().replace(/\s+/g, "_")}`,
              content: post.message || "",
              time: post.created_time,
              likes: post.likes?.summary?.total_count || 0,
              comments: post.comments?.summary?.total_count || 0,
              shares: post.shares?.count || 0,
              platform: "facebook",
              image: post.full_picture || undefined,
            });
          }
        }
      }

      if (type === "mentions") {
        // Posts where page is tagged
        const tagRes = await metaFetch(
          metaUrl(`${page.id}/tagged`, {
            fields: "id,message,from,created_time,permalink_url",
            limit: "15",
          }),
          pageToken,
          { cache: "no-store" }
        );
        if (tagRes.ok) {
          const tagData = await tagRes.json();
          for (const post of (tagData.data || [])) {
            posts.push({
              id: post.id,
              author: post.from?.name || "Usuario",
              handle: "",
              content: post.message || "(sin texto)",
              time: post.created_time,
              likes: 0,
              comments: 0,
              shares: 0,
              platform: "facebook",
            });
          }
        }
      }
    }

    if (platform === "instagram") {
      const igId = page.instagram_business_account?.id;
      if (igId) {
        if (type === "home_feed" || type === "published") {
          const mediaRes = await metaFetch(
            metaUrl(`${igId}/media`, {
              fields: "id,caption,timestamp,media_url,thumbnail_url,like_count,comments_count,username",
              limit: "15",
            }),
            pageToken,
            { cache: "no-store" }
          );
          if (mediaRes.ok) {
            const mediaData = await mediaRes.json();
            for (const m of (mediaData.data || [])) {
              posts.push({
                id: m.id,
                author: m.username || page.name,
                handle: `@${m.username || ""}`,
                content: m.caption || "",
                time: m.timestamp,
                likes: m.like_count || 0,
                comments: m.comments_count || 0,
                shares: 0,
                platform: "instagram",
                image: m.media_url || m.thumbnail_url || undefined,
              });
            }
          }
        }

        if (type === "mentions") {
          const tagsRes = await metaFetch(
            metaUrl(`${igId}/tags`, {
              fields: "id,caption,username,timestamp,permalink",
              limit: "15",
            }),
            pageToken,
            { cache: "no-store" }
          );
          if (tagsRes.ok) {
            const tagsData = await tagsRes.json();
            for (const m of (tagsData.data || [])) {
              posts.push({
                id: m.id,
                author: m.username || "Usuario",
                handle: `@${m.username || ""}`,
                content: m.caption || "(sin texto)",
                time: m.timestamp,
                likes: 0,
                comments: 0,
                shares: 0,
                platform: "instagram",
              });
            }
          }
        }
      }
    }

    // Sort by time descending
    posts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({ posts });
  } catch (err: any) {
    logger.error("[STREAMS] Error:", err);
    return NextResponse.json({ error: err.message || "Error fetching feed" }, { status: 500 });
  }
}

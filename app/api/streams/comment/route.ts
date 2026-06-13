import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";

/**
 * POST /api/streams/comment
 * Publishes a comment to Facebook or Instagram post
 */
export async function POST(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const token = await getMetaAccessToken(request, "streams");
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  try {
    const { postId, platform, content } = await request.json();
    if (!postId || !platform || !content?.trim()) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const pagesRes = await metaFetch(
      metaUrl("me/accounts", { fields: "id,name,access_token,instagram_business_account" }),
      token
    );
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return NextResponse.json({ error: "No pages connected" }, { status: 400 });
    }

    // Try to resolve the page token by checking if the postId starts with a page's ID
    let targetPage = pages[0];
    for (const p of pages) {
      if (postId.startsWith(p.id)) {
        targetPage = p;
        break;
      }
    }
    const pageToken = targetPage.access_token || token;

    let res;
    if (platform === "facebook") {
      res = await metaFetch(
        metaUrl(`${postId}/comments`, { message: content }),
        pageToken,
        { method: "POST" }
      );
    } else if (platform === "instagram") {
      res = await metaFetch(
        metaUrl(`${postId}/comments`, { message: content }),
        pageToken,
        { method: "POST" }
      );
    } else {
      return NextResponse.json({ error: "Platform not supported" }, { status: 400 });
    }

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || "Failed to post comment" }, { status: res.status });
    }

    return NextResponse.json({ success: true, comment: data });
  } catch (err: any) {
    console.error("[STREAMS] Comment POST error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";

/**
 * GET /api/inbox/avatar?userId=xxx&pageId=yyy
 * Server-side proxy to fetch Meta profile pictures.
 * Resolves the redirect URL and returns the actual CDN image URL,
 * or directly streams the image bytes.
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return new NextResponse(null, { status: 401 });

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return new NextResponse(null, { status: 400 });

  const token = await getMetaAccessToken(request, "inbox");
  if (!token) return new NextResponse(null, { status: 401 });

  try {
    // First try to get the page token for this specific page
    const pageId = request.nextUrl.searchParams.get("pageId");
    let pageToken = token;
    if (pageId) {
      const pagesRes = await metaFetch(
        metaUrl("me/accounts", { fields: "id,access_token", limit: "50" }),
        token
      );
      const pagesData = await pagesRes.json();
      const page = (pagesData.data || []).find((p: any) => p.id === pageId);
      if (page?.access_token) pageToken = page.access_token;
    }

    // Fetch profile picture — follow redirect to get actual URL
    const picUrl = `https://graph.facebook.com/${userId}/picture?type=normal&width=100&height=100&access_token=${pageToken}`;
    const picRes = await fetch(picUrl, { redirect: "follow" });

    if (!picRes.ok) {
      return new NextResponse(null, { status: 404 });
    }

    // Stream the image back
    const contentType = picRes.headers.get("content-type") || "image/jpeg";
    const body = await picRes.arrayBuffer();

    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 24h
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

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

  // SEGURIDAD: userId se interpola en el path de la Graph API. Sin esta validación,
  // un valor como "me?fields=accounts{name,access_token}&x=" reescribe el nodo y
  // la respuesta JSON (con tokens de página) se streamearía al cliente. Los PSID /
  // IG-scoped ids son siempre numéricos → allowlist estricta.
  if (!/^\d+$/.test(userId)) return new NextResponse(null, { status: 400 });

  const token = await getMetaAccessToken(request, "inbox");
  if (!token) return new NextResponse(null, { status: 401 });

  try {
    // First try to get the page token for this specific page
    const pageId = request.nextUrl.searchParams.get("pageId");
    if (pageId && !/^\d+$/.test(pageId)) return new NextResponse(null, { status: 400 });
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

    // Fetch profile picture — token por header (nunca en la URL) y
    // siguiendo el redirect al CDN de Meta.
    const picUrl = `https://graph.facebook.com/${userId}/picture?type=normal&width=100&height=100`;
    const picRes = await metaFetch(picUrl, pageToken, { redirect: "follow" });

    if (!picRes.ok) {
      return new NextResponse(null, { status: 404 });
    }

    // SEGURIDAD (defensa en profundidad): solo relayar imágenes. Si Graph devolviera
    // JSON (p. ej. por un fallo de validación futuro), nunca se reenvía al cliente.
    const contentType = picRes.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return new NextResponse(null, { status: 415 });
    }
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

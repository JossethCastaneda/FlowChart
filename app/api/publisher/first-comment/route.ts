import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { decryptToken } from "@/lib/encryption";

const META_V = process.env.META_API_VERSION || "v22.0";

/**
 * POST /api/publisher/first-comment
 *
 * Posts a first comment on an Instagram media object.
 *
 * Body:
 *   mediaId:   string  — The IG media ID to comment on
 *   comment:   string  — The comment text
 *   pageToken: string  — Encrypted page access token
 */
export async function POST(req: NextRequest) {
  try {
    // ── Auth checks ──
    const jwt = await getToken({ req });
    if (!jwt?.sub) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(jwt.sub);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    // Try module-specific token, then fallback
    let token = await getMetaAccessToken(req, "publisher_instagram");
    if (!token) token = await getMetaAccessToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "No hay token Meta. Ve a Integraciones y conecta tu cuenta." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { mediaId, comment, pageToken: encryptedPageToken } = body;

    if (!mediaId || !comment) {
      return NextResponse.json(
        { error: "mediaId y comment son requeridos" },
        { status: 400 }
      );
    }

    // Decrypt the page token — prefer it over workspace-level token
    const pageToken = decryptToken(encryptedPageToken) || token;

    // ── Post the comment ──
    const commentRes = await metaFetch(
      `https://graph.facebook.com/${META_V}/${mediaId}/comments`,
      pageToken,
      {
        method: "POST",
        body: JSON.stringify({ message: comment }),
      }
    );
    const commentData = await commentRes.json();

    if (!commentRes.ok || commentData.error) {
      const mapped = mapMetaError(commentData?.error);
      console.error("[FIRST-COMMENT] Meta API error:", commentData?.error?.message);
      return NextResponse.json(
        { error: mapped.user_message },
        { status: 422 }
      );
    }

    console.log(`[FIRST-COMMENT] ✅ Comment posted on ${mediaId}: ${commentData.id}`);
    return NextResponse.json({
      success: true,
      commentId: commentData.id,
      mediaId,
    });
  } catch (err: any) {
    console.error("[FIRST-COMMENT] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}

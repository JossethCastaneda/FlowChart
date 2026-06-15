import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { decryptToken } from "@/lib/encryption";
import { validateBody } from "@/lib/validate";
import { z } from "zod";

const META_V = process.env.META_API_VERSION || "v25.0";

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
export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  // Try module-specific token, then fallback
  let token = await getMetaAccessToken(req, "publisher_instagram");
  if (!token) token = await getMetaAccessToken(req);
  if (!token) {
    return apiError("No hay token Meta. Ve a Integraciones y conecta tu cuenta.", "UNAUTHORIZED", 401);
  }

  const _validate = await validateBody(req, z.object({
    mediaId: z.string().min(1, "mediaId es requerido"),
    comment: z.string().min(1, "comment es requerido"),
    pageToken: z.string().optional()
  }));

  if (!_validate.ok) return _validate.response;
  
  const { mediaId, comment, pageToken: encryptedPageToken } = _validate.data;

  // Decrypt the page token — prefer it over workspace-level token
  const pageToken = encryptedPageToken ? decryptToken(encryptedPageToken) || token : token;

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
    return apiError(mapped.user_message, "META_API_ERROR", 422);
  }

  console.log(`[FIRST-COMMENT] ✅ Comment posted on ${mediaId}: ${commentData.id}`);
  
  return apiSuccess({
    success: true,
    commentId: commentData.id,
    mediaId,
  });
});

import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch, META_API_VERSION } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { validateBody } from "@/lib/validate";
import { AdCreateSchema } from "@/lib/ads-schemas";
import { logger } from "@/lib/logger";

/**
 * POST /api/meta/ads/create — create a NEW ad under an ad set.
 *
 * Flow:
 *   1. Create an AdCreative (with object_story_spec for the page post)
 *   2. Create an Ad linking to that creative
 *
 * SAFETY: created PAUSED. An ad in PAUSED does not deliver.
 * Gated behind confirmed_by_user.
 *
 * Body: { adAccountId, adsetId, name, pageId, message?, headline?, description?,
 *         link?, imageUrl?, imageHash?, videoId?, callToAction?, confirmed_by_user }
 */

const DEFAULT_CTA = "LEARN_MORE";

export async function POST(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const _validate = await validateBody(req, AdCreateSchema);
    if (!_validate.ok) return _validate.response;
    let { adAccountId } = _validate.data;
    const { adsetId, name, pageId, message, headline, description, link, imageUrl, imageHash, videoId, callToAction } = _validate.data;

    if (!String(adAccountId).startsWith("act_")) adAccountId = `act_${adAccountId}`;

    // ─── Step 1: Build the creative ────────────────────────────────────
    const cta = callToAction || DEFAULT_CTA;

    // Determine creative type: video, image+link, or text-only
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    let storySpec: Record<string, any>;

    if (videoId) {
      // Video ad
      storySpec = {
        page_id: pageId,
        video_data: {
          video_id: videoId,
          message: message || "",
          title: headline || "",
          call_to_action: { type: cta, value: { link: link || "" } },
          ...(imageUrl ? { image_url: imageUrl } : {}),
        },
      };
    } else if (link) {
      // Link ad (image + link)
      storySpec = {
        page_id: pageId,
        link_data: {
          link,
          message: message || "",
          name: headline || "",
          description: description || "",
          call_to_action: { type: cta, value: { link } },
          ...(imageHash ? { image_hash: imageHash } : imageUrl ? { picture: imageUrl } : {}),
        },
      };
    } else {
      // Photo/text post (no outbound link)
      storySpec = {
        page_id: pageId,
        link_data: {
          link: `https://www.facebook.com/${pageId}`,
          message: message || "",
          name: headline || "",
          ...(imageHash ? { image_hash: imageHash } : imageUrl ? { picture: imageUrl } : {}),
        },
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const creativePayload: Record<string, any> = {
      name: `Creative — ${String(name).trim()}`,
      object_story_spec: JSON.stringify(storySpec),
    };

    const creativeUrl = `https://graph.facebook.com/${META_API_VERSION}/${adAccountId}/adcreatives`;
    logger.info("[ADS] Creating AdCreative", { adAccountId, adsetId, pageId });

    const creativeRes = await metaFetch(creativeUrl, accessToken, {
      method: "POST",
      body: JSON.stringify(creativePayload),
    });
    const creativeJson = await creativeRes.json();

    if (!creativeRes.ok) {
      logger.error("[ADS] AdCreative create failed", { status: creativeRes.status, error: creativeJson?.error });
      const parsed = mapMetaError(creativeJson);
      return NextResponse.json({
        status: "error",
        step: "creative",
        error_code: parsed.original_code,
        user_message: `Error al crear el creative: ${parsed.user_message}`,
        error_details: parsed,
      }, { status: creativeRes.status });
    }

    const creativeId = creativeJson.id;
    logger.info("[ADS] AdCreative created", { creativeId });

    // ─── Step 2: Create the Ad ─────────────────────────────────────────
    const adPayload = {
      name: String(name).trim(),
      adset_id: adsetId,
      creative: { creative_id: creativeId },
      status: "PAUSED", // SAFETY — always paused
    };

    const adUrl = `https://graph.facebook.com/${META_API_VERSION}/${adAccountId}/ads`;
    logger.info("[ADS] Creating Ad", { adAccountId, adsetId, creativeId });

    const adRes = await metaFetch(adUrl, accessToken, {
      method: "POST",
      body: JSON.stringify(adPayload),
    });
    const adJson = await adRes.json();

    if (!adRes.ok) {
      logger.error("[ADS] Ad create failed", { status: adRes.status, error: adJson?.error });
      const parsed = mapMetaError(adJson);
      return NextResponse.json({
        status: "error",
        step: "ad",
        error_code: parsed.original_code,
        user_message: `Error al crear el anuncio: ${parsed.user_message}`,
        error_details: parsed,
        creative_id: creativeId, // Still useful — creative was created
      }, { status: adRes.status });
    }

    logger.info("[ADS] Ad created", { adId: adJson.id, creativeId, adsetId });
    return NextResponse.json({
      status: "success",
      object_id: adJson.id,
      creative_id: creativeId,
      created_paused: true,
      data: adJson,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  } catch (error: any) {
    logger.error("[ADS] Ad create unhandled", { error: error.message });
    return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
  }
}

export const maxDuration = 30;

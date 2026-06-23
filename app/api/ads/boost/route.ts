import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, META_API_VERSION } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { validateBody } from "@/lib/validate";
import { BoostSchema } from "@/lib/ads-schemas";
import { logger } from "@/lib/logger";

/**
 * POST /api/ads/boost
 *
 * Creates a boosted post via Facebook Ads API.
 * Three-step flow: Campaign → Ad Set → Ad.
 *
 * SAFETY:
 * - Todo se crea en PAUSED: el boost NO gasta hasta que el usuario lo active
 *   explícitamente desde el Ads Manager.
 * - El page token NUNCA viene del cliente: se resuelve server-side desde la
 *   integración del workspace (Graph /{pageId}?fields=access_token).
 * - Gated por confirmed_by_user, como toda escritura de Ads.
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

    let token = await getMetaAccessToken(req, "ads");
    if (!token) token = await getMetaAccessToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "No hay token Meta. Ve a Integraciones y conecta tu cuenta de Ads." },
        { status: 401 }
      );
    }

    const _validate = await validateBody(req, BoostSchema);
    if (!_validate.ok) return _validate.response;
    const { postId, adAccountId, budgetCents, durationDays, countries, pageId } = _validate.data;

    // ── Resolver page token SERVER-SIDE (necesario para boostear posts de
    // página). Si no se puede, se usa el token de Ads del workspace. ──
    let adsToken = token;
    try {
      const pageRes = await metaFetch(
        `https://graph.facebook.com/${META_API_VERSION}/${pageId}?fields=access_token`,
        token
      );
      const pageData = await pageRes.json();
      if (pageRes.ok && typeof pageData?.access_token === "string") {
        adsToken = pageData.access_token;
      }
    } catch {
      // El token de Ads del workspace sigue siendo un camino válido.
    }

    const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    const normalizedCountries = countries.map((c) => c.toUpperCase());

    // ── Timestamps ──
    const now = new Date();
    const startTime = now.toISOString();
    const endTime = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const boostName = `Boost_${postId}_${now.toISOString().slice(0, 10)}`;

    // ═══════════════════════════════════════════
    // Step 1: Create Campaign (PAUSED)
    // ═══════════════════════════════════════════
    const campaignRes = await metaFetch(
      `https://graph.facebook.com/${META_API_VERSION}/${actId}/campaigns`,
      adsToken,
      {
        method: "POST",
        body: JSON.stringify({
          name: `${boostName}_Campaign`,
          objective: "OUTCOME_ENGAGEMENT",
          status: "PAUSED",
          special_ad_categories: [],
        }),
      }
    );
    const campaignData = await campaignRes.json();

    if (!campaignRes.ok || campaignData.error || !campaignData.id) {
      const mapped = mapMetaError(campaignData?.error);
      logger.error("[BOOST] Campaign creation error:", campaignData?.error?.message);
      return NextResponse.json(
        { error: `Campaign: ${mapped.user_message}` },
        { status: 422 }
      );
    }

    const campaignId = campaignData.id;

    // ═══════════════════════════════════════════
    // Step 2: Create Ad Set (PAUSED)
    // ═══════════════════════════════════════════
    const adsetRes = await metaFetch(
      `https://graph.facebook.com/${META_API_VERSION}/${actId}/adsets`,
      adsToken,
      {
        method: "POST",
        body: JSON.stringify({
          campaign_id: campaignId,
          name: `${boostName}_AdSet`,
          daily_budget: budgetCents,
          billing_event: "IMPRESSIONS",
          optimization_goal: "POST_ENGAGEMENT",
          targeting: {
            geo_locations: {
              countries: normalizedCountries,
            },
            // Advantage+: declarar explícitamente la automatización de audiencia
            targeting_automation: { advantage_audience: 1 },
          },
          start_time: startTime,
          end_time: endTime,
          bid_strategy: "LOWEST_COST_WITHOUT_CAP",
          status: "PAUSED",
        }),
      }
    );
    const adsetData = await adsetRes.json();

    if (!adsetRes.ok || adsetData.error || !adsetData.id) {
      const mapped = mapMetaError(adsetData?.error);
      logger.error("[BOOST] AdSet creation error:", adsetData?.error?.message);
      return NextResponse.json(
        { error: `AdSet: ${mapped.user_message}`, campaignId },
        { status: 422 }
      );
    }

    const adsetId = adsetData.id;

    // ═══════════════════════════════════════════
    // Step 3: Create Ad (PAUSED)
    // ═══════════════════════════════════════════
    const objectStoryId = `${pageId}_${postId}`;

    const adRes = await metaFetch(
      `https://graph.facebook.com/${META_API_VERSION}/${actId}/ads`,
      adsToken,
      {
        method: "POST",
        body: JSON.stringify({
          adset_id: adsetId,
          name: `${boostName}_Ad`,
          status: "PAUSED",
          creative: {
            object_story_id: objectStoryId,
          },
        }),
      }
    );
    const adData = await adRes.json();

    if (!adRes.ok || adData.error || !adData.id) {
      const mapped = mapMetaError(adData?.error);
      logger.error("[BOOST] Ad creation error:", adData?.error?.message);
      return NextResponse.json(
        { error: `Ad: ${mapped.user_message}`, campaignId, adsetId },
        { status: 422 }
      );
    }

    const adId = adData.id;

    logger.info(`[BOOST] Boost created PAUSED: campaign=${campaignId} adset=${adsetId} ad=${adId}`);
    return NextResponse.json({
      success: true,
      created_paused: true,
      campaignId,
      adsetId,
      adId,
    });
  } catch (err: any) {
    logger.error("[BOOST] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}

// Ad creation can take time with multiple sequential Meta API calls
export const maxDuration = 30;

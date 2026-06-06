import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import { decryptToken } from "@/lib/encryption";

const META_V = process.env.META_API_VERSION || "v25.0";

/**
 * POST /api/ads/boost
 *
 * Creates a boosted post via Facebook Ads API.
 * Three-step flow: Campaign → Ad Set → Ad.
 *
 * Body:
 *   postId:        string   — The Facebook post ID to boost
 *   adAccountId:   string   — Ad account ID (without "act_" prefix)
 *   budgetCents:   number   — Daily budget in cents
 *   durationDays:  number   — Number of days to run the boost
 *   countries:     string[] — ISO 3166-1 alpha-2 country codes for targeting
 *   pageId:        string   — Facebook Page ID
 *   pageToken:     string   — Encrypted page access token
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

    const body = await req.json();
    const {
      postId,
      adAccountId,
      budgetCents,
      durationDays,
      countries,
      pageId,
      pageToken: encryptedPageToken,
    } = body;

    if (!postId || !adAccountId || !budgetCents || !durationDays || !pageId) {
      return NextResponse.json(
        { error: "postId, adAccountId, budgetCents, durationDays y pageId son requeridos" },
        { status: 400 }
      );
    }

    if (!countries || !Array.isArray(countries) || countries.length === 0) {
      return NextResponse.json(
        { error: "countries debe ser un array con al menos un país" },
        { status: 400 }
      );
    }

    // Use ads token for API calls; decrypt pageToken for creative object_story_id
    const adsToken = decryptToken(encryptedPageToken) || token;
    const actId = `act_${adAccountId}`;

    // ── Timestamps ──
    const now = new Date();
    const startTime = now.toISOString();
    const endTime = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const boostName = `Boost_${postId}_${now.toISOString().slice(0, 10)}`;

    // ═══════════════════════════════════════════
    // Step 1: Create Campaign
    // ═══════════════════════════════════════════
    const campaignRes = await metaFetch(
      `https://graph.facebook.com/${META_V}/${actId}/campaigns`,
      adsToken,
      {
        method: "POST",
        body: JSON.stringify({
          name: `${boostName}_Campaign`,
          objective: "OUTCOME_ENGAGEMENT",
          status: "ACTIVE",
          special_ad_categories: [],
        }),
      }
    );
    const campaignData = await campaignRes.json();

    if (!campaignRes.ok || campaignData.error || !campaignData.id) {
      const mapped = mapMetaError(campaignData?.error);
      console.error("[BOOST] Campaign creation error:", campaignData?.error?.message);
      return NextResponse.json(
        { error: `Campaign: ${mapped.user_message}` },
        { status: 422 }
      );
    }

    const campaignId = campaignData.id;

    // ═══════════════════════════════════════════
    // Step 2: Create Ad Set
    // ═══════════════════════════════════════════
    const adsetRes = await metaFetch(
      `https://graph.facebook.com/${META_V}/${actId}/adsets`,
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
              countries,
            },
          },
          start_time: startTime,
          end_time: endTime,
          bid_strategy: "LOWEST_COST_WITHOUT_CAP",
          status: "ACTIVE",
        }),
      }
    );
    const adsetData = await adsetRes.json();

    if (!adsetRes.ok || adsetData.error || !adsetData.id) {
      const mapped = mapMetaError(adsetData?.error);
      console.error("[BOOST] AdSet creation error:", adsetData?.error?.message);
      return NextResponse.json(
        { error: `AdSet: ${mapped.user_message}`, campaignId },
        { status: 422 }
      );
    }

    const adsetId = adsetData.id;

    // ═══════════════════════════════════════════
    // Step 3: Create Ad
    // ═══════════════════════════════════════════
    const objectStoryId = `${pageId}_${postId}`;

    const adRes = await metaFetch(
      `https://graph.facebook.com/${META_V}/${actId}/ads`,
      adsToken,
      {
        method: "POST",
        body: JSON.stringify({
          adset_id: adsetId,
          name: `${boostName}_Ad`,
          status: "ACTIVE",
          creative: {
            object_story_id: objectStoryId,
          },
        }),
      }
    );
    const adData = await adRes.json();

    if (!adRes.ok || adData.error || !adData.id) {
      const mapped = mapMetaError(adData?.error);
      console.error("[BOOST] Ad creation error:", adData?.error?.message);
      return NextResponse.json(
        { error: `Ad: ${mapped.user_message}`, campaignId, adsetId },
        { status: 422 }
      );
    }

    const adId = adData.id;

    console.log(`[BOOST] ✅ Boost created: campaign=${campaignId} adset=${adsetId} ad=${adId}`);
    return NextResponse.json({
      success: true,
      campaignId,
      adsetId,
      adId,
    });
  } catch (err: any) {
    console.error("[BOOST] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}

// Ad creation can take time with multiple sequential Meta API calls
export const maxDuration = 30;

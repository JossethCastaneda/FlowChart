import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch , META_API_VERSION } from "@/lib/server-auth";

/**
 * Meta Ad Creatives API — Robust implementation
 *
 * Combines three Meta API calls to build a complete creative record per ad:
 *   1. /ads         → ad metadata + creative sub-fields + asset_feed_spec
 *   2. /insights    → performance data (spend, clicks, actions, etc.)
 *   3. /adcreatives → full-resolution images (thumbnail_width=480)
 *
 * Handles Dynamic Creative Optimization (DCO) ads via asset_feed_spec.
 * All three calls use Promise.allSettled — any failure returns partial data.
 */

// Extracts the best available full-resolution image URL from a creative object
function extractImageUrl(creative: {
  image_url?: string;
  thumbnail_url?: string;
  object_story_spec?: any;
  asset_feed_spec?: any;
}): string {
  const spec = creative.object_story_spec || {};
  const feed = creative.asset_feed_spec || {};

  // 1. Direct image from the /adcreatives endpoint (highest quality)
  if (creative.image_url) return creative.image_url;

  // 2. DCO feed images (Dynamic Creative Optimization)
  if (Array.isArray(feed.images) && feed.images.length > 0) {
    const img = feed.images[0];
    return img.url || img.thumbnail_url || "";
  }

  // 3. Video thumbnail from DCO feed
  if (Array.isArray(feed.videos) && feed.videos.length > 0) {
    const vid = feed.videos[0];
    return vid.thumbnail_url || vid.image_url || "";
  }

  // 4. object_story_spec fields
  if (spec.link_data?.image_url) return spec.link_data.image_url;
  if (spec.photo_data?.url) return spec.photo_data.url;
  if (spec.video_data?.image_url) return spec.video_data.image_url;

  // 5. Fallback to 480px thumbnail from /adcreatives endpoint
  if (creative.thumbnail_url) return creative.thumbnail_url;

  return "";
}

// Extracts all text variants from a creative (DCO + standard)
function extractTexts(creative: {
  title?: string;
  body?: string;
  call_to_action_type?: string;
  object_story_spec?: any;
  asset_feed_spec?: any;
}): {
  title: string;
  body: string;
  description: string;
  cta: string;
  allTitles: string[];
  allBodies: string[];
} {
  const spec = creative.object_story_spec || {};
  const feed = creative.asset_feed_spec || {};
  const link = spec.link_data || {};

  // Collect ALL texts from DCO feed (for text analysis panels)
  const allTitles: string[] = (feed.titles || []).map((t: any) => t.text || "").filter(Boolean);
  const allBodies: string[] = (feed.bodies || []).map((b: any) => b.text || "").filter(Boolean);
  const allDescriptions: string[] = (feed.descriptions || []).map((d: any) => d.text || "").filter(Boolean);
  const allCtas: string[] = (feed.call_to_action_types || []).filter(Boolean);

  return {
    title: allTitles[0] || creative.title || link.name || "",
    body: allBodies[0] || creative.body || link.message || spec.photo_data?.message || spec.video_data?.message || "",
    description: allDescriptions[0] || link.description || "",
    cta: (allCtas[0] || creative.call_to_action_type || link.call_to_action?.type || "").replace(/_/g, " "),
    allTitles,
    allBodies,
  };
}

// Detects creative format based on creative structure — NOT action types
// Meta records video_view for ALL ads (even images with autoplay preview)
function detectFormat(creative: any, detail: any): "video" | "image" | "carousel" {
  const spec = creative.object_story_spec || {};
  const feed = creative.asset_feed_spec || detail?.assetFeedSpec || {};
  const adName = (creative.name || "").toLowerCase();

  // 1. object_story_spec.video_data → definitely a video ad
  if (spec.video_data) return "video";

  // 2. asset_feed_spec has videos array → DCO video
  if (Array.isArray(feed.videos) && feed.videos.length > 0) return "video";

  // 3. Name-based detection (reliable for Mexican agencies like SODARE)
  if (adName.includes("video") || adName.includes("reel")) return "video";

  // 4. Carousel detection
  if (spec.link_data?.child_attachments?.length > 1) return "carousel";

  // 5. Default: image
  return "image";
}

export async function GET(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let adAccountId = searchParams.get("adAccountId");
  const preset = searchParams.get("preset") || "this_month";
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");

  if (!adAccountId) {
    return NextResponse.json({ error: "Missing adAccountId" }, { status: 400 });
  }
  if (!adAccountId.startsWith("act_")) adAccountId = `act_${adAccountId}`;

  const version = META_API_VERSION;

  // ── Time param ──────────────────────────────────────────────────────────
  const timeParams = new URLSearchParams();
  if (dateStart && dateEnd) {
    timeParams.set("time_range", JSON.stringify({ since: dateStart, until: dateEnd }));
  } else {
    timeParams.set("date_preset", preset);
  }
  const timeQs = timeParams.toString();

  // ── API URLs ─────────────────────────────────────────────────────────────
  // Creative fields: everything needed to extract image + text + format
  const creativeFields = [
    "id", "name", "thumbnail_url", "image_url",
    "title", "body", "call_to_action_type",
    "object_story_spec", "asset_feed_spec",
  ].join(",");

  // Note: asset_feed_spec is not available as a sub-field of creative{} in /ads
  // We must fetch it separately via /adcreatives
  const adsUrl = `https://graph.facebook.com/${version}/${adAccountId}/ads?` +
    `fields=id,name,status,effective_image_url,creative{${creativeFields}}&limit=100`;

  const insightsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?` +
    `level=ad&fields=ad_id,spend,impressions,clicks,actions,action_values,cpc,ctr&${timeQs}&limit=200`;

  const creativesUrl = `https://graph.facebook.com/${version}/${adAccountId}/adcreatives?` +
    `fields=${creativeFields}&thumbnail_width=720&thumbnail_height=720&limit=200`;

  // ── Parallel fetch (allSettled = never crashes) ─────────────────────────
  const [adsRes, insightsRes, creativesRes] = await Promise.allSettled([
    metaFetch(adsUrl, accessToken),
    metaFetch(insightsUrl, accessToken),
    metaFetch(creativesUrl, accessToken),
  ]);

  // Helper: safely parse a response
  const parseRes = async (result: PromiseSettledResult<Response>, tag: string) => {
    if (result.status === "rejected") {
      console.error(`[ADCREATIVES:${tag}] Fetch rejected:`, result.reason);
      return { data: [] };
    }
    if (!result.value.ok) {
      const err = await result.value.json().catch(() => ({}));
      console.error(`[ADCREATIVES:${tag}] HTTP error:`, err?.error?.message || `HTTP ${result.value.status}`);
      return { data: [] };
    }
    return result.value.json().catch(() => ({ data: [] }));
  };

  const [adsJson, insightsJson, creativesJson] = await Promise.all([
    parseRes(adsRes, "ads"),
    parseRes(insightsRes, "insights"),
    parseRes(creativesRes, "creatives"),
  ]);

  // ── Build lookup maps ────────────────────────────────────────────────────

  // Performance by ad_id
  const insightsMap: Record<string, any> = {};
  for (const ins of (insightsJson.data || [])) {
    insightsMap[ins.ad_id] = ins;
  }

  // Full-res image + DCO texts by creative_id (from /adcreatives endpoint)
  const creativeDetailMap: Record<string, {
    imageUrl: string;
    thumbUrl: string;
    feedTitles: string[];
    feedBodies: string[];
    assetFeedSpec: any;
    objectStorySpec: any;
  }> = {};
  for (const cr of (creativesJson.data || [])) {
    const imageUrl = extractImageUrl(cr);
    const feed = cr.asset_feed_spec || {};
    creativeDetailMap[cr.id] = {
      imageUrl,
      thumbUrl: cr.thumbnail_url || "",
      feedTitles: (feed.titles || []).map((t: any) => t.text || "").filter(Boolean),
      feedBodies: (feed.bodies || []).map((b: any) => b.text || "").filter(Boolean),
      assetFeedSpec: cr.asset_feed_spec || {},
      objectStorySpec: cr.object_story_spec || {},
    };
  }

  // ── Merge ads + creatives + insights ────────────────────────────────────
  // ── Extract carousel items and video IDs ────────────────────────────────
  // We need these before the merge loop so we can batch-fetch video URLs
  const videoIdSet = new Set<string>();

  // Pre-scan ads for video_ids
  for (const ad of (adsJson.data || [])) {
    const creative = ad.creative || {};
    const spec = creative.object_story_spec || {};
    const detail = creativeDetailMap[creative.id] || null;
    const detailSpec = detail?.objectStorySpec || {};

    const videoId = spec.video_data?.video_id || detailSpec.video_data?.video_id;
    if (videoId) videoIdSet.add(String(videoId));

    // Also check DCO feed videos
    const feed = creative.asset_feed_spec || detail?.assetFeedSpec || {};
    if (Array.isArray(feed.videos)) {
      for (const v of feed.videos) {
        if (v.video_id) videoIdSet.add(String(v.video_id));
      }
    }
  }

  // Batch-fetch video source URLs (max 50 at once via /?ids=)
  const videoSourceMap: Record<string, string> = {};
  const videoIds = Array.from(videoIdSet);
  if (videoIds.length > 0) {
    // Meta supports batch ID lookups: /?ids=id1,id2&fields=source
    const chunks = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      chunks.push(videoIds.slice(i, i + 50));
    }
    const videoResults = await Promise.allSettled(
      chunks.map(chunk =>
        metaFetch(
          `https://graph.facebook.com/${version}/?ids=${chunk.join(",")}&fields=source`,
          accessToken
        )
      )
    );
    for (const result of videoResults) {
      if (result.status === "fulfilled" && result.value.ok) {
        try {
          const json = await result.value.json();
          for (const [id, data] of Object.entries(json)) {
            if ((data as any).source) videoSourceMap[id] = (data as any).source;
          }
        } catch { /* ignore parse errors */ }
      }
    }
  }

  // ── Merge ads + creatives + insights ────────────────────────────────────
  const creatives = (adsJson.data || []).map((ad: any) => {
    const creative = ad.creative || {};
    const ins = insightsMap[ad.id] || {};
    const detail = creativeDetailMap[creative.id] || null;

    // Image priority: full-res from /adcreatives > ad.effective_image_url > creative sub-fields
    let imageUrl = detail?.imageUrl || ad.effective_image_url || "";
    if (!imageUrl) imageUrl = detail?.thumbUrl || "";
    // Further fallback from nested creative fields
    if (!imageUrl) imageUrl = extractImageUrl(creative);

    const texts = extractTexts(creative);

    // If /adcreatives had more/better texts, prefer them
    const allTitles = detail?.feedTitles?.length ? detail.feedTitles : texts.allTitles;
    const allBodies = detail?.feedBodies?.length ? detail.feedBodies : texts.allBodies;

    // Detect format from creative structure (NOT from actions)
    const format = detectFormat(
      { ...creative, name: ad.name },
      detail
    );

    // ── Extract video URL ──
    const spec = creative.object_story_spec || detail?.objectStorySpec || {};
    const feed = creative.asset_feed_spec || detail?.assetFeedSpec || {};
    let videoUrl = "";
    const videoId = spec.video_data?.video_id;
    if (videoId && videoSourceMap[String(videoId)]) {
      videoUrl = videoSourceMap[String(videoId)];
    }
    // Fallback: DCO feed videos
    if (!videoUrl && Array.isArray(feed.videos) && feed.videos.length > 0) {
      const dcoVideoId = feed.videos[0].video_id;
      if (dcoVideoId && videoSourceMap[String(dcoVideoId)]) {
        videoUrl = videoSourceMap[String(dcoVideoId)];
      }
    }

    // ── Extract carousel items ──
    const carouselItems: { imageUrl: string; title: string; description: string; link: string }[] = [];
    const childAttachments = spec.link_data?.child_attachments || [];
    if (Array.isArray(childAttachments) && childAttachments.length > 1) {
      for (const child of childAttachments) {
        carouselItems.push({
          imageUrl: child.picture || child.image_url || "",
          title: child.name || "",
          description: child.description || "",
          link: child.link || "",
        });
      }
    }

    return {
      adId:        ad.id,
      adName:      ad.name || "Sin nombre",
      status:      ad.status || "UNKNOWN",
      creativeId:  creative.id || "",
      thumbnailUrl: imageUrl,
      format,      // "video" | "image" | "carousel"
      videoUrl,    // playable MP4 URL (empty if not video or unavailable)
      carouselItems,  // array of carousel slides (empty if not carousel)
      title:       allTitles[0] || texts.title,
      body:        allBodies[0] || texts.body,
      description: texts.description,
      cta:         texts.cta,
      // Arrays for text analysis panels
      allTitles,
      allBodies,
      // Performance metrics (already coerced)
      spend:       parseFloat(ins.spend || "0"),
      impressions: parseInt(ins.impressions || "0", 10),
      clicks:      parseInt(ins.clicks || "0", 10),
      ctr:         parseFloat(ins.ctr || "0"),
      cpc:         parseFloat(ins.cpc || "0"),
      actions:     ins.actions || [],
      actionValues: ins.action_values || [],
    };
  });

  // Sort by spend descending
  creatives.sort((a: any, b: any) => b.spend - a.spend);

  return NextResponse.json({ data: creatives });
}


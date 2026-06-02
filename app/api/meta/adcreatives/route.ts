import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";

/**
 * Fetch ad creatives with thumbnails, texts, and performance data.
 * Combines ads + creative details + insights for a complete creative view.
 */
export async function GET(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req);
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

  const version = process.env.META_API_VERSION || "v22.0";

  // Build time range
  let timeParam: string;
  if (dateStart && dateEnd) {
    const tr = JSON.stringify({ since: dateStart, until: dateEnd });
    timeParam = `time_range=${encodeURIComponent(tr)}`;
  } else {
    timeParam = `date_preset=${preset}`;
  }

  try {
    // 1) Fetch ads with basic creative info + effective_image_url
    const adsUrl = `https://graph.facebook.com/${version}/${adAccountId}/ads?fields=id,name,status,effective_image_url,creative{id,name,thumbnail_url,image_url,image_hash,title,body,call_to_action_type,object_story_spec}&limit=50`;
    // 2) Fetch insights for performance data
    const insightsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?level=ad&fields=ad_id,ad_name,spend,impressions,clicks,actions,action_values,cpc,ctr&${timeParam}&limit=50`;
    // 3) Fetch adcreatives separately — this endpoint returns full-res image_url and supports thumbnail_width
    const creativesUrl = `https://graph.facebook.com/${version}/${adAccountId}/adcreatives?fields=id,name,image_url,thumbnail_url,object_story_spec&thumbnail_width=480&thumbnail_height=480&limit=50`;

    const [adsRes, insightsRes, creativesRes] = await Promise.all([
      metaFetch(adsUrl, accessToken),
      metaFetch(insightsUrl, accessToken),
      metaFetch(creativesUrl, accessToken),
    ]);

    if (!adsRes.ok) {
      const errBody = await adsRes.json().catch(() => ({}));
      console.error("[ADCREATIVES] Ads fetch error:", JSON.stringify(errBody?.error || errBody));
    }
    const adsJson = adsRes.ok ? await adsRes.json() : { data: [] };
    const insightsJson = insightsRes.ok ? await insightsRes.json() : { data: [] };
    const creativesJson = creativesRes.ok ? await creativesRes.json() : { data: [] };

    // Build insights lookup by ad_id
    const insightsMap: Record<string, any> = {};
    (insightsJson.data || []).forEach((ins: any) => {
      insightsMap[ins.ad_id] = ins;
    });

    // Build creatives lookup by creative ID (full-res images from dedicated endpoint)
    const creativeImageMap: Record<string, { imageUrl: string; thumbUrl: string }> = {};
    (creativesJson.data || []).forEach((cr: any) => {
      const spec = cr.object_story_spec || {};
      const fullRes = cr.image_url || spec.link_data?.image_url || spec.photo_data?.url || spec.video_data?.image_url || "";
      creativeImageMap[cr.id] = {
        imageUrl: fullRes,
        thumbUrl: cr.thumbnail_url || "", // 480x480 from thumbnail_width param
      };
    });

    // Merge ads with their insights
    const creatives = (adsJson.data || []).map((ad: any) => {
      const creative = ad.creative || {};
      const ins = insightsMap[ad.id] || {};
      const storySpec = creative.object_story_spec || {};
      
      // Get full-res image from the dedicated /adcreatives endpoint (supports thumbnail_width=480)
      const crImg = creativeImageMap[creative.id];
      
      // Priority: dedicated endpoint full-res > dedicated endpoint 480px thumb > ad.effective_image_url > story_spec > creative sub-fields > 64px thumb
      let imageUrl = crImg?.imageUrl || crImg?.thumbUrl || ad.effective_image_url || "";
      
      // Fallback to object_story_spec
      if (!imageUrl && storySpec.link_data?.image_url) imageUrl = storySpec.link_data.image_url;
      if (!imageUrl && storySpec.photo_data?.url) imageUrl = storySpec.photo_data.url;
      if (!imageUrl && storySpec.video_data?.image_url) imageUrl = storySpec.video_data.image_url;
      // Fallback to creative-level fields
      if (!imageUrl) imageUrl = creative.image_url || creative.thumbnail_url || "";

      // Extract texts
      const title = creative.title || storySpec.link_data?.name || "";
      const body = creative.body || storySpec.link_data?.message || storySpec.photo_data?.message || storySpec.video_data?.message || "";
      const description = storySpec.link_data?.description || "";
      const cta = creative.call_to_action_type || storySpec.link_data?.call_to_action?.type || "";

      return {
        adId: ad.id,
        adName: ad.name || "Sin nombre",
        status: ad.status || "UNKNOWN",
        creativeId: creative.id || "",
        thumbnailUrl: imageUrl,
        title,
        body,
        description,
        cta: cta.replace(/_/g, " "),
        spend: parseFloat(ins.spend || "0"),
        impressions: parseInt(ins.impressions || "0", 10),
        clicks: parseInt(ins.clicks || "0", 10),
        ctr: parseFloat(ins.ctr || "0"),
        cpc: parseFloat(ins.cpc || "0"),
        actions: ins.actions || [],
      };
    });

    // Sort by spend descending, filter out zero-spend if we have data
    const sorted = creatives
      .sort((a: any, b: any) => b.spend - a.spend);

    return NextResponse.json({ data: sorted });
  } catch (error: any) {
    console.error("Error fetching ad creatives:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

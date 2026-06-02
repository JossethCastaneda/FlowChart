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
    // Use effective_image_url for full-resolution images (thumbnail_url is always 64x64)
    const adsUrl = `https://graph.facebook.com/${version}/${adAccountId}/ads?fields=id,name,status,creative{id,name,effective_image_url,thumbnail_url,image_url,image_hash,title,body,call_to_action_type,object_story_spec}&limit=50`;
    const insightsUrl = `https://graph.facebook.com/${version}/${adAccountId}/insights?level=ad&fields=ad_id,ad_name,spend,impressions,clicks,actions,action_values,cpc,ctr&${timeParam}&limit=50`;

    const [adsRes, insightsRes] = await Promise.all([
      metaFetch(adsUrl, accessToken),
      metaFetch(insightsUrl, accessToken),
    ]);

    const adsJson = adsRes.ok ? await adsRes.json() : { data: [] };
    const insightsJson = insightsRes.ok ? await insightsRes.json() : { data: [] };

    // Build insights lookup by ad_id
    const insightsMap: Record<string, any> = {};
    (insightsJson.data || []).forEach((ins: any) => {
      insightsMap[ins.ad_id] = ins;
    });

    // Merge ads with their insights
    const creatives = (adsJson.data || []).map((ad: any) => {
      const creative = ad.creative || {};
      const ins = insightsMap[ad.id] || {};
      const storySpec = creative.object_story_spec || {};
      // Priority: effective_image_url (full-res) > story_spec images > image_url > thumbnail_url (64x64 last resort)
      let imageUrl = creative.effective_image_url || "";
      
      // Try object_story_spec for full-res images
      if (!imageUrl && storySpec.link_data?.image_url) {
        imageUrl = storySpec.link_data.image_url;
      }
      if (!imageUrl && storySpec.photo_data?.url) {
        imageUrl = storySpec.photo_data.url;
      }
      if (!imageUrl && storySpec.video_data?.image_url) {
        imageUrl = storySpec.video_data.image_url;
      }
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

import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const level = searchParams.get("level") || "campaign";
  const days = parseInt(searchParams.get("days") || "30", 10);

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const token = accessToken;
  const version = process.env.META_API_VERSION || "v22.0";

  // Build time range for last N days
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - days);
  const timeRange = JSON.stringify({
    since: since.toISOString().split("T")[0],
    until: now.toISOString().split("T")[0],
  });

  const insightsFields = "spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,action_values,purchase_roas";

  try {
    const url = `https://graph.facebook.com/${version}/${id}/insights?fields=${insightsFields}&time_range=${encodeURIComponent(timeRange)}&time_increment=1&limit=90`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.error?.message || "Failed to fetch daily insights" },
        { status: res.status }
      );
    }

    const json = await res.json();
    const data = json.data || [];

    // Parse into simplified daily records
    const daily = data.map((d: any) => ({
      date: d.date_start,
      spend: parseFloat(d.spend || "0"),
      impressions: parseInt(d.impressions || "0", 10),
      reach: parseInt(d.reach || "0", 10),
      clicks: parseInt(d.clicks || "0", 10),
      cpc: parseFloat(d.cpc || "0"),
      cpm: parseFloat(d.cpm || "0"),
      ctr: parseFloat(d.ctr || "0"),
      frequency: parseFloat(d.frequency || "0"),
      actions: d.actions || [],
      cost_per_action_type: d.cost_per_action_type || [],
      action_values: d.action_values || [],
      purchase_roas: d.purchase_roas || [],
    }));

    return NextResponse.json({ data: daily });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

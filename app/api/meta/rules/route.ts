import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";

const RULE_FIELDS = "name,status,evaluation_spec,execution_spec,schedule_spec,entity_type,filter_spec";

// GET — List all rules for an ad account
export async function GET(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const adAccountId = searchParams.get("adAccountId");
  if (!adAccountId) return NextResponse.json({ error: "Missing adAccountId" }, { status: 400 });

  const token = accessToken;
  const version = process.env.META_API_VERSION || "v22.0";

  try {
    // FIX: guard against double act_ prefix (act_act_XXXXX)
  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const url = `https://graph.facebook.com/${version}/${accountId}/adrules_library?fields=${RULE_FIELDS}&limit=100`;
    const res = await metaFetch(url, token);
    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: json.error?.message || "Error fetching rules" }, { status: res.status });
    }
    return NextResponse.json({ data: json.data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Create a new rule
export async function POST(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = accessToken;
  const version = process.env.META_API_VERSION || "v22.0";

  try {
    const body = await req.json();
    const { adAccountId, name, evaluation_spec, execution_spec, schedule_spec, entity_type, filter_spec } = body;

    if (!adAccountId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

  // FIX: guard against double act_ prefix (act_act_XXXXX)
  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const url = `https://graph.facebook.com/${version}/${accountId}/adrules_library`;
    const res = await metaFetch(url, token, {
      method: "POST",
      body: JSON.stringify({
        name,
        evaluation_spec: JSON.stringify(evaluation_spec),
        execution_spec: JSON.stringify(execution_spec),
        schedule_spec: schedule_spec ? JSON.stringify(schedule_spec) : undefined,
        entity_type: entity_type || "CAMPAIGN",
        filter_spec: filter_spec ? JSON.stringify(filter_spec) : undefined,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: json.error?.message || "Error creating rule" }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: json });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

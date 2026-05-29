import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";

const RULE_FIELDS = "name,status,evaluation_spec,execution_spec,schedule_spec,entity_type,filter_spec";

// GET — List all rules for an ad account
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const adAccountId = searchParams.get("adAccountId");
  if (!adAccountId) return NextResponse.json({ error: "Missing adAccountId" }, { status: 400 });

  const token = session.accessToken;
  const version = process.env.NEXT_PUBLIC_FB_API_VERSION || "v21.0";

  try {
    const url = `https://graph.facebook.com/${version}/act_${adAccountId}/adrules_library?access_token=${token}&fields=${RULE_FIELDS}&limit=100`;
    const res = await fetch(url);
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
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = session.accessToken;
  const version = process.env.NEXT_PUBLIC_FB_API_VERSION || "v21.0";

  try {
    const body = await req.json();
    const { adAccountId, name, evaluation_spec, execution_spec, schedule_spec, entity_type, filter_spec } = body;

    if (!adAccountId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const url = `https://graph.facebook.com/${version}/act_${adAccountId}/adrules_library?access_token=${token}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

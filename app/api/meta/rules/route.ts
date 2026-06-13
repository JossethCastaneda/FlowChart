import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch , META_API_VERSION } from "@/lib/server-auth";
import { validateBody } from "@/lib/validate";
import { RuleCreateSchema } from "@/lib/ads-schemas";

// Only real AdRule fields — entity_type/filter_spec are not readable fields
// and make the whole request fail with (#100) nonexisting field.
const RULE_FIELDS = "name,status,evaluation_spec,execution_spec,schedule_spec,created_time";

// GET — List all rules for an ad account
export async function GET(req: NextRequest) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const adAccountId = searchParams.get("adAccountId");
  if (!adAccountId) return NextResponse.json({ error: "Missing adAccountId" }, { status: 400 });

  const token = accessToken;
  const version = META_API_VERSION;

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
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = accessToken;
  const version = META_API_VERSION;

  try {
    // Crear una regla automática es una escritura con efectos sobre gasto
    // (puede pausar/activar/ajustar presupuesto): schema estricto + confirmación.
    const _validate = await validateBody(req, RuleCreateSchema);
    if (!_validate.ok) return _validate.response;
    const { adAccountId, name, evaluation_spec, execution_spec, schedule_spec, filter_spec } = _validate.data;

  // FIX: guard against double act_ prefix (act_act_XXXXX)
  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const url = `https://graph.facebook.com/${version}/${accountId}/adrules_library`;
    // Note: entity scoping goes INSIDE evaluation_spec.filters as
    // {field:"entity_type",...}; adrules_library has no top-level entity_type param.
    const res = await metaFetch(url, token, {
      method: "POST",
      body: JSON.stringify({
        name,
        evaluation_spec: JSON.stringify(evaluation_spec),
        execution_spec: JSON.stringify(execution_spec),
        schedule_spec: schedule_spec ? JSON.stringify(schedule_spec) : undefined,
        ...(filter_spec ? { filter_spec: JSON.stringify(filter_spec) } : {}),
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

import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch, META_API_VERSION } from "@/lib/server-auth";
import { validateBody } from "@/lib/validate";
import { RuleUpdateSchema } from "@/lib/ads-schemas";

// POST — Update a rule (status toggle, nombre, specs).
// Escritura con efectos sobre gasto → schema estricto + confirmed_by_user.
export async function POST(req: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ruleId } = await params;
  if (!/^\d+$/.test(ruleId)) {
    return NextResponse.json({ error: "ruleId inválido" }, { status: 400 });
  }

  try {
    const _validate = await validateBody(req, RuleUpdateSchema);
    if (!_validate.ok) return _validate.response;
    const { name, status, evaluation_spec, execution_spec, schedule_spec } = _validate.data;

    const payload: Record<string, unknown> = {};
    if (name !== undefined) payload.name = name;
    if (status !== undefined) payload.status = status;
    if (evaluation_spec !== undefined) payload.evaluation_spec = JSON.stringify(evaluation_spec);
    if (execution_spec !== undefined) payload.execution_spec = JSON.stringify(execution_spec);
    if (schedule_spec !== undefined) payload.schedule_spec = JSON.stringify(schedule_spec);

    // Versión SIEMPRE server-side (META_API_VERSION) — nunca NEXT_PUBLIC_*.
    const url = `https://graph.facebook.com/${META_API_VERSION}/${ruleId}`;
    const res = await metaFetch(url, accessToken, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: json.error?.message || "Error updating rule" }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: json });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Delete a rule. La confirmación viaja como query param
// (?confirmed_by_user=true) porque DELETE no lleva body.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ruleId } = await params;
  if (!/^\d+$/.test(ruleId)) {
    return NextResponse.json({ error: "ruleId inválido" }, { status: 400 });
  }

  if (req.nextUrl.searchParams.get("confirmed_by_user") !== "true") {
    return NextResponse.json({
      status: "blocked",
      blocked_reason: "Requiere confirmación explícita del usuario para eliminar la regla.",
    }, { status: 400 });
  }

  try {
    const url = `https://graph.facebook.com/${META_API_VERSION}/${ruleId}`;
    const res = await metaFetch(url, accessToken, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: json.error?.message || "Error deleting rule" }, { status: res.status });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

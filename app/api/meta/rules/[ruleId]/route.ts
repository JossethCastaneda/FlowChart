import { NextRequest, NextResponse } from "next/server";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { z } from "zod";
import { validateBody } from "@/lib/validate";

// POST — Update a rule
export async function POST(req: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ruleId } = await params;
  const token = accessToken;
  const version = process.env.NEXT_PUBLIC_FB_API_VERSION || "v25.0";

  try {
    const _validate = await validateBody(req, z.any());
          if (!_validate.ok) return _validate.response;
          const body = _validate.data;
    const url = `https://graph.facebook.com/${version}/${ruleId}`;
    const res = await metaFetch(url, token, {
      method: "POST",
      body: JSON.stringify(body),
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

// DELETE — Delete a rule
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
  const accessToken = await getMetaAccessToken(req, "ads");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ruleId } = await params;
  const token = accessToken;
  const version = process.env.NEXT_PUBLIC_FB_API_VERSION || "v25.0";

  try {
    const url = `https://graph.facebook.com/${version}/${ruleId}`;
    const res = await metaFetch(url, token, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: json.error?.message || "Error deleting rule" }, { status: res.status });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

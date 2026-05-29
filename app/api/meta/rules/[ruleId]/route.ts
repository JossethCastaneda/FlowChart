import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";

// POST — Update a rule
export async function POST(req: NextRequest, { params }: { params: Promise<{ ruleId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ruleId } = await params;
  const token = session.accessToken;
  const version = process.env.NEXT_PUBLIC_FB_API_VERSION || "v21.0";

  try {
    const body = await req.json();
    const url = `https://graph.facebook.com/${version}/${ruleId}?access_token=${token}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ruleId } = await params;
  const token = session.accessToken;
  const version = process.env.NEXT_PUBLIC_FB_API_VERSION || "v21.0";

  try {
    const url = `https://graph.facebook.com/${version}/${ruleId}?access_token=${token}`;
    const res = await fetch(url, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: json.error?.message || "Error deleting rule" }, { status: res.status });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getBotmakerToken, botmakerFetch } from "@/lib/botmaker";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

/**
 * GET /api/botmaker/channels — list the workspace's BotMaker channels.
 * Used to link a channel to the project's WhatsApp/Messenger/IG.
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const token = await getBotmakerToken(workspaceId);
  if (!token) return NextResponse.json({ connected: false, channels: [] });

  try {
    const res = await botmakerFetch("/channels", token);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ connected: false, error: err?.errors?.[0]?.message || `BotMaker ${res.status}`, channels: [] }, { status: 200 });
    }
    const data = await res.json();
    const items = (data.items || data || []).map((c: any) => ({
      id: c.id, name: c.name, platform: c.platform, active: c.active,
    }));
    return NextResponse.json({ connected: true, channels: items });
  } catch (e: any) {
    return NextResponse.json({ connected: false, error: e.message, channels: [] }, { status: 200 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import {
  getBotmakerToken,
  botmakerFetch,
  listSessions,
  computeMetricsByChannel,
  computeLeadQuality,
  computeBotQuality,
  EMPTY_CHANNEL_BREAKDOWN,
  EMPTY_LEAD_QUALITY,
  EMPTY_BOT_QUALITY,
} from "@/lib/botmaker";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

/**
 * GET /api/botmaker/analytics?from=&to=
 *
 * Conversational analytics broken down by the 4 product channels
 * (WhatsApp, Messenger, Instagram, Facebook) plus an aggregate ("all"),
 * computed from GET /sessions (include-messages + include-events).
 *
 * Sessions are fetched ONCE and grouped server-side by channel, so the client
 * can switch channel tabs with no extra requests.
 *
 * NOTE: /sessions with include-messages/events adds BI-data-source cost on the
 * BotMaker side, so we cap the window (default 30 days) and pages.
 */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const token = await getBotmakerToken(workspaceId);
  if (!token) {
    return NextResponse.json({
      connected: false,
      dataSource: "no_token",
      all: EMPTY_CHANNEL_BREAKDOWN.all,
      byChannel: EMPTY_CHANNEL_BREAKDOWN.byChannel,
      counts: EMPTY_CHANNEL_BREAKDOWN.counts,
      leadQuality: EMPTY_LEAD_QUALITY,
      botQuality: EMPTY_BOT_QUALITY,
      channels: [],
      botErrors: [],
    });
  }

  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to") || new Date().toISOString();
  const from =
    searchParams.get("from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1) Map channelId → platform so we can bucket each session by its channel.
    const channelPlatform = new Map<string, string>();
    let channels: { id: string; name: string; platform: string; active: boolean }[] = [];
    try {
      const chRes = await botmakerFetch("/channels", token);
      if (chRes.ok) {
        const chData = await chRes.json();
        const items = chData.items || chData || [];
        channels = items.map((c: any) => ({
          id: c.id,
          name: c.name,
          platform: c.platform,
          active: c.active,
        }));
        for (const c of items) {
          if (c?.id) channelPlatform.set(String(c.id), String(c.platform || ""));
        }
      }
    } catch (chErr) {
      // Channels are best-effort: without them, sessions fall into "all" only.
      console.warn("[BOTMAKER/ANALYTICS] channels fetch failed (continuing):", chErr);
    }

    // 2) Fetch sessions once, then group + compute metrics per channel + aggregate.
    const sessions = await listSessions(token, from, to);
    const breakdown = computeMetricsByChannel(sessions, channelPlatform);

    // 3) Quality scoring — derived from the same sessions, zero extra cost.
    const leadQuality = computeLeadQuality(sessions);
    const botQuality = computeBotQuality(sessions);

    return NextResponse.json({
      connected: true,
      dataSource: "sessions",
      range: { from, to },
      all: breakdown.all,
      byChannel: breakdown.byChannel,
      counts: breakdown.counts,
      leadQuality,
      botQuality,
      channels,
      botErrors: [],
    });
  } catch (err: any) {
    console.error("[BOTMAKER/ANALYTICS]", err);
    return NextResponse.json({
      connected: true,
      dataSource: "error",
      error: err?.message || "Error al consultar BotMaker",
      all: EMPTY_CHANNEL_BREAKDOWN.all,
      byChannel: EMPTY_CHANNEL_BREAKDOWN.byChannel,
      counts: EMPTY_CHANNEL_BREAKDOWN.counts,
      leadQuality: EMPTY_LEAD_QUALITY,
      botQuality: EMPTY_BOT_QUALITY,
      channels: [],
      botErrors: [],
    });
  }
}

export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getBotmakerToken, listSessions, computeResultsMetrics, EMPTY_RESULTS_METRICS } from "@/lib/botmaker";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

/**
 * GET /api/botmaker/analytics?channelId=&from=&to=
 * Conversational analytics for a project's BotMaker channel, computed from
 * GET /sessions (include-messages + include-events), filtered by channel.
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
    return NextResponse.json({ connected: false, dataSource: "no_token", metrics: EMPTY_RESULTS_METRICS, botErrors: [] });
  }

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId") || "";
  const toParam = searchParams.get("to");
  const fromParam = searchParams.get("from");
  const to = toParam || new Date().toISOString();
  const from = fromParam || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const sessions = await listSessions(token, from, to);
    const metrics = computeResultsMetrics(sessions, channelId || undefined);
    return NextResponse.json({
      connected: true,
      channelLinked: !!channelId,
      dataSource: "sessions",
      range: { from, to },
      totalSessionsAnalyzed: sessions.length,
      metrics,
      botErrors: [],
    });
  } catch (err: any) {
    console.error("[BOTMAKER/ANALYTICS]", err);
    return NextResponse.json({
      connected: true,
      dataSource: "error",
      error: err?.message || "Error al consultar BotMaker",
      metrics: EMPTY_RESULTS_METRICS,
      botErrors: [],
    });
  }
}

export const maxDuration = 30;

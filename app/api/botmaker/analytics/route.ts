import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getBotmakerToken, botmakerFetch, computeResultsMetrics, EMPTY_RESULTS_METRICS, type BmSession } from "@/lib/botmaker";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

/**
 * GET /api/botmaker/analytics?channelId=&from=&to=
 * Base conversational analytics for a project's BotMaker channel.
 *
 * The session metrics math is final (computeResultsMetrics over the SESSION→
 * MESSAGE model). The only thing pending is the exact "List Sessions v2"
 * endpoint, which lives in the account's Swagger export — until it's wired,
 * this returns the (empty) metric scaffold + a connection status, so the UI
 * always renders the base analytics.
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

  // Verify the connection works (channels has a documented, stable contract).
  let connected = false;
  try {
    const ch = await botmakerFetch("/channels", token);
    connected = ch.ok;
  } catch { connected = false; }

  // TODO(swagger): replace with the account's "List Sessions v2" endpoint, then:
  //   const sessions = await fetchSessions(token, channelId, from, to);
  //   return computeResultsMetrics(sessions);
  const sessions: BmSession[] = [];
  const metrics = computeResultsMetrics(sessions);

  return NextResponse.json({
    connected,
    channelLinked: !!channelId,
    dataSource: "pending_sessions_endpoint",
    note: "Sube el Swagger exportado de tu cuenta BotMaker para enchufar el endpoint de sesiones; el cálculo de métricas ya está listo.",
    metrics,
    botErrors: [],
  });
}

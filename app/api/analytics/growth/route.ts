import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";

/**
 * GET /api/analytics/growth
 *
 * Reconstructs a follower-growth time series for the connected accounts.
 *
 * Meta only exposes daily follower *deltas* for a limited window (~30 days),
 * so we take the current follower snapshot and walk backwards using the daily
 * adds/removes to rebuild a cumulative series, then bucket it weekly.
 *
 * Returns: { series: [{ period, followers, gained }], current, totalGained }
 * Always degrades to an empty series instead of erroring, so the tab never crashes.
 *
 * Query params: pageIds, platform (same semantics as the other analytics routes).
 */

interface GrowthPoint {
  period: string;    // short label, e.g. "12 ene"
  followers: number; // cumulative followers at the end of the bucket
  gained: number;    // net followers gained during the bucket
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Sum a daily insight metric into a date→value map. */
function accumulateDaily(
  target: Record<string, number>,
  data: any[],
  metricName: string,
  sign: 1 | -1
) {
  const metric = data.find((d: any) => d.name === metricName);
  if (!metric?.values) return;
  for (const v of metric.values) {
    const key = (v.end_time || "").slice(0, 10);
    if (!key) continue;
    target[key] = (target[key] || 0) + sign * (Number(v.value) || 0);
  }
}

export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  let token = await getMetaAccessToken(request, "analytics");
  if (!token) token = await getMetaAccessToken(request, "social");
  if (!token) token = await getMetaAccessToken(request, "publisher_facebook");
  if (!token) token = await getMetaAccessToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "No hay token Meta. Conecta tu cuenta en Integraciones." },
      { status: 401 }
    );
  }

  try {
    // 1. Pages (+ IG accounts)
    const pagesRes = await metaFetch(
      metaUrl("me/accounts", {
        fields: "id,name,access_token,instagram_business_account",
        limit: "100",
      }),
      token
    );
    if (!pagesRes.ok) {
      return NextResponse.json({ series: [], current: 0, totalGained: 0 });
    }
    const pagesJson = await pagesRes.json();
    let pages: any[] = pagesJson.data || [];

    const pageIdsParam = request.nextUrl.searchParams.get("pageIds");
    const platformParam = request.nextUrl.searchParams.get("platform");
    if (pageIdsParam) {
      const allowed = pageIdsParam.split(",").map((id) => id.trim());
      pages = pages.filter((p) => allowed.includes(p.id));
    }
    pages = pages.slice(0, 15);

    if (!pages.length) {
      return NextResponse.json({ series: [], current: 0, totalGained: 0 });
    }

    const since = Math.floor((Date.now() - 32 * DAY_MS) / 1000);
    const until = Math.floor(Date.now() / 1000);

    let currentFollowers = 0;
    const dailyDelta: Record<string, number> = {}; // dateKey → net change

    await Promise.allSettled(
      pages.map(async (page: any) => {
        const pageToken = page.access_token || token;
        const igId = page.instagram_business_account?.id;

        // ── Facebook: snapshot + daily net adds/removes ──
        if (platformParam !== "instagram") {
          const [snapRes, insRes] = await Promise.allSettled([
            metaFetch(metaUrl(`${page.id}`, { fields: "fan_count,followers_count" }), pageToken),
            metaFetch(
              metaUrl(`${page.id}/insights`, {
                metric: "page_fan_adds_unique,page_fan_removes_unique",
                period: "day",
                since: String(since),
                until: String(until),
              }),
              pageToken
            ),
          ]);
          if (snapRes.status === "fulfilled" && snapRes.value.ok) {
            const snap = await snapRes.value.json();
            currentFollowers += Number(snap.fan_count || snap.followers_count) || 0;
          }
          if (insRes.status === "fulfilled" && insRes.value.ok) {
            const ins = await insRes.value.json();
            const data = ins.data || [];
            accumulateDaily(dailyDelta, data, "page_fan_adds_unique", 1);
            accumulateDaily(dailyDelta, data, "page_fan_removes_unique", -1);
          }
        }

        // ── Instagram: snapshot + daily new followers ──
        if (igId && platformParam !== "facebook") {
          const [snapRes, insRes] = await Promise.allSettled([
            metaFetch(metaUrl(`${igId}`, { fields: "followers_count" }), token),
            metaFetch(
              metaUrl(`${igId}/insights`, {
                metric: "follower_count",
                period: "day",
                since: String(since),
                until: String(until),
              }),
              token
            ),
          ]);
          if (snapRes.status === "fulfilled" && snapRes.value.ok) {
            const snap = await snapRes.value.json();
            currentFollowers += Number(snap.followers_count) || 0;
          }
          if (insRes.status === "fulfilled" && insRes.value.ok) {
            const ins = await insRes.value.json();
            accumulateDaily(dailyDelta, ins.data || [], "follower_count", 1);
          }
        }
      })
    );

    // 2. No deltas available → at least surface the current snapshot as a flat point.
    const deltaKeys = Object.keys(dailyDelta).sort();
    if (deltaKeys.length === 0) {
      if (currentFollowers > 0) {
        return NextResponse.json({
          series: [{ period: "Hoy", followers: currentFollowers, gained: 0 }],
          current: currentFollowers,
          totalGained: 0,
        });
      }
      return NextResponse.json({ series: [], current: 0, totalGained: 0 });
    }

    // 3. Build daily cumulative series, walking backwards from the current total.
    //    followers(end of day d) = currentFollowers - sum(deltas strictly after d)
    let suffix = 0;
    const dailyCumulative: { date: string; followers: number; gained: number }[] = [];
    for (let i = deltaKeys.length - 1; i >= 0; i--) {
      const key = deltaKeys[i];
      const followersAtEnd = currentFollowers - suffix;
      dailyCumulative.unshift({ date: key, followers: followersAtEnd, gained: dailyDelta[key] });
      suffix += dailyDelta[key];
    }

    // 4. Bucket into weekly points (most recent ~6 weeks).
    const buckets: GrowthPoint[] = [];
    for (let i = 0; i < dailyCumulative.length; i += 7) {
      const week = dailyCumulative.slice(i, i + 7);
      const last = week[week.length - 1];
      const d = new Date(last.date);
      buckets.push({
        period: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
        followers: last.followers,
        gained: week.reduce((s, w) => s + w.gained, 0),
      });
    }
    const series = buckets.slice(-6);
    const totalGained = series.reduce((s, p) => s + p.gained, 0);

    return NextResponse.json({ series, current: currentFollowers, totalGained });
  } catch (error: any) {
    console.error("[GROWTH] Unhandled error:", error);
    // Degrade gracefully — never crash the tab.
    return NextResponse.json({ series: [], current: 0, totalGained: 0 });
  }
}

export const maxDuration = 30;

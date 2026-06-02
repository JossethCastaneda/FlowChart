import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Sum an array of insight data values */
function sumValues(values: { value: number }[]): number {
  return values.reduce((acc, v) => acc + (Number(v.value) || 0), 0);
}

/** Split insight values into two halves and return % change */
function trendPct(values: { value: number }[]): number {
  if (!values.length) return 0;
  const mid = Math.floor(values.length / 2);
  const recent = values.slice(mid);
  const previous = values.slice(0, mid);
  const sumRecent = sumValues(recent);
  const sumPrevious = sumValues(previous);
  if (sumPrevious === 0) return sumRecent > 0 ? 100 : 0;
  return Math.round(((sumRecent - sumPrevious) / sumPrevious) * 100);
}

/** Get the last value (for cumulative metrics like follower_count / page_fans) */
function lastValue(values: { value: number }[]): number {
  if (!values.length) return 0;
  return Number(values[values.length - 1].value) || 0;
}

/** Find a metric object from an array of insight entries */
function findMetric(data: any[], metricName: string): any | null {
  return data.find((d: any) => d.name === metricName) ?? null;
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Auth gate
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request);
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

  try {
    // Parse period / date range from query
    const periodDays = Number(request.nextUrl.searchParams.get("days") || "30");
    const now = new Date();
    const since = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const sinceStr = since.toISOString().split("T")[0];
    const untilStr = now.toISOString().split("T")[0];

    // 1. Get all pages
    const pagesUrl = metaUrl("me/accounts", {
      fields: "id,name,access_token,picture,instagram_business_account",
      limit: "100",
    });
    const pagesRes = await metaFetch(pagesUrl, token);
    if (!pagesRes.ok) {
      const err = await pagesRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.error?.message || "Failed to fetch pages" },
        { status: 500 }
      );
    }
    const pagesJson = await pagesRes.json();
    const pages: any[] = pagesJson.data || [];

    if (!pages.length) {
      return NextResponse.json({
        reach: 0, engagement: 0, followers: 0, impressions: 0,
        reachTrend: 0, engagementTrend: 0, followersTrend: 0, impressionsTrend: 0,
        pages: [],
      });
    }

    // Accumulators
    let totalReach = 0, totalEngagement = 0, totalFollowers = 0, totalImpressions = 0;
    let allReachValues: { value: number }[] = [];
    let allEngagementValues: { value: number }[] = [];
    let allFollowerValues: { value: number }[] = [];
    let allImpressionValues: { value: number }[] = [];
    const pageSummaries: any[] = [];

    // 2. For each page, fetch FB page insights + IG insights in parallel
    const pagePromises = pages.map(async (page: any) => {
      const pageToken = page.access_token || token;
      const igAccountId = page.instagram_business_account?.id;

      // ── Facebook Page Insights ───────────────────────────────────────
      const fbInsightsUrl = metaUrl(`${page.id}/insights`, {
        metric: "page_impressions,page_engaged_users,page_post_engagements,page_fans",
        period: "day",
        since: sinceStr,
        until: untilStr,
      });

      // ── Instagram Insights (if linked) ──────────────────────────────
      const igInsightsUrl = igAccountId
        ? metaUrl(`${igAccountId}/insights`, {
            metric: "impressions,reach,accounts_engaged,follower_count",
            period: "day",
            since: sinceStr,
            until: untilStr,
          })
        : null;

      const [fbResult, igResult] = await Promise.allSettled([
        metaFetch(fbInsightsUrl, pageToken).then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            console.error(`[ORGANIC] FB insights error for page ${page.id}:`, err?.error?.message);
            return null;
          }
          return r.json();
        }),
        igInsightsUrl
          ? metaFetch(igInsightsUrl, token).then(async (r) => {
              if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                console.error(`[ORGANIC] IG insights error for ${igAccountId}:`, err?.error?.message);
                return null;
              }
              return r.json();
            })
          : Promise.resolve(null),
      ]);

      const fbData = fbResult.status === "fulfilled" && fbResult.value?.data ? fbResult.value.data : [];
      const igData = igResult.status === "fulfilled" && igResult.value?.data ? igResult.value.data : [];

      // ── Aggregate FB metrics ─────────────────────────────────────────
      const fbImpressions = findMetric(fbData, "page_impressions");
      const fbEngaged = findMetric(fbData, "page_engaged_users");
      const fbEngagements = findMetric(fbData, "page_post_engagements");
      const fbFans = findMetric(fbData, "page_fans");

      const fbImpValues = fbImpressions?.values || [];
      const fbEngValues = fbEngaged?.values || fbEngagements?.values || [];
      const fbFanValues = fbFans?.values || [];

      // FB: reach ≈ impressions (page_impressions is the closest available)
      // Actual page_impressions_unique is not always available, so we use impressions
      const pageReach = sumValues(fbImpValues);
      const pageEngagement = sumValues(fbEngValues);
      const pageFans = lastValue(fbFanValues);
      const pageImpressions = sumValues(fbImpValues);

      // ── Aggregate IG metrics ─────────────────────────────────────────
      const igImpressions = findMetric(igData, "impressions");
      const igReach = findMetric(igData, "reach");
      const igEngaged = findMetric(igData, "accounts_engaged");
      const igFollowers = findMetric(igData, "follower_count");

      const igImpValues = igImpressions?.values || [];
      const igReachValues = igReach?.values || [];
      const igEngValues = igEngaged?.values || [];
      const igFollowerValues = igFollowers?.values || [];

      const igReachTotal = sumValues(igReachValues);
      const igEngTotal = sumValues(igEngValues);
      const igFollowerTotal = lastValue(igFollowerValues);
      const igImpTotal = sumValues(igImpValues);

      // ── Accumulate ───────────────────────────────────────────────────
      totalReach += pageReach + igReachTotal;
      totalEngagement += pageEngagement + igEngTotal;
      totalFollowers += pageFans + igFollowerTotal;
      totalImpressions += pageImpressions + igImpTotal;

      // Merge daily values for trend calculation
      allReachValues.push(...fbImpValues, ...igReachValues);
      allEngagementValues.push(...fbEngValues, ...igEngValues);
      allFollowerValues.push(...fbFanValues, ...igFollowerValues);
      allImpressionValues.push(...fbImpValues, ...igImpValues);

      return {
        pageId: page.id,
        pageName: page.name,
        igAccountId: igAccountId || null,
        fb: { reach: pageReach, engagement: pageEngagement, followers: pageFans, impressions: pageImpressions },
        ig: { reach: igReachTotal, engagement: igEngTotal, followers: igFollowerTotal, impressions: igImpTotal },
      };
    });

    const settled = await Promise.allSettled(pagePromises);
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value) {
        pageSummaries.push(r.value);
      }
    }

    // 3. Calculate trends (last N/2 days vs previous N/2 days)
    const reachTrend = trendPct(allReachValues);
    const engagementTrend = trendPct(allEngagementValues);
    const followersTrend = trendPct(allFollowerValues);
    const impressionsTrend = trendPct(allImpressionValues);

    return NextResponse.json({
      reach: totalReach,
      engagement: totalEngagement,
      followers: totalFollowers,
      impressions: totalImpressions,
      reachTrend,
      engagementTrend,
      followersTrend,
      impressionsTrend,
      pages: pageSummaries,
    });
  } catch (error: any) {
    console.error("[ORGANIC] Unhandled error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

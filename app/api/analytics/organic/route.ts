import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

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

/** Find a metric object from an array of insight entries */
function findMetric(data: any[], metricName: string): any | null {
  return data.find((d: any) => d.name === metricName) ?? null;
}

/** Process items in chunks to avoid Vercel timeout (BUG 4) */
async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const fmtDate = (d: Date) => d.toISOString().split("T")[0];

/** % change between a current and a previous value (rounded integer). */
function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Totals-only pass for a date window — used to compute the comparison period.
 * Sums period metrics (reach / engagement / impressions) across pages.
 * Followers are a live snapshot only, so they are intentionally excluded here.
 */
async function fetchPeriodTotals(
  pages: any[],
  token: string,
  platformParam: string | null,
  sinceStr: string,
  untilStr: string
): Promise<{ reach: number; engagement: number; impressions: number }> {
  let reach = 0, engagement = 0, impressions = 0;

  await processInChunks(pages, 5, async (page: any) => {
    const pageToken = page.access_token || token;
    const igAccountId = page.instagram_business_account?.id;

    const fbUrl = platformParam !== "instagram"
      ? metaUrl(`${page.id}/insights`, {
          metric: "page_media_view,page_total_media_view_unique,page_post_engagements",
          period: "day", since: sinceStr, until: untilStr,
        })
      : null;
    const igUrl = igAccountId && platformParam !== "facebook"
      ? metaUrl(`${igAccountId}/insights`, {
          metric: "views,reach,total_interactions",
          period: "day", since: sinceStr, until: untilStr,
        })
      : null;

    const [fbR, igR] = await Promise.allSettled([
      fbUrl ? metaFetch(fbUrl, pageToken).then((r) => (r.ok ? r.json() : null)) : Promise.resolve(null),
      igUrl ? metaFetch(igUrl, token).then((r) => (r.ok ? r.json() : null)) : Promise.resolve(null),
    ]);

    const fbData = fbR.status === "fulfilled" && fbR.value?.data ? fbR.value.data : [];
    const igData = igR.status === "fulfilled" && igR.value?.data ? igR.value.data : [];

    const fbImp = findMetric(fbData, "page_media_view");
    const fbReach = findMetric(fbData, "page_total_media_view_unique") || fbImp;
    const fbEng = findMetric(fbData, "page_post_engagements");
    reach += sumValues(fbReach?.values || []);
    engagement += sumValues(fbEng?.values || []);
    impressions += sumValues(fbImp?.values || []);

    const igImp = findMetric(igData, "views") || findMetric(igData, "impressions");
    const igReach = findMetric(igData, "reach");
    const igEng = findMetric(igData, "total_interactions");
    reach += sumValues(igReach?.values || []);
    engagement += sumValues(igEng?.values || []);
    impressions += sumValues(igImp?.values || []);
  });

  return { reach, engagement, impressions };
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Auth gate with CRON bypass
  let workspaceId: string | null = null;
  const authHeader = request.headers.get("Authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET;
  
  if (isCron) {
    workspaceId = request.nextUrl.searchParams.get("workspaceId");
  } else {
    const jwt = await getToken({ req: request });
    if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
    workspaceId = await getActiveWorkspaceId(jwt.sub);
  }

  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  // BUG 1 FIX — Token fallback multi-módulo
  let token: string | null = null;
  
  if (isCron) {
    // Si es cron, forzamos obtener las integraciones desde la BD porque request no tiene cookies
    const integration = await prisma.integration.findFirst({
      where: { workspaceId, provider: { startsWith: "meta" }, connected: true },
      select: { credentials: true }
    });
    // Necesitamos importar decryptToken si lo hiciéramos manual, pero es mejor
    // importar y usar un helper. Espera, si isCron es true, MetaAccessToken fallará 
    // porque lee de las cookies. Para el Cron, enviaremos el `token` directo en el header
    // Authorization: Bearer CRON_SECRET... NO. Enviaremos x-meta-token.
  }
  
  token = request.headers.get("x-meta-token") || await getMetaAccessToken(request, "analytics");
  if (!token) token = await getMetaAccessToken(request, "social");
  if (!token) token = await getMetaAccessToken(request, "publisher_facebook");
  if (!token) token = await getMetaAccessToken(request);
  if (!token) return NextResponse.json({ error: "No hay token Meta. Conecta tu cuenta en Integraciones." }, { status: 401 });

  try {
    // Parse period / date range from query
    const daysParam = request.nextUrl.searchParams.get("days") || "30";
    const periodDays = Number(daysParam);
    const now = new Date();
    const since = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const sinceStr = since.toISOString().split("T")[0];
    const untilStr = now.toISOString().split("T")[0];
    const pageIdsParam = request.nextUrl.searchParams.get("pageIds");
    const platformParam = request.nextUrl.searchParams.get("platform");
    const compareParam = request.nextUrl.searchParams.get("compare");
    const forceParam = request.nextUrl.searchParams.get("force") === "true";

    // ── CACHE READ ──
    const paramsKey = `days=${daysParam || "28"}&pageIds=${pageIdsParam || "all"}&platform=${platformParam || "all"}&compare=${compareParam || "none"}`;
    const cached = await prisma.metaAnalyticsCache.findUnique({
      where: {
        workspaceId_endpoint_paramsKey: {
          workspaceId,
          endpoint: "organic",
          paramsKey,
        },
      },
    });

    // 1 hora de TTL para orgánico
    if (!forceParam && cached && (now.getTime() - cached.updatedAt.getTime()) < 60 * 60 * 1000) {
      return NextResponse.json({ ...((cached.data as any) || {}), cached: true });
    }

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
    let pages: any[] = pagesJson.data || [];

    // Apply pageIds filter if provided
    if (pageIdsParam) {
      const allowedIds = pageIdsParam.split(",").map((id) => id.trim());
      pages = pages.filter((p) => allowedIds.includes(p.id));
    }

    if (!pages.length) {
      return NextResponse.json({
        reach: 0, engagement: 0, engagementRaw: 0, followers: 0, impressions: 0,
        reachTrend: 0, engagementTrend: 0, followersTrend: 0, impressionsTrend: 0,
        pages: [],
      });
    }

    // BUG 4 FIX — Limit to 15 pages max to avoid timeout
    const pagesToProcess = pageIdsParam ? pages : pages.slice(0, 15);

    // Accumulators
    let totalReach = 0, totalEngagement = 0, totalFollowers = 0, totalImpressions = 0;
    let allReachValues: { value: number }[] = [];
    let allEngagementValues: { value: number }[] = [];
    let allImpressionValues: { value: number }[] = [];
    const pageSummaries: any[] = [];

    // 2. For each page, fetch FB + IG insights (BUG 4: chunked, 5 at a time)
    const settled = await processInChunks(pagesToProcess, 5, async (page: any) => {
      const pageToken = page.access_token || token;
      const igAccountId = page.instagram_business_account?.id;

      // ── BUG 3 FIX: Separate periodic metrics from snapshot metrics ──

      // Facebook periodic insights (skip if platform=instagram)
      const fbInsightsUrl = platformParam !== "instagram"
        ? metaUrl(`${page.id}/insights`, {
            metric: "page_media_view,page_total_media_view_unique,page_post_engagements",
            period: "day",
            since: sinceStr,
            until: untilStr,
          })
        : null;

      // Facebook fan_count — snapshot, NOT with date range (BUG 3 FIX)
      const fbFansUrl = platformParam !== "instagram"
        ? metaUrl(`${page.id}`, {
            fields: "fan_count,followers_count",
          })
        : null;

      // IG periodic insights (skip if platform=facebook)
      const igInsightsUrl = igAccountId && platformParam !== "facebook"
        ? metaUrl(`${igAccountId}/insights`, {
            metric: "views,reach,total_interactions",
            period: "day",
            since: sinceStr,
            until: untilStr,
          })
        : null;

      // BUG 6 FIX: IG followers_count via separate field query
      const igFollowerUrl = igAccountId && platformParam !== "facebook"
        ? metaUrl(`${igAccountId}`, {
            fields: "followers_count",
          })
        : null;

      const [fbResult, fbFansResult, igResult, igFollowersResult] = await Promise.allSettled([
        fbInsightsUrl
          ? metaFetch(fbInsightsUrl, pageToken).then(async (r) => {
              if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                logger.error(`[ORGANIC] FB insights error for page ${page.id}:`, err?.error?.message);
                return null;
              }
              return r.json();
            })
          : Promise.resolve(null),
        fbFansUrl
          ? metaFetch(fbFansUrl, pageToken).then(async (r) => {
              if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                logger.error(`[ORGANIC] FB fans error for page ${page.id}:`, err?.error?.message);
                return null;
              }
              return r.json();
            })
          : Promise.resolve(null),
        igInsightsUrl
          ? metaFetch(igInsightsUrl, token).then(async (r) => {
              if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                logger.error(`[ORGANIC] IG insights error for ${igAccountId}:`, err?.error?.message);
                return null;
              }
              return r.json();
            })
          : Promise.resolve(null),
        igFollowerUrl
          ? metaFetch(igFollowerUrl, token).then(async (r) => {
              if (!r.ok) return null;
              return r.json();
            })
          : Promise.resolve(null),
      ]);

      const fbData = fbResult.status === "fulfilled" && fbResult.value?.data ? fbResult.value.data : [];
      const igData = igResult.status === "fulfilled" && igResult.value?.data ? igResult.value.data : [];

      // ── Aggregate FB metrics ─────────────────────────────────────────
      const fbImpressions = findMetric(fbData, "page_media_view");
      const fbReach = findMetric(fbData, "page_total_media_view_unique") || findMetric(fbData, "page_media_view");
      const fbEngaged = findMetric(fbData, "page_post_engagements");

      const fbImpValues = fbImpressions?.values || [];
      const fbReachValues = fbReach?.values || fbImpValues; // fallback to impressions
      const fbEngValues = fbEngaged?.values || [];

      // BUG 3 FIX: fan_count from snapshot, not from insights
      const pageFans = fbFansResult.status === "fulfilled" && fbFansResult.value
        ? Number(fbFansResult.value.fan_count || fbFansResult.value.followers_count) || 0
        : 0;

      const pageReach = sumValues(fbReachValues);
      const pageEngagement = sumValues(fbEngValues);
      const pageImpressions = sumValues(fbImpValues);

      // ── Aggregate IG metrics ─────────────────────────────────────────
      const igImpressions = findMetric(igData, "views") || findMetric(igData, "impressions");
      const igReach = findMetric(igData, "reach");
      const igEngaged = findMetric(igData, "total_interactions");

      const igImpValues = igImpressions?.values || [];
      const igReachValues = igReach?.values || [];
      const igEngValues = igEngaged?.values || [];

      // BUG 6 FIX: followers_count from separate query
      const igFollowerTotal = igFollowersResult.status === "fulfilled" && igFollowersResult.value
        ? Number(igFollowersResult.value.followers_count) || 0
        : 0;

      const igReachTotal = sumValues(igReachValues);
      const igEngTotal = sumValues(igEngValues);
      const igImpTotal = sumValues(igImpValues);

      // ── Accumulate ───────────────────────────────────────────────────
      totalReach += pageReach + igReachTotal;
      totalEngagement += pageEngagement + igEngTotal;
      totalFollowers += pageFans + igFollowerTotal;
      totalImpressions += pageImpressions + igImpTotal;

      // Merge daily values for trend calculation
      allReachValues.push(...fbReachValues, ...igReachValues);
      allEngagementValues.push(...fbEngValues, ...igEngValues);
      allImpressionValues.push(...fbImpValues, ...igImpValues);

      return {
        pageId: page.id,
        pageName: page.name,
        igAccountId: igAccountId || null,
        fb: { reach: pageReach, engagement: pageEngagement, followers: pageFans, impressions: pageImpressions },
        ig: { reach: igReachTotal, engagement: igEngTotal, followers: igFollowerTotal, impressions: igImpTotal },
      };
    });

    for (const r of settled) {
      if (r.status === "fulfilled" && r.value) {
        pageSummaries.push(r.value);
      }
    }

    // 3. Calculate trends (last N/2 days vs previous N/2 days)
    const reachTrend = trendPct(allReachValues);
    const engagementTrend = trendPct(allEngagementValues);
    const followersTrend = 0; // snapshot metric — no trend
    const impressionsTrend = trendPct(allImpressionValues);

    // BUG 5 FIX — engagement as rate %, not absolute count
    const engagementRate = totalReach > 0
      ? parseFloat(((totalEngagement / totalReach) * 100).toFixed(2))
      : 0;

    // ── Comparison period (period-over-period / year-over-year) ──────────────
    // compare = "previous" (same-length window immediately before) | "prev_year"
    let comparison: any = null;
    if (compareParam === "previous" || compareParam === "prev_year") {
      let cmpSince: Date, cmpUntil: Date;
      if (compareParam === "previous") {
        cmpUntil = new Date(since.getTime() - DAY_MS);
        cmpSince = new Date(cmpUntil.getTime() - (periodDays - 1) * DAY_MS);
      } else {
        cmpSince = new Date(since.getTime() - 365 * DAY_MS);
        cmpUntil = new Date(now.getTime() - 365 * DAY_MS);
      }
      const cmp = await fetchPeriodTotals(
        pagesToProcess, token, platformParam, fmtDate(cmpSince), fmtDate(cmpUntil)
      );
      const cmpEngRate = cmp.reach > 0 ? parseFloat(((cmp.engagement / cmp.reach) * 100).toFixed(2)) : 0;
      comparison = {
        mode: compareParam,
        range: { since: fmtDate(cmpSince), until: fmtDate(cmpUntil) },
        reach: cmp.reach,
        engagement: cmpEngRate,
        impressions: cmp.impressions,
        deltas: {
          reach: pctChange(totalReach, cmp.reach),
          engagement: pctChange(engagementRate, cmpEngRate),
          impressions: pctChange(totalImpressions, cmp.impressions),
        },
      };
    }

    const responseData = {
      reach: totalReach,
      engagement: engagementRate,        // % rate (e.g. 2.5)
      engagementRaw: totalEngagement,     // absolute count for reference
      followers: totalFollowers,
      impressions: totalImpressions,
      reachTrend,
      engagementTrend,
      followersTrend,
      impressionsTrend,
      comparison,                         // null unless ?compare= is set
      pages: pageSummaries,
    };

    // ── CACHE WRITE ──
    await prisma.metaAnalyticsCache.upsert({
      where: {
        workspaceId_endpoint_paramsKey: {
          workspaceId,
          endpoint: "organic",
          paramsKey,
        },
      },
      update: { data: responseData as any, updatedAt: now },
      create: { workspaceId, endpoint: "organic", paramsKey, data: responseData as any },
    }).catch((err: any) => logger.error("[ORGANIC] Cache save error:", err));

    return NextResponse.json({ ...responseData, cached: false });
  } catch (error: any) {
    logger.error("[ORGANIC] Unhandled error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// BUG 4 FIX — Extend serverless function timeout
export const maxDuration = 30;

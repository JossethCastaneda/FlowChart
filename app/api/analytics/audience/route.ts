import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ── Types ──────────────────────────────────────────────────────────────────

interface AgeRange { range: string; pct: number }
interface GenderEntry { label: string; pct: number }
interface LocationEntry { city: string; pct: number }

// ── Helpers ────────────────────────────────────────────────────────────────

/** Merge a Record<string, number> into an accumulator */
function mergeInto(acc: Record<string, number>, source: Record<string, number>) {
  for (const [key, val] of Object.entries(source)) {
    acc[key] = (acc[key] || 0) + (Number(val) || 0);
  }
}

/** Convert a keyed map to sorted [{key, pct}] array, descending by pct */
function toPctArray<T>(
  map: Record<string, number>,
  mapFn: (key: string, pct: number) => T
): T[] {
  const total = Object.values(map).reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  return Object.entries(map)
    .map(([key, val]) => mapFn(key, Math.round((val / total) * 1000) / 10))
    .sort((a: any, b: any) => (b.pct ?? 0) - (a.pct ?? 0));
}

/**
 * Parse Meta's gender_age keys like "M.25-34", "F.18-24"
 * into separate gender and age accumulators.
 */
function parseGenderAge(
  genderAgeMap: Record<string, number>,
  ageAcc: Record<string, number>,
  genderAcc: Record<string, number>
) {
  for (const [key, val] of Object.entries(genderAgeMap)) {
    const num = Number(val) || 0;
    const [genderCode, ageRange] = key.split(".");
    if (ageRange) {
      ageAcc[ageRange] = (ageAcc[ageRange] || 0) + num;
    }
    if (genderCode) {
      const label =
        genderCode === "M" ? "Male" :
        genderCode === "F" ? "Female" :
        genderCode === "U" ? "Unknown" :
        genderCode;
      genderAcc[label] = (genderAcc[label] || 0) + num;
    }
  }
}

/** Get the last value from an insight's values array (lifetime returns a single entry) */
function getInsightValue(data: any[], metricName: string): Record<string, number> {
  const found = data.find((d: any) => d.name === metricName);
  if (!found?.values?.length) return {};
  // lifetime metrics typically have a single value entry
  const val = found.values[found.values.length - 1].value;
  return typeof val === "object" && val !== null ? val : {};
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

  let token = request.headers.get("x-meta-token") || await getMetaAccessToken(request, "analytics");
  if (!token) token = await getMetaAccessToken(request, "social");
  if (!token) token = await getMetaAccessToken(request, "publisher_facebook");
  if (!token) token = await getMetaAccessToken(request);
  if (!token) return NextResponse.json({ error: "No hay token Meta. Conecta tu cuenta en Integraciones." }, { status: 401 });

  try {
    // 1. Get all pages
    const pagesUrl = metaUrl("me/accounts", {
      fields: "id,name,access_token,instagram_business_account",
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
    const pageIdsParam = request.nextUrl.searchParams.get("pageIds");
    const platformParam = request.nextUrl.searchParams.get("platform");
    const forceParam = request.nextUrl.searchParams.get("force") === "true";

    // ── CACHE READ ──
    const paramsKey = `pageIds=${pageIdsParam || "all"}&platform=${platformParam || "all"}`;
    const cached = await prisma.metaAnalyticsCache.findUnique({
      where: {
        workspaceId_endpoint_paramsKey: {
          workspaceId,
          endpoint: "audience",
          paramsKey,
        },
      },
    });

    // 24 horas de TTL para la audiencia (cambia lentamente)
    const now = new Date();
    if (!forceParam && cached && (now.getTime() - cached.updatedAt.getTime()) < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ ...((cached.data as any) || {}), cached: true });
    }

    if (pageIdsParam) {
      const allowedIds = pageIdsParam.split(",").map((id) => id.trim());
      pages = pages.filter((p) => allowedIds.includes(p.id));
    }

    if (!pages.length) {
      return NextResponse.json({ age: [], gender: [], location: [] });
    }

    // Accumulators
    const cityAcc: Record<string, number> = {};
    const countryAcc: Record<string, number> = {};
    const ageAcc: Record<string, number> = {};
    const genderAcc: Record<string, number> = {};

    // 2. Fetch demographics from each page + IG in parallel
    const pagePromises = pages.map(async (page: any) => {
      const pageToken = page.access_token || token;
      const igAccountId = page.instagram_business_account?.id;

      // ── FB Page demographics (skip if platform=instagram) ──────────
      const fbUrl = platformParam !== "instagram"
        ? metaUrl(`${page.id}/insights`, {
            metric: "page_follows_city,page_follows_gender_age,page_follows_country",
            period: "lifetime",
          })
        : null;

      // ── IG demographics now uses follower_demographics with breakdown params ──
      // We need 3 separate calls for city, age+gender, and country
      const igCityUrl = igAccountId && platformParam !== "facebook"
        ? metaUrl(`${igAccountId}/insights`, {
            metric: "follower_demographics",
            period: "lifetime",
            metric_type: "total_value",
            breakdown: "city",
          })
        : null;
      const igGenderAgeUrl = igAccountId && platformParam !== "facebook"
        ? metaUrl(`${igAccountId}/insights`, {
            metric: "follower_demographics",
            period: "lifetime",
            metric_type: "total_value",
            breakdown: "age,gender",
          })
        : null;
      const igCountryUrl = igAccountId && platformParam !== "facebook"
        ? metaUrl(`${igAccountId}/insights`, {
            metric: "follower_demographics",
            period: "lifetime",
            metric_type: "total_value",
            breakdown: "country",
          })
        : null;

      const [fbResult, igCityResult, igGenderAgeResult, igCountryResult] = await Promise.allSettled([
        fbUrl
          ? metaFetch(fbUrl, pageToken).then(async (r) => {
              if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                logger.error(`[AUDIENCE] FB demographics error for page ${page.id}:`, err?.error?.message);
                return null;
              }
              return r.json();
            })
          : Promise.resolve(null),
        igCityUrl
          ? metaFetch(igCityUrl, token).then(async (r) => {
              if (!r.ok) { logger.error(`[AUDIENCE] IG city error`); return null; }
              return r.json();
            })
          : Promise.resolve(null),
        igGenderAgeUrl
          ? metaFetch(igGenderAgeUrl, token).then(async (r) => {
              if (!r.ok) { logger.error(`[AUDIENCE] IG gender_age error`); return null; }
              return r.json();
            })
          : Promise.resolve(null),
        igCountryUrl
          ? metaFetch(igCountryUrl, token).then(async (r) => {
              if (!r.ok) { logger.error(`[AUDIENCE] IG country error`); return null; }
              return r.json();
            })
          : Promise.resolve(null),
      ]);

      // ── Process Facebook data ────────────────────────────────────────
      if (fbResult.status === "fulfilled" && fbResult.value?.data) {
        const fbData = fbResult.value.data;
        mergeInto(cityAcc, getInsightValue(fbData, "page_follows_city"));
        mergeInto(countryAcc, getInsightValue(fbData, "page_follows_country"));
        parseGenderAge(getInsightValue(fbData, "page_follows_gender_age"), ageAcc, genderAcc);
      }

      // Process IG city data
      if (igCityResult.status === "fulfilled" && igCityResult.value?.data) {
        const cityData = igCityResult.value.data;
        mergeInto(cityAcc, getInsightValue(cityData, "follower_demographics"));
      }
      // Process IG gender+age data
      if (igGenderAgeResult.status === "fulfilled" && igGenderAgeResult.value?.data) {
        const gaData = igGenderAgeResult.value.data;
        parseGenderAge(getInsightValue(gaData, "follower_demographics"), ageAcc, genderAcc);
      }
      // Process IG country data
      if (igCountryResult.status === "fulfilled" && igCountryResult.value?.data) {
        const countryData = igCountryResult.value.data;
        mergeInto(countryAcc, getInsightValue(countryData, "follower_demographics"));
      }
    });

    await Promise.allSettled(pagePromises);

    // 3. Convert to percentage arrays
    const age: AgeRange[] = toPctArray(ageAcc, (range, pct) => ({ range, pct }));
    const gender: GenderEntry[] = toPctArray(genderAcc, (label, pct) => ({ label, pct }));
    const location: LocationEntry[] = toPctArray(cityAcc, (city, pct) => ({ city, pct }))
      .slice(0, 20); // Top 20 cities

    const responseData = { age, gender, location };

    // ── CACHE WRITE ──
    await prisma.metaAnalyticsCache.upsert({
      where: {
        workspaceId_endpoint_paramsKey: {
          workspaceId,
          endpoint: "audience",
          paramsKey,
        },
      },
      update: { data: responseData as any, updatedAt: now },
      create: { workspaceId, endpoint: "audience", paramsKey, data: responseData as any },
    }).catch((err: any) => logger.error("[AUDIENCE] Cache save error:", err));

    return NextResponse.json({ ...responseData, cached: false });
  } catch (error: any) {
    logger.error("[AUDIENCE] Unhandled error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export const maxDuration = 30;

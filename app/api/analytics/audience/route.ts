import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";

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
  // Auth gate
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return NextResponse.json({ error: "No auth" }, { status: 401 });
  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const token = await getMetaAccessToken(request);
  if (!token) return NextResponse.json({ error: "No Meta token" }, { status: 401 });

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
    const pages: any[] = pagesJson.data || [];

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

      // ── FB Page demographics (lifetime) ──────────────────────────────
      const fbUrl = metaUrl(`${page.id}/insights`, {
        metric: "page_fans_city,page_fans_gender_age,page_fans_country",
        period: "lifetime",
      });

      // ── IG demographics (lifetime) ──────────────────────────────────
      // Note: IG audience_* metrics require >= 100 followers
      const igUrl = igAccountId
        ? metaUrl(`${igAccountId}/insights`, {
            metric: "audience_city,audience_gender_age,audience_country",
            period: "lifetime",
          })
        : null;

      const [fbResult, igResult] = await Promise.allSettled([
        metaFetch(fbUrl, pageToken).then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            console.error(`[AUDIENCE] FB demographics error for page ${page.id}:`, err?.error?.message);
            return null;
          }
          return r.json();
        }),
        igUrl
          ? metaFetch(igUrl, token).then(async (r) => {
              if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                console.error(`[AUDIENCE] IG demographics error for ${igAccountId}:`, err?.error?.message);
                return null;
              }
              return r.json();
            })
          : Promise.resolve(null),
      ]);

      // ── Process Facebook data ────────────────────────────────────────
      if (fbResult.status === "fulfilled" && fbResult.value?.data) {
        const fbData = fbResult.value.data;
        mergeInto(cityAcc, getInsightValue(fbData, "page_fans_city"));
        mergeInto(countryAcc, getInsightValue(fbData, "page_fans_country"));
        parseGenderAge(getInsightValue(fbData, "page_fans_gender_age"), ageAcc, genderAcc);
      }

      // ── Process Instagram data ───────────────────────────────────────
      if (igResult.status === "fulfilled" && igResult.value?.data) {
        const igData = igResult.value.data;
        mergeInto(cityAcc, getInsightValue(igData, "audience_city"));
        mergeInto(countryAcc, getInsightValue(igData, "audience_country"));
        parseGenderAge(getInsightValue(igData, "audience_gender_age"), ageAcc, genderAcc);
      }
    });

    await Promise.allSettled(pagePromises);

    // 3. Convert to percentage arrays
    const age: AgeRange[] = toPctArray(ageAcc, (range, pct) => ({ range, pct }));
    const gender: GenderEntry[] = toPctArray(genderAcc, (label, pct) => ({ label, pct }));
    const location: LocationEntry[] = toPctArray(cityAcc, (city, pct) => ({ city, pct }))
      .slice(0, 20); // Top 20 cities

    return NextResponse.json({ age, gender, location });
  } catch (error: any) {
    console.error("[AUDIENCE] Unhandled error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

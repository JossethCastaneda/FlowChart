import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";
import prisma from "@/lib/prisma";

const META_V = process.env.META_API_VERSION || "v25.0";

// Monday-first day labels — MUST match the frontend heatmap (DAYS) order,
// where index 0 = Monday. Meta timestamps use Sunday=0, so we re-map below.
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface TimeSlot {
  day: number;      // 0 (Monday) – 6 (Sunday) — Monday-first to match the UI
  hour: number;     // 0 – 23
  avgImpressions: number;
  postCount: number;
}

/**
 * GET /api/analytics/best-time
 *
 * Returns the top 5 best time slots to publish on Instagram,
 * based on average impressions per dayOfWeek × hour.
 *
 * Uses BestTimeCache — if generatedAt < 24h ago, returns cached data.
 * Otherwise fetches the last 90 days of IG posts with impressions.
 */
export async function GET(req: NextRequest) {
  try {
    // ── Auth checks ──
    const jwt = await getToken({ req });
    if (!jwt?.sub) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(jwt.sub);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    let token = await getMetaAccessToken(req, "analytics");
    if (!token) token = await getMetaAccessToken(req, "social");
    if (!token) token = await getMetaAccessToken(req, "publisher_facebook");
    if (!token) token = await getMetaAccessToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "No hay token Meta. Ve a Integraciones y conecta tu cuenta." },
        { status: 401 }
      );
    }

    // ── Check BestTimeCache ──
    const cached = await prisma.bestTimeCache.findUnique({
      where: { workspaceId },
    });

    if (cached) {
      const ageMs = Date.now() - new Date(cached.generatedAt).getTime();
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;

      if (ageMs < twentyFourHoursMs) {
        const cd = cached.data as any;
        return NextResponse.json({
          slots: cd.slots || [],
          topSlots: cd.topSlots || [],
          cached: true,
          generatedAt: cached.generatedAt,
        });
      }
    }

    // ── Resolve igUserId from Integration credentials ──
    const integration = await prisma.integration.findFirst({
      where: {
        workspaceId,
        provider: { in: ["meta_analytics", "meta_publisher_instagram", "meta"] },
        connected: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    let igUserId = (integration?.credentials as any)?.igUserId || null;

    // Fallback: auto-detect IG account from connected Facebook Pages
    if (!igUserId) {
      try {
        const pagesUrl = `https://graph.facebook.com/${META_V}/me/accounts?fields=instagram_business_account&limit=100`;
        const pagesRes = await metaFetch(pagesUrl, token);
        if (pagesRes.ok) {
          const pagesData = await pagesRes.json();
          const pages = pagesData.data || [];
          // Use the first page that has an IG business account
          for (const page of pages) {
            if (page.instagram_business_account?.id) {
              igUserId = page.instagram_business_account.id;
              break;
            }
          }
        }
      } catch {
        // ignore — will fall through to error below
      }
    }

    if (!igUserId) {
      return NextResponse.json(
        { error: "No se encontró cuenta de Instagram conectada. Conecta tu cuenta en Integraciones." },
        { status: 400 }
      );
    }

    // ── Fetch last 90 days of IG media with impressions ──
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const sinceTs = Math.floor(ninetyDaysAgo.getTime() / 1000);

    let allMedia: any[] = [];
    let nextUrl: string | null =
      `https://graph.facebook.com/${META_V}/${igUserId}/media?fields=id,timestamp,insights.metric(views){values}&limit=100&since=${sinceTs}`;

    while (nextUrl && allMedia.length < 500) {
      const mediaRes = await metaFetch(nextUrl, token);
      const mediaData = await mediaRes.json();

      if (!mediaRes.ok || mediaData.error) {
        const mapped = mapMetaError(mediaData?.error);
        console.error("[BEST-TIME] Meta API error:", mediaData?.error?.message);
        return NextResponse.json(
          { error: mapped.user_message },
          { status: 422 }
        );
      }

      if (mediaData.data) {
        allMedia = [...allMedia, ...mediaData.data];
      }

      // Strip access_token from paging.next — metaFetch adds Bearer
      const rawNext = mediaData.paging?.next || null;
      if (rawNext) {
        try {
          const u = new URL(rawNext);
          u.searchParams.delete("access_token");
          nextUrl = u.toString();
        } catch {
          nextUrl = null;
        }
      } else {
        nextUrl = null;
      }
    }

    // ── Group by dayOfWeek × hour and calculate averages ──
    // Grid: 7 days × 24 hours = 168 slots
    const grid: { totalImpressions: number; count: number }[] = new Array(168)
      .fill(null)
      .map(() => ({ totalImpressions: 0, count: 0 }));

    for (const media of allMedia) {
      if (!media.timestamp) continue;
      const ts = new Date(media.timestamp);
      // Re-map Meta's Sunday=0 to Monday-first (Mon=0 … Sun=6) to match the UI grid.
      const day = (ts.getUTCDay() + 6) % 7;
      const hour = ts.getUTCHours();
      const slotIndex = day * 24 + hour;

      // Extract impressions from insights
      const impressions =
        media.insights?.data?.find((d: any) => d.name === "views")?.values?.[0]?.value ??
        media.insights?.data?.[0]?.values?.[0]?.value ?? 0;

      grid[slotIndex].totalImpressions += Number(impressions) || 0;
      grid[slotIndex].count += 1;
    }

    // Build ranked slots (only include those with at least 1 post)
    const rankedSlots: TimeSlot[] = grid
      .map((slot, index) => ({
        day: Math.floor(index / 24),
        hour: index % 24,
        avgImpressions: slot.count > 0 ? Math.round(slot.totalImpressions / slot.count) : 0,
        postCount: slot.count,
      }))
      .filter((s) => s.postCount > 0)
      .sort((a, b) => b.avgImpressions - a.avgImpressions);

    // Full grid (all slots with posts) — used to paint the heatmap.
    const slots = rankedSlots.map(({ day, hour, avgImpressions }) => ({
      day,
      hour,
      avgImpressions,
    }));

    // Top 5 with a human-readable label — used for the "Mejores Momentos" cards.
    const topSlots = rankedSlots.slice(0, 5).map((s) => ({
      day: s.day,
      hour: s.hour,
      avgImpressions: s.avgImpressions,
      label: `${DAY_LABELS[s.day]} ${String(s.hour).padStart(2, "0")}:00`,
    }));

    // ── Save to BestTimeCache ──
    const now = new Date();
    await prisma.bestTimeCache.upsert({
      where: { workspaceId },
      update: {
        data: { slots, topSlots } as unknown as any,
        generatedAt: now,
      },
      create: {
        workspaceId,
        data: { slots, topSlots } as unknown as any,
        generatedAt: now,
      },
    });

    return NextResponse.json({
      slots,
      topSlots,
      cached: false,
      generatedAt: now,
      totalPostsAnalyzed: allMedia.length,
    });
  } catch (err: any) {
    console.error("[BEST-TIME] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}

export const maxDuration = 30;

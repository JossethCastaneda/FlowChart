"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { AnalyticsFilters, type Platform } from "./AnalyticsFilters";
import { ComparisonControl, compareLabel, type ComparisonState, type CompareMode } from "./ComparisonControl";

import {
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  Users,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  MessageCircle,
  Share2,
  Grid3X3,
  List,
  ChevronUp,
  ChevronDown,
  Camera,
  ThumbsUp,
  Clock,
  UserPlus,
  Activity,
  Info,
  Play,
  Bookmark,
  Film,
  Star,
  Loader2,
  Check,
} from "lucide-react";
import { seededRand, generateHeatmap, ChannelIcons, TABS, Tab, Kpi, EMPTY_KPI, AUDIENCE_DEVICE, DAYS, HOURS } from "./shared";
import { TabResumen, TabPosts, TabAudiencia, TabMejorHorario, TabHistorias, TabReels, TabCrecimiento } from "./AnalyticsTabs";

// Channel icon lookup (lucide-react has no brand icons)
/* Empty defaults — real data loaded from API */
/* These are rendered directly — empty arrays = empty charts */
// Deterministic pseudo-random based on seed (no hydration mismatch)
// Generate realistic heatmap: higher on weekdays 10-14 and 19-21
/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */

export function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("Resumen");
  const [kpis, setKpis] = useState<Kpi[]>(EMPTY_KPI);
  const [posts, setPosts] = useState<any[]>([]);
  const [audienceAge, setAudienceAge] = useState<any[]>([]);
  const [audienceGender, setAudienceGender] = useState<any[]>([]);
  const [audienceLocation, setAudienceLocation] = useState<any[]>([]);
  const [dataNotices, setDataNotices] = useState<string[]>([]);

  // ── Filter state ──
  const [filterPlatform, setFilterPlatform] = useState<Platform>("all");
  const [filterAccountIds, setFilterAccountIds] = useState<string[]>([]);

  // ── Period + comparison state ──
  const [period, setPeriod] = useState(28);
  const [compareMode, setCompareMode] = useState<CompareMode>("none");

  const handleFilterChange = useCallback((platform: Platform, selectedIds: string[]) => {
    setFilterPlatform(platform);
    setFilterAccountIds(selectedIds);
  }, []);

  const handleComparisonChange = useCallback((s: ComparisonState) => {
    setPeriod(s.days);
    setCompareMode(s.compare);
  }, []);

  const addDataNotice = useCallback((message: string) => {
    setDataNotices((prev) => (prev.includes(message) ? prev : [...prev, message]));
  }, []);

  // Extract raw page IDs from filter keys (fb_123 → 123, ig_456 → 456)
  const filterPageIds = useMemo(() => {
    return filterAccountIds.map((id) => id.replace(/^(fb_|ig_)/, ""));
  }, [filterAccountIds]);

  // Fetch real organic KPIs
  useEffect(() => {
    // Skip initial render before filters load
    if (filterAccountIds.length === 0) return;

    const fetchData = async () => {
      setDataNotices([]);
      // Build page ID query string for server-side filtering
      const pageIdParam = filterPageIds.length > 0 ? `&pageIds=${filterPageIds.join(",")}` : "";
      const platformParam = filterPlatform !== "all" ? `&platform=${filterPlatform}` : "";

      try {
        // Fetch KPIs (with optional comparison window)
        const compareParam = compareMode !== "none" ? `&compare=${compareMode}` : "";
        const kpiRes = await fetch(`/api/analytics/organic?days=${period}${pageIdParam}${platformParam}${compareParam}`);
        if (kpiRes.ok) {
          const kpiData = await kpiRes.json();
          if (kpiData && !kpiData.error) {
            const cmp = kpiData.comparison; // null unless comparison requested
            const lbl = cmp ? compareLabel(cmp.mode) : "";
            // When a comparison window is active, use the real period-over-period
            // delta; otherwise fall back to the in-period trend.
            const fmtChange = (delta: number) => `${delta > 0 ? "+" : ""}${delta}%`;
            const fmtTrend = (t: number) => `${t > 0 ? "+" : ""}${(t || 0).toFixed(1)}%`;

            setKpis([
              {
                label: "Alcance",
                value: (kpiData.reach || 0).toLocaleString(),
                change: cmp ? fmtChange(cmp.deltas.reach) : fmtTrend(kpiData.reachTrend),
                positive: cmp ? cmp.deltas.reach >= 0 : (kpiData.reachTrend || 0) >= 0,
                icon: Eye, color: "#00d4ff", accent: "cyan",
                compareValue: cmp ? `${lbl}: ${(cmp.reach || 0).toLocaleString()}` : undefined,
              },
              {
                label: "Engagement",
                value: `${(kpiData.engagement || 0).toFixed(1)}%`,
                change: cmp ? fmtChange(cmp.deltas.engagement) : fmtTrend(kpiData.engagementTrend),
                positive: cmp ? cmp.deltas.engagement >= 0 : (kpiData.engagementTrend || 0) >= 0,
                icon: Heart, color: "#f472b6", accent: "pink",
                compareValue: cmp ? `${lbl}: ${(cmp.engagement || 0).toFixed(1)}%` : undefined,
              },
              {
                label: "Seguidores",
                value: (kpiData.followers || 0).toLocaleString(),
                change: fmtTrend(kpiData.followersTrend),
                positive: (kpiData.followersTrend || 0) >= 0,
                icon: Users, color: "#06d6a0", accent: "emerald",
                // Followers is a live snapshot — Meta doesn't expose a historical
                // total, so there is no period-over-period comparison for it.
              },
              {
                label: "Impresiones",
                value: (kpiData.impressions || 0).toLocaleString(),
                change: cmp ? fmtChange(cmp.deltas.impressions) : fmtTrend(kpiData.impressionsTrend),
                positive: cmp ? cmp.deltas.impressions >= 0 : (kpiData.impressionsTrend || 0) >= 0,
                icon: BarChart2, color: "#7b61ff", accent: "purple",
                compareValue: cmp ? `${lbl}: ${(cmp.impressions || 0).toLocaleString()}` : undefined,
              },
            ]);
          }
        }
      } catch {
        addDataNotice("No se pudieron actualizar KPIs organicos. El resto del reporte puede estar parcial.");
      }

      try {
        // Fetch posts
        const postRes = await fetch(`/api/analytics/posts?limit=25${pageIdParam}${platformParam}`);
        if (postRes.ok) {
          const postData = await postRes.json();
          if (postData.posts?.length) {
            setPosts(postData.posts.map((p: any, i: number) => ({
              id: p.id || i + 1,
              text: p.text || "",
              // Route returns lowercase ("facebook"/"instagram"); normalize to the
              // capitalized form the icons and platform filter expect.
              channel: p.channel === "instagram" ? "Instagram" : "Facebook",
              date: p.date ? new Date(p.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "",
              image: p.image || null,
              mediaType: p.mediaType || "text",
              permalink: p.permalink || null,
              reach: p.reach || 0,
              likes: p.likes || 0,
              comments: p.comments || 0,
              shares: p.shares || 0,
              engagement: p.engagementRate || 0,
            })));
          }
        }
      } catch {
        addDataNotice("No se pudieron cargar posts recientes desde Meta.");
      }

      try {
        // Fetch audience
        const audParams: string[] = [];
        if (filterPageIds.length > 0) audParams.push(`pageIds=${filterPageIds.join(",")}`);
        if (filterPlatform !== "all") audParams.push(`platform=${filterPlatform}`);
        const audQueryStr = audParams.length > 0 ? `?${audParams.join("&")}` : "";
        const audRes = await fetch(`/api/analytics/audience${audQueryStr}`);
        if (audRes.ok) {
          const audData = await audRes.json();
          if (audData.age?.length) setAudienceAge(audData.age);
          if (audData.gender?.length) {
            const colors = ["#f472b6", "#00d4ff", "#7b61ff"];
            setAudienceGender(audData.gender.map((g: any, i: number) => ({ ...g, color: colors[i] || "#94a3b8" })));
          }
          if (audData.location?.length) setAudienceLocation(audData.location);
        }
      } catch {
        addDataNotice("No se pudieron cargar datos de audiencia. Revisa permisos de insights.");
      }
    };
    fetchData();
  }, [filterPlatform, filterAccountIds, filterPageIds, period, compareMode, addDataNotice]);

  // Filter posts by selected platform
  const filteredPosts = useMemo(() => {
    if (filterPlatform === "all") return posts;
    const platformMap: Record<string, string> = { facebook: "Facebook", instagram: "Instagram" };
    const target = platformMap[filterPlatform] || "";
    return posts.filter((p) => p.channel === target);
  }, [posts, filterPlatform]);

  // Build query string for sub-tabs
  const filterQuery = useMemo(() => {
    const params: string[] = [];
    if (filterPageIds.length > 0) params.push(`pageIds=${filterPageIds.join(",")}`);
    if (filterPlatform !== "all") params.push(`platform=${filterPlatform}`);
    return params.length > 0 ? `?${params.join("&")}` : "";
  }, [filterPageIds, filterPlatform]);

  return (
    <div className="space-y-4">

      {/* ─── FILTERS BAR ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
        <AnalyticsFilters onFilterChange={handleFilterChange} />
        <ComparisonControl onChange={handleComparisonChange} />
      </div>

      {dataNotices.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid rgba(251,191,36,0.24)",
            background: "rgba(251,191,36,0.08)",
            color: "#fbbf24",
            fontSize: 12,
          }}
        >
          <Info style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong style={{ color: "#fde68a" }}>Datos parciales</strong>
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
              {dataNotices.map((notice) => (
                <span key={notice}>{notice}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 glass-panel p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
              activeTab === tab
                ? "bg-white/10 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
            style={activeTab === tab ? { boxShadow: "0 0 12px rgba(244,114,182,0.15)" } : {}}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ animation: "page-fade-in 0.3s ease-out forwards" }}>
        {activeTab === "Resumen" && <TabResumen kpis={kpis} posts={filteredPosts} />}
        {activeTab === "Posts" && <TabPosts posts={filteredPosts} />}
        {activeTab === "Audiencia" && <TabAudiencia age={audienceAge} gender={audienceGender} location={audienceLocation} />}
        {activeTab === "Historias" && <TabHistorias filterQuery={filterQuery} />}
        {activeTab === "Reels" && <TabReels filterQuery={filterQuery} />}
        {activeTab === "Mejor Horario" && <TabMejorHorario filterQuery={filterQuery} />}
        {activeTab === "Crecimiento" && <TabCrecimiento filterQuery={filterQuery} />}
      </div>
    </div>
  );
}



/* ══════════════════════════════════════════════════════════
   TAB: RESUMEN
   ══════════════════════════════════════════════════════════ */
/* ── KPI Card ─────────────────────────────────────────── */
/* ── Top Post Card ────────────────────────────────────── */
/* ── Post media (adapted to the publication format) ─────── */
/* ══════════════════════════════════════════════════════════
   TAB: POSTS
   ══════════════════════════════════════════════════════════ */
// Configurable columns for the Posts table. `always` columns can't be hidden.
// Extend this array to add a column — no other change needed.
/* ══════════════════════════════════════════════════════════
   TAB: AUDIENCIA
   ══════════════════════════════════════════════════════════ */
/* ── SVG Donut Chart ──────────────────────────────────── */
/* ══════════════════════════════════════════════════════════
   TAB: MEJOR HORARIO
   ══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   TAB: HISTORIAS
   ══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   TAB: REELS
   ══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   TAB: CRECIMIENTO
   ══════════════════════════════════════════════════════════ */

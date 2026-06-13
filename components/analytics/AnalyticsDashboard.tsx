"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Download,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { generateHeatmap, ChannelIcons, TABS, Tab, Kpi, EMPTY_KPI, DAYS, HOURS } from "./shared";
import { TabResumen, TabPosts, TabAudiencia, TabMejorHorario, TabHistorias, TabReels, TabCrecimiento } from "./AnalyticsTabs";
import { TabIntegraciones } from "./TabIntegraciones";

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

  const queryClient = useQueryClient();
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);

  const filterPageIds = useMemo(() => {
    return filterAccountIds.map((id) => id.replace(/^(fb_|ig_)/, ""));
  }, [filterAccountIds]);

  const handleForceRefresh = async () => {
    if (filterPageIds.length === 0) return;
    setIsForceRefreshing(true);
    try {
      const pageIdParam = filterPageIds.length > 0 ? `pageIds=${filterPageIds.join(",")}` : "";
      const platformParamStr = filterPlatform !== "all" ? `platform=${filterPlatform}` : "";
      const compareParamStr = compareMode !== "none" ? `compare=${compareMode}` : "";

      const qOrganic = [`days=${period}`, pageIdParam, platformParamStr, compareParamStr].filter(Boolean).join("&");
      const qAudience = [pageIdParam, platformParamStr].filter(Boolean).join("&");
      const qPosts = [`limit=25`, pageIdParam, platformParamStr].filter(Boolean).join("&");
      const qStories = [platformParamStr].filter(Boolean).join("&");

      await Promise.all([
        fetch(`/api/analytics/organic?${qOrganic}&force=true`),
        fetch(`/api/analytics/audience?${qAudience}&force=true`),
        fetch(`/api/analytics/posts?${qPosts}&force=true`),
        fetch(`/api/analytics/stories?${qStories}&force=true`),
        fetch(`/api/analytics/reels?${qStories}&force=true`),
        fetch(`/api/analytics/growth?${qAudience}&force=true`),
        fetch(`/api/analytics/best-time?${qAudience}&force=true`)
      ]);
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    } catch (e) {
      console.error("Error bypassing cache:", e);
    } finally {
      setIsForceRefreshing(false);
    }
  };

  // ── Query: KPIs ──
  const { data: organicData, isLoading: isLoadingKpis } = useQuery({
    queryKey: ["analytics", "organic", period, filterPageIds, filterPlatform, compareMode],
    queryFn: async () => {
      const pageIdParam = filterPageIds.length > 0 ? `&pageIds=${filterPageIds.join(",")}` : "";
      const platformParam = filterPlatform !== "all" ? `&platform=${filterPlatform}` : "";
      const compareParam = compareMode !== "none" ? `&compare=${compareMode}` : "";
      
      const res = await fetch(`/api/analytics/organic?days=${period}${pageIdParam}${platformParam}${compareParam}`);
      if (!res.ok) throw new Error("Failed to fetch organic KPIs");
      return res.json();
    },
    enabled: filterAccountIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  // ── Query: Posts ──
  const { data: postData, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["analytics", "posts", filterPageIds, filterPlatform],
    queryFn: async () => {
      const pageIdParam = filterPageIds.length > 0 ? `&pageIds=${filterPageIds.join(",")}` : "";
      const platformParam = filterPlatform !== "all" ? `&platform=${filterPlatform}` : "";
      
      const res = await fetch(`/api/analytics/posts?limit=25${pageIdParam}${platformParam}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
    enabled: filterAccountIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // ── Query: Audience ──
  const { data: audienceData, isLoading: isLoadingAudience } = useQuery({
    queryKey: ["analytics", "audience", filterPageIds, filterPlatform],
    queryFn: async () => {
      const pageIdParam = filterPageIds.length > 0 ? `pageIds=${filterPageIds.join(",")}` : "";
      const platformParam = filterPlatform !== "all" ? `platform=${filterPlatform}` : "";
      const params = [pageIdParam, platformParam].filter(Boolean).join("&");
      const queryStr = params ? `?${params}` : "";
      
      const res = await fetch(`/api/analytics/audience${queryStr}`);
      if (!res.ok) throw new Error("Failed to fetch audience");
      return res.json();
    },
    enabled: filterAccountIds.length > 0,
    staleTime: 1000 * 60 * 60, // Audience data is more stable, cache for 1 hour
  });

  // ── Mapped KPIs ──
  const kpis = useMemo<Kpi[]>(() => {
    if (!organicData || organicData.error) return EMPTY_KPI;
    const cmp = organicData.comparison;
    const lbl = cmp ? compareLabel(cmp.mode) : "";
    const fmtChange = (delta: number) => `${delta > 0 ? "+" : ""}${delta}%`;
    const fmtTrend = (t: number) => `${t > 0 ? "+" : ""}${(t || 0).toFixed(1)}%`;

    return [
      {
        label: "Alcance",
        value: (organicData.reach || 0).toLocaleString(),
        change: cmp ? fmtChange(cmp.deltas.reach) : fmtTrend(organicData.reachTrend),
        positive: cmp ? cmp.deltas.reach >= 0 : (organicData.reachTrend || 0) >= 0,
        icon: Eye, color: "#00d4ff", accent: "cyan",
        compareValue: cmp ? `${lbl}: ${(cmp.reach || 0).toLocaleString()}` : undefined,
      },
      {
        label: "Engagement",
        value: `${(organicData.engagement || 0).toFixed(1)}%`,
        change: cmp ? fmtChange(cmp.deltas.engagement) : fmtTrend(organicData.engagementTrend),
        positive: cmp ? cmp.deltas.engagement >= 0 : (organicData.engagementTrend || 0) >= 0,
        icon: Heart, color: "#f472b6", accent: "pink",
        compareValue: cmp ? `${lbl}: ${(cmp.engagement || 0).toFixed(1)}%` : undefined,
      },
      {
        label: "Seguidores",
        value: (organicData.followers || 0).toLocaleString(),
        change: fmtTrend(organicData.followersTrend),
        positive: (organicData.followersTrend || 0) >= 0,
        icon: Users, color: "#06d6a0", accent: "emerald",
      },
      {
        label: "Impresiones",
        value: (organicData.impressions || 0).toLocaleString(),
        change: cmp ? fmtChange(cmp.deltas.impressions) : fmtTrend(organicData.impressionsTrend),
        positive: cmp ? cmp.deltas.impressions >= 0 : (organicData.impressionsTrend || 0) >= 0,
        icon: BarChart2, color: "#7b61ff", accent: "purple",
        compareValue: cmp ? `${lbl}: ${(cmp.impressions || 0).toLocaleString()}` : undefined,
      },
    ];
  }, [organicData]);

  // ── Mapped Posts ──
  const posts = useMemo(() => {
    if (!postData?.posts) return [];
    return postData.posts.map((p: any, i: number) => ({
      id: p.id || i + 1,
      text: p.text || "",
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
    }));
  }, [postData]);

  // ── Mapped Audience ──
  const audienceAge = audienceData?.age || [];
  const audienceGender = useMemo(() => {
    if (!audienceData?.gender) return [];
    const colors = ["#f472b6", "#00d4ff", "#7b61ff"];
    return audienceData.gender.map((g: any, i: number) => ({ ...g, color: colors[i] || "#94a3b8" }));
  }, [audienceData]);
  const audienceLocation = audienceData?.location || [];

  // Filter posts by selected platform
  const filteredPosts = useMemo(() => {
    if (filterPlatform === "all") return posts;
    const platformMap: Record<string, string> = { facebook: "Facebook", instagram: "Instagram" };
    const target = platformMap[filterPlatform] || "";
    return posts.filter((p: any) => p.channel === target);
  }, [posts, filterPlatform]);

  // Build query string for sub-tabs
  const filterQuery = useMemo(() => {
    const params: string[] = [];
    if (filterPageIds.length > 0) params.push(`pageIds=${filterPageIds.join(",")}`);
    if (filterPlatform !== "all") params.push(`platform=${filterPlatform}`);
    return params.length > 0 ? `?${params.join("&")}` : "";
  }, [filterPageIds, filterPlatform]);

  const handleExportCSV = useCallback(() => {
    if (!organicData && !postData) return;
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "SECCIÓN,MÉTRICA,VALOR,CAMBIO\n";
    
    if (organicData && organicData.kpis) {
      kpis.forEach((kpi) => {
        csvContent += `Resumen,"${kpi.label}","${kpi.value.replace(/,/g, "")}","${kpi.change}"\n`;
      });
    }

    if (posts && posts.length > 0) {
      csvContent += "\nSECCIÓN,FECHA,CANAL,POST,ALCANCE,LIKES,COMENTARIOS,COMPARTIDOS\n";
      posts.forEach((p: any) => {
        const cleanMsg = (p.text || "").replace(/(\r\n|\n|\r|,)/gm, " ").substring(0, 100);
        csvContent += `Posts,"${p.date}","${p.channel}","${cleanMsg}","${p.reach}","${p.likes}","${p.comments}","${p.shares}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sodare_analytics_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [organicData, postData, kpis, posts]);

  const isLoading = isLoadingKpis || isLoadingPosts || isLoadingAudience || isForceRefreshing;
  const isError = (!isLoading && (organicData?.error || postData?.error || audienceData?.error)) || false;

  return (
    <div className="space-y-4">
      {/* ─── FILTERS BAR ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
        <AnalyticsFilters onFilterChange={handleFilterChange} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ComparisonControl onChange={handleComparisonChange} />
          
          <button
            onClick={handleForceRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }}
            title="Refrescar y limpiar caché"
          >
            <RefreshCw className={`w-4 h-4 ${isForceRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={isLoading || posts.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }}
            title="Exportar a CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {isError && (
        <div className="flex flex-col items-center justify-center p-12 glass-panel border border-red-500/20 bg-red-500/5">
          <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-200 mb-2">Conexión con Meta fallida</h3>
          <p className="text-slate-400 text-sm max-w-md text-center">
            Hubo un error obteniendo los datos desde la API de Meta. Esto suele ocurrir por falta de permisos o si el token expiró.
            {organicData?.error && <><br/>Detalle: {organicData.error}</>}
          </p>
          <button onClick={handleForceRefresh} className="mt-4 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors">
            Reintentar
          </button>
        </div>
      )}

      {isLoading && !isError && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/5 border border-white/5"></div>
            ))}
          </div>
          <div className="flex gap-4">
            <div className="flex-1 h-80 rounded-2xl bg-white/5 border border-white/5"></div>
            <div className="w-1/3 h-80 rounded-2xl bg-white/5 border border-white/5 hidden lg:block"></div>
          </div>
        </div>
      )}

      {!isLoading && !isError && dataNotices.length > 0 && (
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
      {!isLoading && !isError && (
        <div style={{ animation: "page-fade-in 0.3s ease-out forwards" }}>
          {activeTab === "Resumen" && <TabResumen kpis={kpis} posts={filteredPosts} />}
          {activeTab === "Posts" && <TabPosts posts={filteredPosts} />}
          {activeTab === "Audiencia" && <TabAudiencia age={audienceAge} gender={audienceGender} location={audienceLocation} />}
          {activeTab === "Historias" && <TabHistorias filterQuery={filterQuery} />}
          {activeTab === "Reels" && <TabReels filterQuery={filterQuery} />}
          {activeTab === "Mejor Horario" && <TabMejorHorario filterQuery={filterQuery} />}
          {activeTab === "Crecimiento" && <TabCrecimiento filterQuery={filterQuery} />}
          {activeTab === "Configuración" && <TabIntegraciones />}
        </div>
      )}
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

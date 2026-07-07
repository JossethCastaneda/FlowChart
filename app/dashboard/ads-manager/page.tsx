"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSession as useSessionHook } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Megaphone, Search, RefreshCw, AlertCircle, Plus, Info, Filter, X, ChevronDown, CheckCircle, AlertTriangle, Radar } from "lucide-react";
import { PermissionGuard } from "@/components/layout/PermissionsContext";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { AccountSelector } from "@/components/ads-manager/AccountSelector";
import { BotSelector } from "@/components/shared/BotSelector";
import { CreateCampaignModal } from "@/components/ads-manager/CreateCampaignModal";
import { CreateAdSetModal } from "@/components/ads-manager/CreateAdSetModal";
import { BreakdownSelector } from "@/components/ads-manager/BreakdownSelector";
import { ColumnSelector } from "@/components/ads-manager/ColumnSelector";
import { TableActionBar } from "@/components/ads-manager/TableActionBar";
import { BulkActionBar } from "@/components/ads-manager/BulkActionBar";
import { AdsManagerTable } from "@/components/ads-manager/AdsManagerTable";
import { AdsExecutiveSummary } from "@/components/ads-manager/AdsExecutiveSummary";
import { EditCampaignModal } from "@/components/ads-manager/EditCampaignModal";
import { EditAdSetModal } from "@/components/ads-manager/EditAdSetModal";
import { EditAdModal } from "@/components/ads-manager/EditAdModal";
import { FilterPanel, type FilterItem } from "@/components/ads-manager/FilterPanel";
import { CampaignDrawer } from "@/components/ads-manager/CampaignDrawer";
import { AlertsCenter } from "@/components/ads-manager/AlertsCenter";
import { showToast } from "@/components/ui/Toast";
import { useAlerts } from "@/hooks/useAlerts";
import { ExportButton } from "@/components/ads-manager/ExportButton";
import { ColumnPresets } from "@/components/ads-manager/ColumnPresets";
import { ConfirmDialog } from "@/components/ads-manager/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipboardModal } from "@/components/ads-manager/ClipboardModal";
import { BulkRenameModal } from "@/components/ads-manager/BulkRenameModal";
import { BulkBudgetModal } from "@/components/ads-manager/BulkBudgetModal";
import { SpendCapModal } from "@/components/ads-manager/SpendCapModal";
import { RulesBuilderModal } from "@/components/ads-manager/RulesBuilderModal";
import { RulesManagerModal } from "@/components/ads-manager/RulesManagerModal";
import { ImportModal } from "@/components/ads-manager/ImportModal";
import { useClipboardStore } from "@/stores/clipboardStore";
import { calcROAS, isAdvantagePlus, findActionValue } from "@/lib/ads-metrics";

const MetaIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const DEFAULT_COLUMNS = [
  { key: "name", label: "Nombre" },
  { key: "delivery", label: "Entrega" },
  { key: "budget", label: "Presupuesto" },
  { key: "objective", label: "Objetivo" },
  { key: "roas", label: "ROAS" },
  { key: "reach", label: "Alcance" },
  { key: "impressions", label: "Impresiones" },
  { key: "cpm", label: "CPM (costo por mil impresiones)" },
  { key: "frequency", label: "Frecuencia" },
  { key: "clicks", label: "Clics (todos)" },
  { key: "ctr", label: "CTR (todos)" },
  { key: "cpc", label: "CPC (todos)" },
  { key: "results", label: "Resultados" },
  { key: "conversations", label: "Conversaciones con mensajes iniciadas" },
  { key: "cost_per_message", label: "Costo por mensaje" },
  { key: "cost_per_conversation", label: "Costo por conversación" },
  { key: "cpa", label: "CPA / CPL" },
  { key: "landing_page_views", label: "Landing Page Views" },
  { key: "hook_rate", label: "Hook Rate %" },
  { key: "spend", label: "Importe gastado" },
  { key: "quality_ranking", label: "Puntuación de calidad" },
];

const ALL_COLUMNS = [
  ...DEFAULT_COLUMNS,
  { key: "learning_phase", label: "Fase de aprendizaje" },
  { key: "advantage_plus", label: "Advantage+" },
  { key: "roas", label: "ROAS (Retorno de inversión)" },
  { key: "purchases", label: "Compras" },
  { key: "cost_per_purchase", label: "Costo por compra" },
  { key: "leads", label: "Clientes potenciales" },
  { key: "cost_per_lead", label: "Costo por cliente potencial" },
  { key: "video_plays", label: "Reproducciones de video (3 s)" },
  { key: "video_plays_100", label: "Reproducciones de video al 100%" },
  { key: "outbound_clicks", label: "Clics salientes" },
  { key: "engagement_ranking", label: "Clasificación de interacción" },
  { key: "conversion_ranking", label: "Clasificación de conversiones" },
  { key: "attribution", label: "Configuración de atribución" },
  { key: "bid_strategy", label: "Estrategia de puja" },
  { key: "optimization_goal", label: "Optimización de entrega" },
  { key: "last_edited", label: "Última edición" },
];

export default function AdsManagerPage() {
  return (
    <PermissionGuard permKey="canAccessAds">
      <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Cargando Ads Manager...</div>}>
        <AdsManagerContent />
      </Suspense>
    </PermissionGuard>
  );
}

function AdsManagerContent() {
  // Auth guard: check if user authenticated with Facebook
  const { data: session } = useSessionHook();

  const searchParams = useSearchParams();
  const isEmbedded = searchParams.get("embedded") === "1";
  const initialAccount = searchParams.get("account") || "";
  const projectAccountsParam = searchParams.get("project_accounts") || "";

  // Meta Ads connection status
  const [adsConnected, setAdsConnected] = useState<boolean | null>(null);
  const [justConnected, setJustConnected] = useState(false);

  const [selectedBotId, setSelectedBotId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}) // Omitting integrationId triggers sync for all active integrations
      });
    } catch (e) {}
    setTimeout(() => setIsSyncing(false), 2000);
  };

  // Platform and Google integrations status
  const [platform, setPlatform] = useState<"meta" | "google">("meta");
  const [googleIntegration, setGoogleIntegration] = useState<any>(null);

  useEffect(() => {
    fetch("/api/workspace/integrations")
      .then((r) => r.json())
      .then((res) => {
        if (Array.isArray(res.data?.data)) {
          const g = res.data.data.find((i: any) => i.provider === "google");
          setGoogleIntegration(g || null);
        }
      })
      .catch(() => {});
  }, []);

  const isGoogleAdsConnected = !!(
    googleIntegration?.connected &&
    googleIntegration?.connectedModules?.includes("google_ads") &&
    googleIntegration?.resources?.google_ads?.customerId
  );
  const googleCustomerId = googleIntegration?.resources?.google_ads?.customerId || "";

  useEffect(() => {
    // Detect redirect back from OAuth callback
    if (searchParams.get("connected") === "ads") {
      setJustConnected(true);
    }
    // Check integration status
    fetch("/api/connect/status")
      .then((r) => r.json())
      .then((data) => {
        const adsMod = data?.modules?.ads;
        setAdsConnected(adsMod?.connected ?? false);
      })
      .catch(() => setAdsConnected(false));
  }, []);

  // Accounts state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateAdSet, setShowCreateAdSet] = useState(false);

  // Active level tab
  const [activeLevel, setActiveLevel] = useState<"campaigns" | "adsets" | "ads">("campaigns");
  const [viewMode, setViewMode] = useState<"health" | "expert">("health");

  // Data lists
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [adsets, setAdsets] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Search and view customizations
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<FilterItem[]>([]);
  
  const [selectedBreakdown, setSelectedBreakdown] = useState("none");

  // Column persistence via localStorage
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sodare_ads_columns");
      if (saved) try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_COLUMNS.map((c) => c.key);
  });

  // Persist columns when they change
  const handleColumnsChange = (cols: string[]) => {
    setVisibleColumns(cols);
    if (typeof window !== "undefined") {
      localStorage.setItem("sodare_ads_columns", JSON.stringify(cols));
    }
  };

  // Date picker state
  const [datePreset, setDatePreset] = useState("maximum");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    type: "campaign" | "adset" | "ad";
    item: any;
  } | null>(null);

  // Drawer state
  const [drawerItem, setDrawerItem] = useState<any | null>(null);

  // Toast state
  const addToast = showToast;

  // Auto-sync timer (30 min)
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [autoSync, setAutoSync] = useState(true);

  // Clipboard store
  const clipboard = useClipboardStore();

  // Modal states
  const [showClipboardModal, setShowClipboardModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showSpendCapModal, setShowSpendCapModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; variant: "danger" | "warning" | "info"; onConfirm: () => Promise<void> } | null>(null);
  const [showRulesBuilder, setShowRulesBuilder] = useState(false);
  const [showRulesManager, setShowRulesManager] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Auto-sync effect
  useEffect(() => {
    if (!autoSync || !selectedAccountId) return;
    const interval = setInterval(() => {
      fetchData();
    }, 30 * 60 * 1000); // 30 minutes
    return () => clearInterval(interval);
  }, [autoSync, selectedAccountId]);

  const openEdit = (type: "campaign" | "adset" | "ad", item: any) => {
    setEditModal({ type, item });
  };
  const closeEdit = () => setEditModal(null);
  const handleEditSaved = () => { fetchData(); closeEdit(); };

  // Fetch accounts on load (filtered by project accounts if embedded)
  useEffect(() => {
    // Pull per-account spend for the active period so we can default to the
    // highest-spend account (marketing focus: start where the money is).
    fetch(`/api/meta/adaccounts?preset=${datePreset || "maximum"}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data)) {
          let list = data.data.filter((acc: any) => acc.id !== "error");

          if (projectAccountsParam) {
            const allowed = projectAccountsParam.split(",");
            list = list.filter((acc: any) => allowed.includes(acc.id));
          }

          setAccounts(list);

          // When embedded with project accounts, default to 'all' to show combined data
          if (isEmbedded && projectAccountsParam && list.length > 1) {
            setSelectedAccountId("all");
          } else if (initialAccount && list.some((a: any) => a.id === initialAccount)) {
            setSelectedAccountId(initialAccount);
          } else if (list.length > 0) {
            // Default to the account with the most spend in the period.
            const top = [...list].sort((a: any, b: any) => (b.spend || 0) - (a.spend || 0))[0];
            setSelectedAccountId((top || list[0]).id);
          }
        }
        setLoadingAccounts(false);
      })
      .catch((err) => {
        console.error("Failed to load ad accounts", err);
        setLoadingAccounts(false);
      });
  }, [projectAccountsParam]);

  // Sync selected account when parameter changes
  useEffect(() => {
    if (initialAccount && accounts.some((a: any) => a.id === initialAccount)) {
      setSelectedAccountId(initialAccount);
    }
  }, [initialAccount, accounts]);

  // Sync date selection from query parameters if they change
  useEffect(() => {
    const paramPreset = searchParams.get("datePreset");
    const paramStart = searchParams.get("dateStart");
    const paramEnd = searchParams.get("dateEnd");

    if (paramPreset && paramPreset !== datePreset) {
      setDatePreset(paramPreset);
    }
    if (paramStart && paramStart !== dateStart) {
      setDateStart(paramStart);
    }
    if (paramEnd && paramEnd !== dateEnd) {
      setDateEnd(paramEnd);
    }
  }, [searchParams, datePreset, dateStart, dateEnd]);

  // Fetch data on changes — supports single account or 'all' (multi-account merge)
  const fetchData = async () => {
    if (platform === "google") {
      setLoadingData(true);
      setError(null);
      let dateParams = "";
      if (dateStart && dateEnd) {
        dateParams = `?since=${dateStart}&until=${dateEnd}`;
      } else if (datePreset && datePreset !== "custom") {
        let sinceStr = "";
        let untilStr = "";
        const today = new Date();
        if (datePreset === "today") {
          sinceStr = today.toISOString().slice(0, 10);
          untilStr = sinceStr;
        } else if (datePreset === "yesterday") {
          const y = new Date();
          y.setDate(today.getDate() - 1);
          sinceStr = y.toISOString().slice(0, 10);
          untilStr = sinceStr;
        } else if (datePreset === "last_7d") {
          const d = new Date();
          d.setDate(today.getDate() - 7);
          sinceStr = d.toISOString().slice(0, 10);
          untilStr = today.toISOString().slice(0, 10);
        } else if (datePreset === "last_30d") {
          const d = new Date();
          d.setDate(today.getDate() - 30);
          sinceStr = d.toISOString().slice(0, 10);
          untilStr = today.toISOString().slice(0, 10);
        }
        
        if (sinceStr && untilStr) {
          dateParams = `?since=${sinceStr}&until=${untilStr}`;
        }
      }

      try {
        const res = await fetch(`/api/integrations/google/ads/campaigns${dateParams}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        
        setCampaigns(json.data || []);
        setAdsets([]);
        setAds([]);
        setSelectedIds([]);
        setLastSynced(new Date());
      } catch (err: any) {
        setError(err.message || "Error al sincronizar con Google Ads API");
      } finally {
        setLoadingData(false);
      }
      return;
    }

    if (!selectedAccountId) return;
    setLoadingData(true);
    setError(null);

    let dateParams = "";
    if (dateStart && dateEnd) {
      dateParams = `&dateStart=${dateStart}&dateEnd=${dateEnd}`;
    } else if (datePreset && datePreset !== "custom") {
      dateParams = `&preset=${datePreset}`;
    }

    try {
      const level = activeLevel;

      // Multi-account: fetch all accounts in parallel and merge
      const accountsToFetch = selectedAccountId === "all"
        ? accounts.map((a: any) => a.id)
        : [selectedAccountId];

      const results = await Promise.allSettled(
        accountsToFetch.map(async (accId: string) => {
          const res = await fetch(`/api/meta/${level}?adAccountId=${accId}${dateParams}`);
          const data = await res.json();
          if (data.status === "error" || data.error) throw new Error(data.error || data.user_message || "Error de la Fuerza");
          if (data.warnings && data.warnings.length > 0) {
            data.warnings.forEach((w: string) => addToast("warning", w));
          }
          const accName = accounts.find((a: any) => a.id === accId)?.name || accId;
          // Tag each item with its account info for filtering
          return (data.data || []).map((item: any) => ({
            ...item,
            _accountId: accId,
            _accountName: accName.split(" — ")[0],
          }));
        })
      );

      let merged: any[] = [];
      let errors: string[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") merged = merged.concat(r.value);
        else errors.push(r.reason?.message || "Error desconocido");
      }

      if (merged.length === 0 && errors.length > 0) {
        throw new Error(errors[0]);
      }

      if (level === "campaigns") setCampaigns(merged);
      else if (level === "adsets") setAdsets(merged);
      else if (level === "ads") setAds(merged);

      // Clear selection on tab/data change
      setSelectedIds([]);
      setLastSynced(new Date());
    } catch (err: any) {
      setError(err.message || "Error al sincronizar con Meta Ads Graph API");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAccountId, activeLevel, datePreset, dateStart, dateEnd, platform]);

  // Breakdown data state
  const [breakdownData, setBreakdownData] = useState<Record<string, any[]>>({});
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  // Fetch breakdown data when selectedBreakdown changes
  useEffect(() => {
    if (selectedBreakdown === "none") {
      setBreakdownData({});
      return;
    }
    const data = getCurrentData();
    if (data.length === 0) return;

    setLoadingBreakdown(true);
    const levelStr = activeLevel === "campaigns" ? "campaign" : activeLevel === "adsets" ? "adset" : "ad";

    // Fetch breakdown for each item (up to 20 to avoid rate limits)
    const itemsToFetch = data.slice(0, 20);
    Promise.allSettled(
      itemsToFetch.map(async (item: any) => {
        const res = await fetch(
          `/api/meta/breakdowns?id=${item.id}&breakdown=${selectedBreakdown}&level=${levelStr}&preset=${datePreset || "last_30d"}`
        );
        const json = await res.json();
        return { id: item.id, data: json.data || [], error: json.error };
      })
    ).then((results) => {
      const bdMap: Record<string, any[]> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value.data) {
          bdMap[r.value.id] = r.value.data;
        }
      });
      setBreakdownData(bdMap);
      setLoadingBreakdown(false);
    });
  }, [selectedBreakdown, activeLevel, campaigns, adsets, ads]);

  // Handle single status updates (optimistic)
  const handleUpdateStatus = async (id: string, status: "ACTIVE" | "PAUSED") => {
    // Optimistic update — apply immediately
    const updateList = (list: any[]) =>
      list.map((item) => (item.id === id ? { ...item, status, effective_status: status } : item));
    const prevCampaigns = [...campaigns];
    const prevAdsets = [...adsets];
    const prevAds = [...ads];
    if (activeLevel === "campaigns") setCampaigns(updateList(campaigns));
    else if (activeLevel === "adsets") setAdsets(updateList(adsets));
    else if (activeLevel === "ads") setAds(updateList(ads));

    if (platform === "google") {
      try {
        const res = await fetch("/api/integrations/google/ads/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: id, status }),
        });
        const data = await res.json();
        if (data.success) {
          return true;
        }
        setCampaigns(prevCampaigns);
        addToast("error", `Error al cambiar estado en Google Ads: ${data.error || "Error desconocido"}`);
        return false;
      } catch (err) {
        setCampaigns(prevCampaigns);
        addToast("error", "Error de red al cambiar estado en Google Ads");
        return false;
      }
    }

    try {
      const res = await fetch(`/api/meta/${activeLevel}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [`${activeLevel.slice(0, -1)}Id`]: id,
          status,
          confirmed_by_user: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        return true;
      }
      // Revert on failure
      if (activeLevel === "campaigns") setCampaigns(prevCampaigns);
      else if (activeLevel === "adsets") setAdsets(prevAdsets);
      else if (activeLevel === "ads") setAds(prevAds);
      addToast("error", `Error al cambiar estado: ${data.error || "Error desconocido"}`);
      return false;
    } catch (err) {
      // Revert on error
      if (activeLevel === "campaigns") setCampaigns(prevCampaigns);
      else if (activeLevel === "adsets") setAdsets(prevAdsets);
      else if (activeLevel === "ads") setAds(prevAds);
      addToast("error", "Error de red al cambiar estado");
      return false;
    }
  };

  // Handle single name updates
  const handleUpdateName = async (id: string, name: string) => {
    if (platform === "google") {
      addToast("warning", "El cambio de nombre para campañas de Google Ads no está disponible desde esta vista");
      return false;
    }
    try {
      const res = await fetch(`/api/meta/${activeLevel}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [`${activeLevel.slice(0, -1)}Id`]: id,
          name,
          confirmed_by_user: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const updateList = (list: any[]) =>
          list.map((item) => (item.id === id ? { ...item, name } : item));
        if (activeLevel === "campaigns") setCampaigns(updateList(campaigns));
        else if (activeLevel === "adsets") setAdsets(updateList(adsets));
        else if (activeLevel === "ads") setAds(updateList(ads));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  // Handle budget updates
  const handleUpdateBudget = async (id: string, budget: number, type: "daily" | "lifetime") => {
    if (platform === "google") {
      addToast("warning", "La edición de presupuesto para campañas de Google Ads no está disponible desde esta vista");
      return false;
    }
    try {
      const res = await fetch(`/api/meta/${activeLevel}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [`${activeLevel.slice(0, -1)}Id`]: id,
          [`${type}_budget`]: budget,
          confirmed_by_user: true,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const updateList = (list: any[]) =>
          list.map((item) =>
            item.id === id
              ? {
                  ...item,
                  daily_budget: type === "daily" ? String(budget * 100) : item.daily_budget,
                  lifetime_budget: type === "lifetime" ? String(budget * 100) : item.lifetime_budget,
                }
              : item
          );
        if (activeLevel === "campaigns") setCampaigns(updateList(campaigns));
        else if (activeLevel === "adsets") setAdsets(updateList(adsets));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  // Handle bid updates
  const handleUpdateBid = async (id: string, bid: number) => {
    try {
      const res = await fetch("/api/meta/adsets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adsetId: id,
          bid_amount: bid,
          confirmed_by_user: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdsets(
          adsets.map((item) => (item.id === id ? { ...item, bid_amount: String(bid * 100) } : item))
        );
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  // Handle bulk actions (enhanced with toasts + result counting)
  const handleBulkAction = async (
    action: "duplicate" | "activate" | "pause" | "archive" | "delete",
    opts?: { updates?: any[]; ids?: string[] }
  ) => {
    const ids = opts?.ids || selectedIds;
    if (ids.length === 0) {
      addToast("error", "No hay elementos seleccionados");
      return;
    }
    const levelLabel = activeLevel === "campaigns" ? "campaña" : activeLevel === "adsets" ? "conjunto" : "anuncio";
    const n = ids.length;
    addToast("info", `Ejecutando ${action} en ${n} ${levelLabel}${n > 1 ? "s" : ""}...`);

    if (platform === "google") {
      if (action !== "activate" && action !== "pause") {
        addToast("warning", `La acción ${action} no está disponible para Google Ads`);
        return;
      }
      const newStatus = action === "activate" ? "ACTIVE" : "PAUSED";
      try {
        const results = await Promise.allSettled(
          ids.map(async (id) => {
            const res = await fetch("/api/integrations/google/ads/campaigns", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ campaignId: id, status: newStatus }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed");
            return id;
          })
        );
        const successCount = results.filter((r) => r.status === "fulfilled").length;
        const failCount = n - successCount;
        if (failCount === 0) {
          addToast("success", `✅ ${successCount} ${levelLabel}${successCount > 1 ? "s" : ""} actualizadas correctamente`);
        } else {
          addToast("warning", `✅ ${successCount} actualizadas. ${failCount} fallaron.`);
        }
        fetchData();
        setSelectedIds([]);
      } catch (err: any) {
        addToast("error", `Error: ${err.message}`);
      }
      return;
    }

    try {
      // Resolve the actual account ID (in multi-account mode, use the first selected item's _accountId)
      let resolvedAccountId = selectedAccountId;
      if (selectedAccountId === "all") {
        const data = getCurrentData();
        const firstItem = data.find((d: any) => ids.includes(d.id));
        resolvedAccountId = firstItem?._accountId || accounts[0]?.id || "";
      }
      const res = await fetch("/api/meta/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ids,
          level: activeLevel,
          adAccountId: resolvedAccountId,
          updates: opts?.updates,
          confirmed_by_user: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const { successCount, failCount, results: actionResults } = data;
        if (failCount === 0) {
          // Check if delete was actually an archive (Meta behavior)
          const archivedCount = action === "delete" && actionResults ? actionResults.filter((r: any) => r.method === "archived").length : 0;
          if (archivedCount > 0) {
            addToast("success", `✅ ${successCount} ${levelLabel}${successCount > 1 ? "s" : ""} archivada${successCount > 1 ? "s" : ""} (Meta no permite eliminar campañas con historial)`);
          } else {
            addToast("success", `✅ ${successCount} ${levelLabel}${successCount > 1 ? "s" : ""} — ${action} completado`);
          }
        } else {
          addToast("warning", `${successCount} de ${n} ${action} exitosas. ${failCount} fallaron.`);
        }
        fetchData();
        setSelectedIds([]);
      } else {
        addToast("error", data.error || "Error al ejecutar acción");
      }
    } catch (err: any) {
      addToast("error", `Error: ${err.message}`);
    }
  };

  // ── TOOLBAR ACTION HANDLERS ──

  const handleDuplicateQuick = () => {
    handleBulkAction("duplicate");
  };

  const handleCopy = () => {
    const data = getCurrentData();
    const copiedItems = selectedIds.map((id) => {
      const item = data.find((d: any) => d.id === id);
      return { id, name: item?.name || id, level: activeLevel };
    });
    clipboard.copy(copiedItems);
    addToast("info", `📋 ${copiedItems.length} ${activeLevel === "campaigns" ? "campaña" : activeLevel === "adsets" ? "conjunto" : "anuncio"}${copiedItems.length > 1 ? "s" : ""} copiada${copiedItems.length > 1 ? "s" : ""}`);
  };

  const handlePaste = () => {
    const items = clipboard.paste();
    if (items.length === 0) return;
    const ids = items.map((i) => i.id);
    addToast("info", `Duplicando ${ids.length} elementos del clipboard...`);
    fetch("/api/meta/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate", ids, level: items[0].level, adAccountId: selectedAccountId, confirmed_by_user: true }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          addToast("success", `✅ ${data.successCount} elementos pegados (duplicados como pausados)`);
          clipboard.clear();
          fetchData();
        } else {
          addToast("error", data.error || "Error al pegar");
        }
      })
      .catch((err) => addToast("error", err.message));
  };

  const handleActivate = () => {
    const capturedIds = [...selectedIds];
    setConfirmAction({
      title: `¿Activar ${capturedIds.length} ${activeLevel === "campaigns" ? "campañas" : "elementos"}?`,
      message: "Esto iniciará el gasto de inmediato.",
      variant: "warning",
      onConfirm: async () => { await handleBulkAction("activate", { ids: capturedIds }); setConfirmAction(null); },
    });
  };

  const handleDeactivate = () => {
    const capturedIds = [...selectedIds];
    setConfirmAction({
      title: `¿Pausar ${capturedIds.length} ${activeLevel === "campaigns" ? "campañas" : "elementos"}?`,
      message: "Los anuncios dejarán de entregarse.",
      variant: "warning",
      onConfirm: async () => { await handleBulkAction("pause", { ids: capturedIds }); setConfirmAction(null); },
    });
  };

  const handleDelete = () => {
    const capturedIds = [...selectedIds];
    setConfirmAction({
      title: `¿Eliminar ${capturedIds.length} elemento${capturedIds.length > 1 ? "s" : ""}?`,
      message: "Las campañas con historial de gasto serán archivadas (comportamiento estándar de Meta). Las campañas sin gasto serán eliminadas permanentemente.",
      variant: "danger",
      onConfirm: async () => { await handleBulkAction("delete", { ids: capturedIds }); setConfirmAction(null); },
    });
  };

  const handleBulkRename = async (updates: { id: string; newName: string }[]) => {
    const ids = updates.map((u) => u.id);
    const updateData = updates.map((u) => ({ newName: u.newName }));
    addToast("info", `Renombrando ${updates.length} elementos...`);
    try {
      const res = await fetch("/api/meta/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", ids, level: activeLevel, updates: updateData, confirmed_by_user: true }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", `✅ ${data.successCount} renombrados correctamente`);
        fetchData();
      } else {
        addToast("error", data.error || "Error al renombrar");
      }
    } catch (err: any) {
      addToast("error", err.message);
    }
    setShowRenameModal(false);
  };

  const handleBulkBudget = async (updates: { id: string; budget: number; type: "daily" | "lifetime" }[]) => {
    const ids = updates.map((u) => u.id);
    const updateData = updates.map((u) => ({ budget: u.budget, type: u.type }));
    addToast("info", `Actualizando presupuesto de ${updates.length} elementos...`);
    try {
      const res = await fetch("/api/meta/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "budget_update", ids, level: activeLevel, updates: updateData, confirmed_by_user: true }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", `✅ ${data.successCount} presupuestos actualizados`);
        fetchData();
      } else {
        addToast("error", data.error || "Error al actualizar presupuestos");
      }
    } catch (err: any) {
      addToast("error", err.message);
    }
    setShowBudgetModal(false);
  };

  const handleSpendCap = async (updates: { id: string; spend_cap: number }[]) => {
    const ids = updates.map((u) => u.id);
    const updateData = updates.map((u) => ({ spend_cap: u.spend_cap }));
    addToast("info", `Actualizando límite de gasto...`);
    try {
      const res = await fetch("/api/meta/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "spend_cap", ids, level: activeLevel, updates: updateData, confirmed_by_user: true }),
      });
      const data = await res.json();
      if (data.success) {
        addToast("success", `✅ Límite de gasto actualizado`);
        fetchData();
      } else {
        addToast("error", data.error || "Error al actualizar límite de gasto");
      }
    } catch (err: any) {
      addToast("error", err.message);
    }
    setShowSpendCapModal(false);
  };

  const handleExportCSV = () => {
    // CSV export with papaparse
    import("papaparse").then(({ default: Papa }) => {
      const headers = visibleColumns;
      const rows = filteredData.map((item: any) => {
        const row: Record<string, any> = {};
        headers.forEach((col) => {
          const ins = item.insights || {};
          if (col === "name") row[col] = item.name;
          else if (col === "status") row[col] = item.status;
          else if (col === "spend") row[col] = ins.spend || 0;
          else if (col === "impressions") row[col] = ins.impressions || 0;
          else if (col === "clicks") row[col] = ins.clicks || 0;
          else if (col === "ctr") row[col] = ins.ctr || 0;
          else if (col === "cpc") row[col] = ins.cpc || 0;
          else if (col === "cpm") row[col] = ins.cpm || 0;
          else if (col === "reach") row[col] = ins.reach || 0;
          else if (col === "frequency") row[col] = ins.frequency || 0;
          else if (col === "roas") row[col] = calcROAS(ins);
          else row[col] = ins[col] || "";
        });
        return row;
      });
      const csv = "\uFEFF" + Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sodare_${activeLevel}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addToast("success", "📊 CSV exportado correctamente");
    });
  };

  const handleExportExcel = () => {
    const headers = visibleColumns;
    const rows = filteredData.map((item: any) => {
      const ins = item.insights || {};
      const row: Record<string, any> = {};
      headers.forEach((col) => {
        if (col === "name") row["Nombre"] = item.name;
        else if (col === "spend") row["Gasto"] = parseFloat(ins.spend || "0");
        else if (col === "impressions") row["Impresiones"] = parseInt(ins.impressions || "0");
        else if (col === "clicks") row["Clics"] = parseInt(ins.clicks || "0");
        else if (col === "ctr") row["CTR %"] = parseFloat(ins.ctr || "0");
        else if (col === "roas") row["ROAS"] = calcROAS(ins);
        else row[col] = ins[col] || "";
      });
      return row;
    });
    // Export as CSV (avoids xlsx CVE while maintaining functionality)
    const csvHeaders = Object.keys(rows[0] || {});
    const csvRows = rows.map(r => csvHeaders.map(h => {
      const v = String(r[h] ?? "");
      return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(","));
    const csv = [csvHeaders.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sodare_${activeLevel}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("success", "📊 Exportado correctamente");
  };

  const handleDownloadTemplate = () => {
    const templateHeaders = ["Nombre campaña", "Objetivo", "Presupuesto diario ($)", "Estado"];
    const exampleRow = ["", "OUTCOME_SALES", "", "PAUSED"];
    const instructionHeaders = ["Campo", "Valores válidos"];
    const instructionRows = [
      ["Objetivo", "OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_APP_PROMOTION, OUTCOME_SALES"],
      ["Estado", "ACTIVE, PAUSED"],
    ];
    // Export as CSV
    const csv = [
      templateHeaders.join(","),
      exampleRow.join(","),
      "",
      "--- INSTRUCCIONES ---",
      instructionHeaders.join(","),
      ...instructionRows.map(r => r.join(",")),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sodare_plantilla_importacion.csv";
    a.click();
    URL.revokeObjectURL(url);
    addToast("info", "📥 Plantilla descargada");
  };



  // Get current dataset based on tab
  const getCurrentData = () => {
    if (activeLevel === "campaigns") return campaigns;
    if (activeLevel === "adsets") return adsets;
    return ads;
  };

  // Filter dataset by search query locally and by active filters
  const filteredData = getCurrentData().filter((item) => {
    // 1. Search Query
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) && !item.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // 2. Active Filters
    const ins = item.insights || {};
    for (const filter of activeFilters) {
      if (filter.field === "status") {
        if (item.status !== filter.value) return false;
      }
      if (filter.field === "objective") {
        if (item.objective !== filter.value) return false;
      }
      if (filter.field === "results") {
        const priority = [
          "onsite_conversion.messaging_conversation_started_7d",
          "lead", "omni_purchase", "purchase", "complete_registration",
          "add_to_cart", "link_click",
        ];
        let resultVal = 0;
        for (const t of priority) {
          const a = (ins.actions || []).find((x: any) => x.action_type === t);
          if (a) { resultVal = parseInt(a.value || "0", 10); break; }
        }
        if (filter.operator === ">" && !(resultVal > parseInt(filter.value, 10))) return false;
        if (filter.operator === "=" && !(resultVal === parseInt(filter.value, 10))) return false;
      }
      if (filter.field === "spend") {
        const spend = parseFloat(ins.spend || "0");
        if (filter.operator === ">" && !(spend > parseFloat(filter.value))) return false;
      }
      if (filter.field === "roas") {
        const roas = calcROAS(ins);
        if (filter.operator === ">" && !(roas > parseFloat(filter.value))) return false;
        if (filter.operator === "<" && !(roas < parseFloat(filter.value) && roas > 0)) return false;
      }
      if (filter.field === "frequency") {
        const reach = parseInt(ins.reach || "0", 10);
        const imps = parseInt(ins.impressions || "0", 10);
        const freq = reach > 0 ? imps / reach : parseFloat(ins.frequency || "0");
        if (filter.operator === ">" && !(freq > parseFloat(filter.value))) return false;
      }
      if (filter.field === "advantage_plus") {
        const isAdv = isAdvantagePlus(item);
        if (filter.value === "true" && !isAdv) return false;
        if (filter.value === "false" && isAdv) return false;
      }
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map((item) => item.id));
    }
  };

  const renderHeader = () => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
      <PageHeader
        title="Ads Manager"
        description={platform === "meta" ? "Monitorea y optimiza tus campañas de Meta." : "Monitorea y optimiza tus campañas de Google Ads."}
        icon={<Megaphone className="w-6 h-6" style={{ color: platform === "meta" ? "#0081FB" : "var(--cyan)" }} />}
      />
      {/* Segmented Control for Platforms */}
      <div style={{
        display: "inline-flex",
        padding: "3px",
        borderRadius: "8px",
        background: "var(--surface)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--hairline)",
        gap: 4
      }}>
        <button
          onClick={() => setPlatform("meta")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: "6px",
            color: platform === "meta" ? "#0081FB" : "var(--text-secondary)",
            background: platform === "meta" ? "rgba(0, 129, 251, 0.08)" : "transparent",
            border: `1px solid ${platform === "meta" ? "rgba(0, 129, 251, 0.2)" : "transparent"}`,
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <MetaIcon />
          Meta Ads
        </button>
        <button
          onClick={() => setPlatform("google")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: "6px",
            color: platform === "google" ? "var(--cyan)" : "var(--text-secondary)",
            background: platform === "google" ? "rgba(66, 133, 244, 0.08)" : "transparent",
            border: `1px solid ${platform === "google" ? "rgba(66, 133, 244, 0.2)" : "transparent"}`,
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <GoogleIcon />
          Google Ads
        </button>
      </div>
    </div>
  );

  // Guard: Google Ads not connected / configured
  if (platform === "google" && !isGoogleAdsConnected) {
    return (
      <div className="space-y-6" style={{ padding: isEmbedded ? "0" : "24px 28px" }}>
        {renderHeader()}
        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center" }}>
          <Radar className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-secondary)" }} />
          <p style={{ fontFamily: "var(--font-display)", fontSize: "11px", letterSpacing: "0.2em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
            Conexión Google Ads requerida
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
            Conecta tu cuenta de Google para acceder a campañas, grupos de anuncios y métricas en tiempo real.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => { window.location.href = "/api/oauth/google/start?modules=google_ads"; }}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <svg viewBox="0 0 24 24" width={16} height={16}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Conectar Google Ads
            </button>
            <button
              onClick={() => window.location.href = "/dashboard/integrations"}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-secondary)", fontFamily: "inherit" }}
            >
              Configurar Customer ID en Integraciones →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guard: si no hay cuentas de Meta Ads conectadas en el workspace
  if (platform === "meta" && !loadingAccounts && accounts.length === 0) {
    return (
      <div className="space-y-6" style={{ padding: isEmbedded ? "0" : "24px 28px" }}>
        {renderHeader()}

        {/* ── META ADS CONNECTION PANEL ── */}
        {justConnected ? (
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "12px 16px",
            background: "rgba(52,183,124,0.08)",
            border: "1px solid rgba(52,183,124,0.3)",
            borderRadius: "6px",
          }}>
            <CheckCircle className="w-4 h-4" style={{ color: "var(--emerald)", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "var(--emerald)", fontWeight: 600 }}>
              ✅ Meta Ads conectado — sincronizando cuentas publicitarias...
            </span>
          </div>
        ) : (
          <div style={{
            position: "relative",
            display: "flex", alignItems: "center", gap: "16px",
            padding: "16px 20px",
            background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(155,123,232,0.06) 50%, rgba(236,72,153,0.08) 100%)",
            border: "1px solid rgba(155,123,232,0.2)",
            borderRadius: "12px",
            overflow: "hidden",
            backdropFilter: "blur(12px)",
          }}>
            {/* Animated gradient accent line */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "2px",
              background: "linear-gradient(90deg, var(--purple), var(--purple), var(--red), var(--purple))",
              backgroundSize: "200% 100%",
              animation: "shimmer 3s linear infinite",
            }} />
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
              background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(155,123,232,0.2))",
              boxShadow: "0 0 20px rgba(155,123,232,0.15)",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", margin: 0, lineHeight: 1.3 }}>
                Conecta Meta Ads Manager
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "3px 0 0", lineHeight: 1.4 }}>
                Vincula tu cuenta de Meta Ads para ver campañas, conjuntos y anuncios en tiempo real.
              </p>
            </div>
            <a
              href="/api/connect/ads"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "10px 20px",
                background: "linear-gradient(135deg, var(--purple), var(--purple))",
                color: "var(--foreground)",
                fontSize: "12px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const,
                borderRadius: "8px", cursor: "pointer", textDecoration: "none",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 15px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                border: "none",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.transform = "translateY(-1px)";
                el.style.boxShadow = "0 6px 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.2)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "0 4px 15px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Conectar
            </a>
            <style>{`
              @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
          </div>
        )}


        <div className="glass-panel" style={{ padding: "48px 24px", textAlign: "center" }}>
          <Megaphone className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--text-secondary)" }} />
          <p style={{ fontFamily: "var(--font-display)", fontSize: "11px", letterSpacing: "0.2em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
            Conexión Meta Ads requerida
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
            Conecta tu cuenta de Meta Ads Manager para acceder a campañas, conjuntos de anuncios y métricas en tiempo real.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{
      margin: isEmbedded ? "0" : "-24px -28px -40px",
      padding: isEmbedded ? "0 4px" : "0",
      height: isEmbedded ? "100%" : "calc(100vh - 48px)"
    }}>
      {/* ── HEADER & PLATFORM SWITCHER (for main dashboard) ── */}
      {!isEmbedded && (
        <div style={{ flexShrink: 0, padding: "12px 16px 0 16px" }}>
          {renderHeader()}
        </div>
      )}

      {/* ── TOOLBAR (fixed top) ── */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", padding: isEmbedded ? "0 0 6px" : "6px 12px 0", gap: "4px", position: "relative", zIndex: 50, overflow: "visible" }}>
      
      {/* ── TOP CONTROLS ── */}
      <div
        className="glass-panel"
        style={{
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "nowrap",
          position: "relative",
          zIndex: 60,
          overflow: "visible",
        }}
      >
        {platform === "google" ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: "var(--surface)", border: "1px solid var(--border)",
            color: "var(--foreground)"
          }}>
            <GoogleIcon />
            <span>Cuenta Google Ads: {googleCustomerId || "Conectada"}</span>
          </div>
        ) : loadingAccounts ? (
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Cargando cuentas...</div>
        ) : (
          <>
            <AccountSelector
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
            />
            <BotSelector
              selectedBotId={selectedBotId}
              onSelectBot={setSelectedBotId}
              platformFilter={platform}
            />
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Sincronizar cuentas y bots"
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 12px", borderRadius: "6px",
                background: "var(--surface-hover)", border: "1px solid var(--border)",
                color: "var(--foreground)", fontSize: "12px", cursor: isSyncing ? "wait" : "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => { if(!isSyncing) e.currentTarget.style.background = "rgba(255,255,255,0.1)" }}
              onMouseLeave={e => { if(!isSyncing) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            </button>
          </>
        )}

        {/* Create campaign — only for a specific account (not "Todas") */}
        {platform !== "google" && !loadingAccounts && selectedAccountId && selectedAccountId !== "all" && (
          <button
            onClick={() => setShowCreateCampaign(true)}
            title="Crear una campaña nueva (se crea en pausa)"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 6, background: "rgba(0,129,251,0.12)", border: "1px solid rgba(0,129,251,0.35)", color: "var(--cyan)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Crear campaña
          </button>
        )}

        {/* Create ad set — needs at least one campaign loaded */}
        {platform !== "google" && !loadingAccounts && selectedAccountId && selectedAccountId !== "all" && campaigns.length > 0 && (
          <button
            onClick={() => setShowCreateAdSet(true)}
            title="Crear un conjunto de anuncios (se crea en pausa)"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 6, background: "rgba(139,141,242,0.12)", border: "1px solid rgba(139,141,242,0.35)", color: "var(--purple)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Crear conjunto
          </button>
        )}

        {/* Search Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 10px",
            background: "var(--surface-hover)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            flex: 1,
            minWidth: "160px",
          }}
        >
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder={platform === "google" ? "Buscar por nombre o ID de campaña Google Ads..." : "Buscar por nombre o ID de campaña..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "none",
              border: "none",
              color: "var(--foreground)",
              fontSize: "11px",
              outline: "none",
              width: "100%",
            }}
          />
        </div>

        {/* Sync + Date */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <button
            onClick={() => { fetchData(); setLastSynced(new Date()); }}
            disabled={loadingData}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "5px 10px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              color: "var(--foreground)", fontSize: "10px", fontWeight: 600, cursor: "pointer",
            }}
          >
            <RefreshCw className={`w-3 h-3 ${loadingData ? "animate-spin" : ""}`} />
            Sync
          </button>
          {platform !== "google" && (
            <button
              onClick={() => setAutoSync(!autoSync)}
              title={autoSync ? "Auto-sync cada 30 min (activo)" : "Auto-sync desactivado"}
              style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: autoSync ? "var(--emerald)" : "rgba(148,163,184,0.65)",
                border: "none", cursor: "pointer",
                boxShadow: autoSync ? "0 0 6px rgba(52,211,153,0.4)" : "none",
              }}
            />
          )}
          {!isEmbedded && (
            <DateRangePicker
              datePreset={datePreset}
              dateStart={dateStart}
              dateEnd={dateEnd}
              showDatePicker={showDatePicker}
              setShowDatePicker={setShowDatePicker}
              onPresetSelect={(preset) => { setDatePreset(preset); setDateStart(""); setDateEnd(""); }}
              onCustomRange={(start, end) => { setDatePreset("custom"); setDateStart(start); setDateEnd(end); }}
            />
          )}
        </div>
      </div>

      {!isEmbedded && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "2px 2px 0",
        }}>
          <div style={{ display: "inline-flex", padding: 3, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)" }}>
            {([
              ["health", "Salud ejecutiva"],
              ["expert", "Tabla experta"],
            ] as const).map(([mode, label]) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 6,
                    border: "none",
                    background: active ? "rgba(0,129,251,0.18)" : "transparent",
                    color: active ? "var(--cyan)" : "var(--text-secondary)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Revisa riesgos antes de aplicar cambios en Meta.
          </div>
        </div>
      )}

      {viewMode === "expert" && (
      <>
      {/* ── FILTER BAR ── */}
      <FilterPanel
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
        level={activeLevel}
      />
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", background: "var(--red-dim)", border: "1px solid var(--red-dim)", borderRadius: "4px", color: "var(--red)", fontSize: "10px" }}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── ALERTS CENTER ── */}
      <AlertsCenterConnected data={filteredData} level={activeLevel} />

      {/* Info advisory removed for compactness */}

      {/* ── LEVEL TABS ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>
        {(["campaigns", "adsets", "ads"] as const).map((lvl) => {
          const active = activeLevel === lvl;
          const label = lvl === "campaigns" ? "Campañas" : lvl === "adsets" ? "Conjuntos" : "Anuncios";
          const count = lvl === "campaigns" ? campaigns.length : lvl === "adsets" ? adsets.length : ads.length;
          return (
            <button
              key={lvl}
              onClick={() => setActiveLevel(lvl)}
              style={{
                padding: "5px 12px", fontSize: "11px", fontWeight: 600, borderRadius: "4px",
                background: active ? "rgba(0,129,251,0.15)" : "transparent",
                border: `1px solid ${active ? "var(--cyan)" : "transparent"}`,
                color: active ? "var(--cyan)" : "var(--text-secondary)",
                cursor: "pointer", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: "5px",
              }}
            >
              {label}
              {count > 0 && (
                <span style={{ fontSize: "8px", fontWeight: 700, padding: "1px 5px", borderRadius: "8px", background: active ? "rgba(59,130,246,0.2)" : "rgba(148,163,184,0.18)", color: active ? "var(--cyan)" : "var(--text-muted)" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <TableActionBar
        selectedCount={selectedIds.length}
        selectedIds={selectedIds}
        level={activeLevel}
        clipboardCount={clipboard.items.length}
        onDuplicateQuick={platform === "google" ? () => addToast("warning", "Esta acción no está disponible para Google Ads") : handleDuplicateQuick}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onShowClipboard={() => setShowClipboardModal(true)}
        onActivate={handleActivate}
        onDeactivate={handleDeactivate}
        onBulkRename={platform === "google" ? () => addToast("warning", "Esta acción no está disponible para Google Ads") : () => setShowRenameModal(true)}
        onSearchReplace={platform === "google" ? () => addToast("warning", "Esta acción no está disponible para Google Ads") : () => setShowRenameModal(true)}
        onEditBudget={platform === "google" ? () => addToast("warning", "Esta acción no está disponible para Google Ads") : () => setShowBudgetModal(true)}
        onEditSpendCap={platform === "google" ? () => addToast("warning", "Esta acción no está disponible para Google Ads") : () => setShowSpendCapModal(true)}
        onDelete={platform === "google" ? () => addToast("warning", "Esta acción no está disponible para Google Ads") : handleDelete}
        onCreateRule={platform === "google" ? () => addToast("warning", "Esta acción no está disponible para Google Ads") : () => setShowRulesBuilder(true)}
        onManageRules={platform === "google" ? () => addToast("warning", "Esta acción no está disponible para Google Ads") : () => setShowRulesManager(true)}
        onImportBulk={platform === "google" ? () => addToast("warning", "Esta acción no está disponible para Google Ads") : () => setShowImportModal(true)}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        onExportPDF={() => { window.print(); addToast("info", "PDF: usando impresión del navegador"); }}
        onDownloadTemplate={handleDownloadTemplate}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BreakdownSelector
            selectedBreakdown={selectedBreakdown}
            onChange={setSelectedBreakdown}
          />
          <ColumnSelector
            columns={ALL_COLUMNS}
            selectedKeys={visibleColumns}
            onChange={handleColumnsChange}
          />
          <ColumnPresets currentColumns={visibleColumns} onApply={handleColumnsChange} />
        </div>
      </TableActionBar>
      </>
      )}
      </div>

      {/* ── TABLE CONTAINER ── */}
      {viewMode === "health" && !isEmbedded ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px 18px", minHeight: 0 }}>
          <AdsExecutiveSummary
            campaigns={campaigns}
            adsets={adsets}
            ads={ads}
            loading={loadingData}
            error={error}
            lastSynced={lastSynced}
            onOpenExpert={() => setViewMode("expert")}
            onRefresh={() => { fetchData(); setLastSynced(new Date()); }}
          />
        </div>
      ) : (
      <div style={{ position: "relative", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "4px 12px 0", minHeight: 0 }}>
        {loadingData && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(3,5,8,0.9)",
              backdropFilter: "blur(8px)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              padding: "48px 24px",
              gap: "16px",
              borderRadius: "8px",
            }}
          >
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} style={{ height: "40px", width: "100%", borderRadius: "4px" }} />
            ))}
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <span style={{ fontSize: "11px", color: "var(--cyan)", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
                ACTUALIZANDO HOLOCRÓN...
              </span>
            </div>
          </div>
        )}

        <AdsManagerTable
          level={activeLevel}
          data={filteredData}
          selectedIds={selectedIds}
          visibleColumns={visibleColumns}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onUpdateStatus={handleUpdateStatus}
          onUpdateName={handleUpdateName}
          onUpdateBudget={handleUpdateBudget}
          onUpdateBidAmount={handleUpdateBid}
          onEdit={(item) => openEdit(activeLevel === "campaigns" ? "campaign" : activeLevel === "adsets" ? "adset" : "ad", item)}
          onRowClick={(item) => setDrawerItem(item)}
          breakdownData={breakdownData}
          selectedBreakdown={selectedBreakdown}
          emptyTitle={platform === "google" && activeLevel !== "campaigns" ? "Próximamente" : undefined}
          emptyDescription={platform === "google" && activeLevel !== "campaigns" ? `La cobertura de ${activeLevel === "adsets" ? "grupos de anuncios (Ad Groups)" : "anuncios (Ads)"} para Google Ads estará disponible en una versión futura. Por ahora, puedes gestionar todas tus campañas desde la pestaña de Campañas.` : undefined}
        />
      </div>
      )}

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onAction={handleBulkAction}
      />

      {/* ── EDIT MODALS ── */}
      {editModal?.type === "campaign" && (
        <EditCampaignModal
          campaign={editModal.item}
          onClose={closeEdit}
          onSaved={handleEditSaved}
        />
      )}
      {editModal?.type === "adset" && (
        <EditAdSetModal
          adset={editModal.item}
          onClose={closeEdit}
          onSaved={handleEditSaved}
        />
      )}
      {editModal?.type === "ad" && (
        <EditAdModal
          ad={editModal.item}
          adAccountId={selectedAccountId}
          onClose={closeEdit}
          onSaved={handleEditSaved}
        />
      )}

      {/* ── CAMPAIGN DRAWER ── */}
      {drawerItem && (
        <CampaignDrawer
          item={drawerItem}
          level={activeLevel}
          onClose={() => setDrawerItem(null)}
          onEdit={(item) => {
            setDrawerItem(null);
            openEdit(activeLevel === "campaigns" ? "campaign" : activeLevel === "adsets" ? "adset" : "ad", item);
          }}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* ── MODALS ── */}
      {showClipboardModal && (
        <ClipboardModal onClose={() => setShowClipboardModal(false)} onPaste={handlePaste} />
      )}
      {showRenameModal && (
        <BulkRenameModal
          items={selectedIds.map((id) => { const item = getCurrentData().find((d: any) => d.id === id); return { id, name: item?.name || id }; })}
          onClose={() => setShowRenameModal(false)}
          onApply={handleBulkRename}
        />
      )}
      {showBudgetModal && (
        <BulkBudgetModal
          items={selectedIds.map((id) => { const item = getCurrentData().find((d: any) => d.id === id); return { id, name: item?.name || id, daily_budget: item?.daily_budget, lifetime_budget: item?.lifetime_budget }; })}
          onClose={() => setShowBudgetModal(false)}
          onApply={handleBulkBudget}
        />
      )}
      {showSpendCapModal && (
        <SpendCapModal
          items={selectedIds.map((id) => { const item = getCurrentData().find((d: any) => d.id === id); return { id, name: item?.name || id, spend_cap: item?.spend_cap }; })}
          onClose={() => setShowSpendCapModal(false)}
          onApply={handleSpendCap}
        />
      )}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          variant={confirmAction.variant}
          confirmLabel="Confirmar"
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {showRulesBuilder && (
        <RulesBuilderModal
          adAccountId={selectedAccountId}
          onClose={() => setShowRulesBuilder(false)}
          onCreated={() => { addToast("success", "✅ Regla creada exitosamente"); setShowRulesBuilder(false); }}
        />
      )}
      {showRulesManager && (
        <RulesManagerModal
          adAccountId={selectedAccountId}
          onClose={() => setShowRulesManager(false)}
        />
      )}
      {showImportModal && (
        <ImportModal
          adAccountId={selectedAccountId}
          level={activeLevel}
          onClose={() => setShowImportModal(false)}
          onImported={() => { fetchData(); addToast("success", "✅ Importación completada"); }}
        />
      )}

      {/* ── CREATE CAMPAIGN ── */}
      {showCreateCampaign && selectedAccountId && selectedAccountId !== "all" && (
        <CreateCampaignModal
          adAccountId={selectedAccountId}
          adAccountName={accounts.find((a: any) => a.id === selectedAccountId)?.name?.split(" — ")[0]}
          onClose={() => setShowCreateCampaign(false)}
          onCreated={() => {
            setShowCreateCampaign(false);
            addToast("success", "✅ Campaña creada en pausa");
            setActiveLevel("campaigns");
            fetchData();
          }}
        />
      )}

      {/* ── CREATE AD SET ── */}
      {showCreateAdSet && selectedAccountId && selectedAccountId !== "all" && (
        <CreateAdSetModal
          adAccountId={selectedAccountId}
          campaigns={campaigns.map((c: any) => ({ id: c.id, name: c.name, objective: c.objective }))}
          onClose={() => setShowCreateAdSet(false)}
          onCreated={() => {
            setShowCreateAdSet(false);
            addToast("success", "✅ Conjunto creado en pausa");
            setActiveLevel("adsets");
            fetchData();
          }}
        />
      )}

      {/* ── TOAST CONTAINER ── */}
    </div>
  );
}

// AlertsCenter wrapper that uses the hook
function AlertsCenterConnected({ data, level }: { data: any[]; level: "campaigns" | "adsets" | "ads" }) {
  const alerts = useAlerts(data, level);
  return <AlertsCenter alerts={alerts} />;
}

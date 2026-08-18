"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock3,
  Inbox,
  Megaphone,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { openConnectPopup } from "@/lib/connect-popup";

type ModuleKey =
  | "publisher_facebook"
  | "publisher_instagram"
  | "ads"
  | "analytics"
  | "community"
  | "social";

type ModuleStatus = {
  connected?: boolean;
  provider?: string;
  pages?: MetaPageAsset[];
  connectedAt?: string | null;
  expiresAt?: string | null;
  error?: string | null;
};

type MetaPageAsset = {
  id?: string;
  instagramId?: string;
  instagram_business_account?: {
    id?: string;
  };
} & Record<string, unknown>;

type ConnectStatusResponse = {
  modules?: Partial<Record<ModuleKey, ModuleStatus>>;
};

const MODULES: Array<{
  key: ModuleKey;
  title: string;
  description: string;
  icon: typeof Megaphone;
  color: string;
  nextStep: string;
}> = [
  {
    key: "publisher_facebook",
    title: "Publisher Facebook",
    description: "Posts, media y page tokens para publicar.",
    icon: Zap,
    color: "var(--fc-warning)",
    nextStep: "Conectar Facebook",
  },
  {
    key: "publisher_instagram",
    title: "Publisher Instagram",
    description: "IG business account, Reels, Stories y carruseles.",
    icon: Zap,
    color: "#bc5fb2",
    nextStep: "Conectar Instagram",
  },
  {
    key: "ads",
    title: "Ads",
    description: "Ad accounts, campañas, reglas y cambios controlados.",
    icon: Megaphone,
    color: "#0081FB",
    nextStep: "Conectar Ads",
  },
  {
    key: "analytics",
    title: "Analytics",
    description: "Insights orgánicos, paid y reportes de cliente.",
    icon: BarChart3,
    color: "var(--fc-module-aria)",
    nextStep: "Conectar Analytics",
  },
  {
    key: "community",
    title: "Community",
    description: "Inbox, comentarios, mensajes y webhooks.",
    icon: Inbox,
    color: "var(--fc-module-aria)",
    nextStep: "Conectar Community",
  },
  {
    key: "social",
    title: "Social",
    description: "Lectura de perfiles, páginas y contenido social.",
    icon: ShieldCheck,
    color: "var(--fc-success)",
    nextStep: "Conectar Social",
  },
];

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha registrada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha registrada";
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function collectAssetCount(module?: ModuleStatus) {
  const pages = module?.pages || [];
  const instagramAccounts = pages.filter((page) => page.instagramId || page.instagram_business_account?.id);
  return {
    pages: pages.length,
    instagram: instagramAccounts.length,
  };
}

export function MetaConnectionHealthCenter() {
  const [status, setStatus] = useState<ConnectStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/connect/status", { cache: "no-store" });
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ modules: {} });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStatus();
  }, [loadStatus]);

  const summary = useMemo(() => {
    const modules = status?.modules || {};
    const connected = MODULES.filter((module) => modules[module.key]?.connected).length;
    const attention = MODULES.length - connected;
    return { connected, attention, total: MODULES.length };
  }, [status]);

  return (
    <section className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: "1px solid var(--hairline)",
          background: "var(--row-hover)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--fc-surface)",
              border: "1px solid rgba(0,129,251,0.24)",
              color: "var(--fc-accent)",
              flexShrink: 0,
            }}
          >
            <PlugZap style={{ width: 17, height: 17 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--fc-text)" }}>
              Centro de salud Meta
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--fc-text-secondary)" }}>
              Permisos, activos y estado operativo por modulo antes de publicar, responder o tocar Ads.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: "var(--fc-text-secondary)" }}>
            <strong style={{ color: "var(--fc-text)" }}>{summary.connected}</strong>/{summary.total} sanos
          </div>
          <button
            onClick={loadStatus}
            disabled={refreshing}
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "7px 12px",
              fontSize: 11,
            }}
          >
            <RefreshCw style={{ width: 13, height: 13, animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            Revisar
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 1,
          background: "var(--surface-hover)",
        }}
      >
        {MODULES.map((module) => {
          const mod = status?.modules?.[module.key];
          const connected = Boolean(mod?.connected);
          const assets = collectAssetCount(mod);
          const Icon = module.icon;

          return (
            <div key={module.key} style={{ padding: 16, background: "var(--bg-raised)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: module.color,
                    background: `${module.color}18`,
                    border: `1px solid ${module.color}33`,
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ width: 16, height: 16 }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 13, color: "var(--fc-text)", fontWeight: 700 }}>
                      {module.title}
                    </h3>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        color: connected ? "var(--fc-success)" : "var(--fc-warning)",
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {connected ? <CheckCircle style={{ width: 12, height: 12 }} /> : <AlertTriangle style={{ width: 12, height: 12 }} />}
                      {connected ? "Sano" : "Requiere accion"}
                    </span>
                  </div>

                  <p style={{ margin: "5px 0 10px", fontSize: 12, lineHeight: 1.45, color: "var(--fc-text-secondary)" }}>
                    {module.description}
                  </p>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    <span className={connected ? "badge badge-emerald" : "badge badge-amber"}>
                      {connected ? "Conectado" : "Pendiente"}
                    </span>
                    {assets.pages > 0 && <span className="badge badge-muted">{assets.pages} paginas</span>}
                    {assets.instagram > 0 && <span className="badge badge-muted">{assets.instagram} IG</span>}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fc-text-muted)", fontSize: 11 }}>
                    <Clock3 style={{ width: 12, height: 12 }} />
                    {connected ? `Desde ${formatDate(mod?.connectedAt)}` : "Sin conexion activa"}
                  </div>

                  {!connected && (
                    <button
                      onClick={() => openConnectPopup(module.key, loadStatus)}
                      style={{
                        marginTop: 12,
                        padding: "7px 11px",
                        borderRadius: 6,
                        border: `1px solid ${module.color}44`,
                        background: `${module.color}14`,
                        color: module.color,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {module.nextStep}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && summary.attention > 0 && (
        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--hairline)", color: "var(--fc-warning)", fontSize: 12 }}>
          Hay {summary.attention} modulo{summary.attention === 1 ? "" : "s"} que pueden bloquear flujos. Conecta solo lo necesario para el trabajo de este cliente.
        </div>
      )}
    </section>
  );
}

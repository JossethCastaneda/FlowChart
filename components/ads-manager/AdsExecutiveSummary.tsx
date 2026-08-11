"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, DollarSign, MousePointerClick, RefreshCw, ShieldAlert, TrendingUp } from "lucide-react";
import { calcROAS } from "@/lib/ads-metrics";

interface AdsExecutiveSummaryProps {
  campaigns: AdEntity[];
  adsets: AdEntity[];
  ads: AdEntity[];
  loading: boolean;
  error: string | null;
  lastSynced: Date | null;
  onOpenExpert: () => void;
  onRefresh: () => void;
}

type InsightValue = string | number | null | undefined;
type InsightBag = Record<string, InsightValue | unknown[] | undefined>;
type AdEntity = {
  id?: string;
  status?: string;
  effective_status?: string;
  learning_phase?: string;
  insights?: InsightBag;
};

const num = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
};

const int = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

function sumInsight(items: AdEntity[], key: string) {
  return items.reduce((total, item) => total + num(item?.insights?.[key]), 0);
}

function formatMoney(value: number) {
  return value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

function formatCompact(value: number) {
  return value.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

function getStatus(item: AdEntity) {
  return item?.effective_status || item?.status || "";
}

function getWarnings(campaigns: AdEntity[], adsets: AdEntity[], ads: AdEntity[]) {
  const warnings: Array<{ title: string; description: string; level: "high" | "medium" | "low" }> = [];
  const all = [...campaigns, ...adsets, ...ads];
  const activeCampaigns = campaigns.filter((item) => getStatus(item) === "ACTIVE");
  // Only flag campaigns that are truly not delivering (no impressions either).
  // spend=0 alone is normal for new campaigns or short date ranges.
  const noSpendActive = activeCampaigns.filter(
    (item) => num(item?.insights?.spend) === 0 && int(item?.insights?.impressions) === 0
  );
  const highFrequency = all.filter((item) => num(item?.insights?.frequency) >= 4);
  const weakCtr = all.filter((item) => num(item?.insights?.ctr) > 0 && num(item?.insights?.ctr) < 0.7);
  const learning = adsets.filter((item) => String(item?.learning_phase || "").toLowerCase().includes("learning"));

  if (noSpendActive.length > 0) {
    warnings.push({
      title: `${noSpendActive.length} campana${noSpendActive.length === 1 ? "" : "s"} activa${noSpendActive.length === 1 ? "" : "s"} sin gasto`,
      description: "Revisa entrega, presupuesto, audiencia o aprobacion antes de escalar.",
      level: "high",
    });
  }
  if (highFrequency.length > 0) {
    warnings.push({
      title: `${highFrequency.length} elemento${highFrequency.length === 1 ? "" : "s"} con frecuencia alta`,
      description: "Puede haber fatiga creativa o saturacion de audiencia.",
      level: "medium",
    });
  }
  if (weakCtr.length > 0) {
    warnings.push({
      title: `${weakCtr.length} elemento${weakCtr.length === 1 ? "" : "s"} con CTR bajo`,
      description: "Prioriza revisar gancho creativo, oferta y segmentacion.",
      level: "medium",
    });
  }
  if (learning.length > 0) {
    warnings.push({
      title: `${learning.length} ad set${learning.length === 1 ? "" : "s"} en aprendizaje`,
      description: "Evita cambios innecesarios hasta tener volumen suficiente.",
      level: "low",
    });
  }
  return warnings;
}

export function AdsExecutiveSummary({
  campaigns,
  adsets,
  ads,
  loading,
  error,
  lastSynced,
  onOpenExpert,
  onRefresh,
}: AdsExecutiveSummaryProps) {
  const spend = sumInsight(campaigns, "spend");
  const impressions = campaigns.reduce((total, item) => total + int(item?.insights?.impressions), 0);
  const clicks = campaigns.reduce((total, item) => total + int(item?.insights?.clicks), 0);
  const roasValues = campaigns.map((item) => calcROAS(item?.insights || {})).filter((value) => value > 0);
  const avgRoas = roasValues.length ? roasValues.reduce((a, b) => a + b, 0) / roasValues.length : 0;
  const warnings = getWarnings(campaigns, adsets, ads);
  const activeCount = campaigns.filter((item) => getStatus(item) === "ACTIVE").length;
  const pausedCount = campaigns.filter((item) => getStatus(item) === "PAUSED").length;

  const cards = [
    { label: "Gasto", value: formatMoney(spend), icon: DollarSign, color: "var(--fc-success)" },
    { label: "ROAS promedio", value: avgRoas ? `${avgRoas.toFixed(2)}x` : "Sin datos", icon: TrendingUp, color: "var(--fc-accent)" },
    { label: "Clics", value: formatCompact(clicks), icon: MousePointerClick, color: "var(--fc-warning)" },
    { label: "Impresiones", value: formatCompact(impressions), icon: RefreshCw, color: "var(--fc-module-aria)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        className="glass-panel"
        style={{
          padding: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "var(--fc-text)", fontSize: 18, fontWeight: 700 }}>
            Salud de Ads
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--fc-text-secondary)", fontSize: 12 }}>
            Vista ejecutiva para decidir si conviene optimizar, pausar, revisar o abrir la tabla experta.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, color: "var(--fc-text-muted)", fontSize: 11 }}>
            <Clock3 style={{ width: 12, height: 12 }} />
            {lastSynced ? `Ultima sync: ${lastSynced.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}` : "Aun sin sync"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-primary" onClick={onRefresh} disabled={loading} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <RefreshCw style={{ width: 13, height: 13, animation: loading ? "spin 1s linear infinite" : "none" }} />
            Actualizar
          </button>
          <button
            onClick={onOpenExpert}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 6,
              border: "1px solid var(--hairline)",
              background: "var(--surface-hover)",
              color: "var(--fc-text)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Abrir tabla experta
            <ArrowRight style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: "flex", gap: 10, padding: 12, borderRadius: 8, border: "1px solid rgba(229,72,77,0.25)", background: "var(--fc-danger-wash)", color: "var(--fc-danger)", fontSize: 12 }}>
          <ShieldAlert style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="kpi-card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--fc-text-secondary)", fontWeight: 600 }}>{card.label}</div>
                  <div style={{ marginTop: 8, fontSize: 24, color: "var(--fc-text)", fontWeight: 800 }}>{card.value}</div>
                </div>
                <Icon style={{ width: 22, height: 22, color: card.color }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)", gap: 12 }}>
        <div className="glass-panel" style={{ padding: 18 }}>
          <h3 style={{ margin: 0, color: "var(--fc-text)", fontSize: 14, fontWeight: 700 }}>
            Riesgos detectados
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {warnings.length === 0 ? (
              <div style={{ display: "flex", gap: 9, color: "var(--fc-success)", fontSize: 12, alignItems: "center" }}>
                <CheckCircle2 style={{ width: 15, height: 15 }} />
                No hay alertas obvias en los datos cargados.
              </div>
            ) : (
              warnings.map((warning) => (
                <div key={warning.title} style={{ display: "flex", gap: 10, padding: 10, borderRadius: 8, background: "var(--surface-hover)", border: "1px solid var(--fc-border)" }}>
                  <AlertTriangle
                    style={{
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      color: warning.level === "high" ? "var(--fc-danger)" : warning.level === "medium" ? "var(--fc-warning)" : "var(--fc-accent)",
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 12, color: "var(--fc-text)", fontWeight: 700 }}>{warning.title}</div>
                    <div style={{ fontSize: 11, color: "var(--fc-text-secondary)", marginTop: 2 }}>{warning.description}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 18 }}>
          <h3 style={{ margin: 0, color: "var(--fc-text)", fontSize: 14, fontWeight: 700 }}>
            Estado operativo
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            {[
              ["Campanas", campaigns.length],
              ["Activas", activeCount],
              ["Pausadas", pausedCount],
              ["Ad sets", adsets.length],
              ["Anuncios", ads.length],
              ["Alertas", warnings.length],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: 10, borderRadius: 8, background: "var(--surface-hover)", border: "1px solid var(--fc-border)" }}>
                <div style={{ fontSize: 10, color: "var(--fc-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
                <div style={{ marginTop: 5, fontSize: 20, color: "var(--fc-text)", fontWeight: 800 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

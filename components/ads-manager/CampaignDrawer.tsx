"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, ExternalLink, Pause, Play, Copy, Pencil, TrendingUp, TrendingDown, Zap, BarChart3, Users, Smartphone, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from "recharts";
import { OBJECTIVE_MAP, SW_STATUS, LEARNING_PHASE_MAP, calcROAS, calcCPA, findActionValue, isAdvantagePlus, fmtROAS } from "@/lib/ads-metrics";
import { AIAnalysisPanel } from "./AIAnalysisPanel";

interface CampaignDrawerProps {
  item: any;
  level: "campaigns" | "adsets" | "ads";
  onClose: () => void;
  onEdit: (item: any) => void;
  onUpdateStatus: (id: string, status: "ACTIVE" | "PAUSED") => Promise<boolean>;
}

const fmt$ = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n: number) => n.toLocaleString();
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

type ChartMetric = "spend" | "results" | "roas" | "impressions" | "clicks" | "ctr";
type BreakdownTab = "time" | "age_gender" | "platform" | "device";

export function CampaignDrawer({ item, level, onClose, onEdit, onUpdateStatus }: CampaignDrawerProps) {
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [breakdownData, setBreakdownData] = useState<any[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [chartMetric, setChartMetric] = useState<ChartMetric>("spend");
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>("time");
  const [statusLoading, setStatusLoading] = useState(false);

  const ins = item.insights || {};
  const roas = calcROAS(ins);
  const cpa = calcCPA(ins, item.objective);
  const resultsCount = findActionValue(ins.actions, "onsite_conversion.messaging_conversation_started_7d")
    || findActionValue(ins.actions, "lead")
    || findActionValue(ins.actions, "omni_purchase")
    || findActionValue(ins.actions, "purchase")
    || findActionValue(ins.actions, "link_click");
  const objInfo = OBJECTIVE_MAP[item.objective] || null;
  const swStatus = SW_STATUS[item.effective_status || item.status] || SW_STATUS[item.status] || { label: item.status, color: "#6b7280" };
  const isActive = item.status === "ACTIVE";
  const advPlus = isAdvantagePlus(item);
  const learningMapped = LEARNING_PHASE_MAP[item.learning_phase_info?.status || ""] || null;

  // Fetch daily insights
  useEffect(() => {
    setLoadingDaily(true);
    fetch(`/api/meta/insights-daily?id=${item.id}&level=${level.slice(0, -1)}&days=30`)
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          const processed = data.data.map((d: any) => {
            const results = findActionValue(d.actions, "onsite_conversion.messaging_conversation_started_7d")
              || findActionValue(d.actions, "lead")
              || findActionValue(d.actions, "omni_purchase")
              || findActionValue(d.actions, "link_click");
            const roasVal = d.purchase_roas?.[0]?.value ? parseFloat(d.purchase_roas[0].value) : (d.spend > 0 ? findActionValue(d.action_values, "omni_purchase") / d.spend : 0);
            return {
              date: d.date?.slice(5) || "",
              spend: d.spend,
              impressions: d.impressions,
              clicks: d.clicks,
              ctr: d.ctr,
              results,
              roas: roasVal,
            };
          });
          setDailyData(processed);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDaily(false));
  }, [item.id, level]);

  // Fetch breakdown data when tab changes
  useEffect(() => {
    if (breakdownTab === "time") return;
    setLoadingBreakdown(true);
    const breakdownMap: Record<string, string> = {
      age_gender: "age,gender",
      platform: "publisher_platform",
      device: "impression_device",
    };
    fetch(`/api/meta/breakdowns?id=${item.id}&breakdown=${breakdownMap[breakdownTab]}`)
      .then(res => res.json())
      .then(data => {
        if (data.data) setBreakdownData(data.data);
      })
      .catch(() => {})
      .finally(() => setLoadingBreakdown(false));
  }, [breakdownTab, item.id]);

  const handleStatusToggle = async () => {
    setStatusLoading(true);
    await onUpdateStatus(item.id, isActive ? "PAUSED" : "ACTIVE");
    setStatusLoading(false);
  };

  const chartColors: Record<ChartMetric, string> = {
    spend: "#22d3ee",
    results: "#34d399",
    roas: "#fbbf24",
    impressions: "#a78bfa",
    clicks: "#60a5fa",
    ctr: "#f472b6",
  };

  const metricButtons: { key: ChartMetric; label: string }[] = [
    { key: "spend", label: "Gasto" },
    { key: "results", label: "Resultados" },
    { key: "roas", label: "ROAS" },
    { key: "impressions", label: "Impresiones" },
    { key: "clicks", label: "Clics" },
    { key: "ctr", label: "CTR" },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 80,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "440px", maxWidth: "100vw", zIndex: 90,
          background: "rgba(6,10,22,0.98)", backdropFilter: "blur(16px)",
          borderLeft: "1px solid rgba(0,212,255,0.12)",
          display: "flex", flexDirection: "column",
          animation: "slideInRight 0.25s ease-out",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "20px", borderBottom: "1px solid var(--border)",
          background: "rgba(4,8,18,0.8)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "white", marginBottom: "6px", lineHeight: "1.3" }}>
                {item.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "8px", fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                  background: `${swStatus.color}20`, color: swStatus.color,
                  border: `1px solid ${swStatus.color}30`,
                  letterSpacing: "0.05em",
                }}>
                  {swStatus.label}
                </span>
                {objInfo && (
                  <span style={{
                    fontSize: "8px", fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                    background: `${objInfo.color}15`, color: objInfo.color,
                  }}>
                    {objInfo.icon} {objInfo.label}
                  </span>
                )}
                {advPlus && (
                  <span style={{
                    fontSize: "8px", fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                    background: "rgba(168,85,247,0.15)", color: "#c084fc",
                  }}>
                    ⚡ ADV+
                  </span>
                )}
                {learningMapped && (
                  <span style={{
                    fontSize: "8px", fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                    background: `${learningMapped.color}15`, color: learningMapped.color,
                  }}>
                    {learningMapped.swLabel}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "9px", color: "rgba(148,163,184,0.4)", marginTop: "6px" }}>
                ID: {item.id}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px", color: "rgba(148,163,184,0.6)", cursor: "pointer",
                width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(148,163,184,0.6)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
            <button
              onClick={handleStatusToggle}
              disabled={statusLoading}
              style={{
                display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px",
                fontSize: "10px", fontWeight: 600, borderRadius: "5px", cursor: "pointer",
                background: isActive ? "rgba(251,191,36,0.1)" : "rgba(52,211,153,0.1)",
                border: `1px solid ${isActive ? "rgba(251,191,36,0.25)" : "rgba(52,211,153,0.25)"}`,
                color: isActive ? "#fbbf24" : "#34d399",
              }}
            >
              {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isActive ? "Pausar" : "Activar"}
            </button>
            <button
              onClick={() => onEdit(item)}
              style={{
                display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px",
                fontSize: "10px", fontWeight: 600, borderRadius: "5px", cursor: "pointer",
                background: "rgba(0,129,251,0.1)", border: "1px solid rgba(0,129,251,0.25)",
                color: "var(--cyan)",
              }}
            >
              <Pencil className="w-3 h-3" /> Editar
            </button>
            <a
              href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${item.campaign_id || item.id}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px",
                fontSize: "10px", fontWeight: 600, borderRadius: "5px", cursor: "pointer",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(148,163,184,0.7)", textDecoration: "none",
              }}
            >
              <ExternalLink className="w-3 h-3" /> Meta
            </a>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {/* KPIs Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
            {[
              { label: "Gasto Total", value: fmt$(ins.spend || 0), color: "#22d3ee", icon: "💰" },
              { label: "ROAS", value: roas > 0 ? fmtROAS(roas) : "—", color: roas >= 3 ? "#34d399" : roas >= 1 ? "#fbbf24" : "#ef4444", icon: "📈" },
              { label: "Resultados", value: fmtNum(resultsCount), color: "#a78bfa", icon: "🎯" },
              { label: cpa.label, value: cpa.value > 0 ? fmt$(cpa.value) : "—", color: "#f472b6", icon: "💲" },
            ].map((kpi, i) => (
              <div key={i} style={{
                padding: "14px", borderRadius: "8px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: "9px", color: "rgba(148,163,184,0.5)", marginBottom: "6px", letterSpacing: "0.05em", fontWeight: 600 }}>
                  {kpi.icon} {kpi.label}
                </div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: kpi.color, letterSpacing: "-0.02em" }}>
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>

          {/* Secondary KPIs */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "20px",
          }}>
            {[
              { label: "Impresiones", value: fmtNum(ins.impressions || 0) },
              { label: "Alcance", value: fmtNum(ins.reach || 0) },
              { label: "Clics", value: fmtNum(ins.clicks || 0) },
              { label: "CTR", value: fmtPct(ins.ctr || 0) },
              { label: "CPC", value: fmt$(ins.cpc || 0) },
              { label: "CPM", value: fmt$(ins.cpm || 0) },
            ].map((m, i) => (
              <div key={i} style={{
                padding: "10px", borderRadius: "6px",
                background: "rgba(255,255,255,0.015)",
                border: "1px solid rgba(255,255,255,0.04)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "8px", color: "rgba(148,163,184,0.4)", marginBottom: "3px", fontWeight: 600, letterSpacing: "0.04em" }}>
                  {m.label}
                </div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Chart section ── */}
          <div style={{
            marginBottom: "20px", padding: "16px", borderRadius: "8px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            {/* Breakdown tabs */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
              {([
                { key: "time" as BreakdownTab, label: "Tendencia", icon: <TrendingUp className="w-3 h-3" /> },
                { key: "age_gender" as BreakdownTab, label: "Edad/Género", icon: <Users className="w-3 h-3" /> },
                { key: "platform" as BreakdownTab, label: "Plataforma", icon: <BarChart3 className="w-3 h-3" /> },
                { key: "device" as BreakdownTab, label: "Dispositivo", icon: <Smartphone className="w-3 h-3" /> },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setBreakdownTab(tab.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: "3px",
                    padding: "4px 8px", fontSize: "9px", fontWeight: 600,
                    borderRadius: "4px", cursor: "pointer",
                    background: breakdownTab === tab.key ? "rgba(0,212,255,0.1)" : "transparent",
                    border: `1px solid ${breakdownTab === tab.key ? "rgba(0,212,255,0.2)" : "transparent"}`,
                    color: breakdownTab === tab.key ? "var(--cyan)" : "rgba(148,163,184,0.5)",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {breakdownTab === "time" && (
              <>
                {/* Metric selector */}
                <div style={{ display: "flex", gap: "4px", marginBottom: "10px", flexWrap: "wrap" }}>
                  {metricButtons.map(mb => (
                    <button
                      key={mb.key}
                      onClick={() => setChartMetric(mb.key)}
                      style={{
                        padding: "3px 8px", fontSize: "9px", fontWeight: 600,
                        borderRadius: "10px", cursor: "pointer",
                        background: chartMetric === mb.key ? `${chartColors[mb.key]}20` : "transparent",
                        border: `1px solid ${chartMetric === mb.key ? `${chartColors[mb.key]}40` : "rgba(148,163,184,0.1)"}`,
                        color: chartMetric === mb.key ? chartColors[mb.key] : "rgba(148,163,184,0.4)",
                        transition: "all 0.15s",
                      }}
                    >
                      {mb.label}
                    </button>
                  ))}
                </div>

                {loadingDaily ? (
                  <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(148,163,184,0.3)", fontSize: "11px" }}>
                    Cargando datos de tendencia...
                  </div>
                ) : dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={dailyData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 8, fill: "rgba(148,163,184,0.4)" }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 8, fill: "rgba(148,163,184,0.4)" }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(6,10,22,0.95)", border: "1px solid rgba(0,212,255,0.15)",
                          borderRadius: "6px", fontSize: "10px", color: "white",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey={chartMetric}
                        stroke={chartColors[chartMetric]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3, fill: chartColors[chartMetric] }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(148,163,184,0.3)", fontSize: "11px" }}>
                    Sin datos de tendencia para este período
                  </div>
                )}
              </>
            )}

            {breakdownTab !== "time" && (
              <>
                {loadingBreakdown ? (
                  <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(148,163,184,0.3)", fontSize: "11px" }}>
                    Cargando breakdown...
                  </div>
                ) : breakdownData.length > 0 ? (
                  <div style={{ maxHeight: 200, overflowY: "auto" }} className="custom-scrollbar">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <th style={{ padding: "6px 8px", textAlign: "left", color: "rgba(148,163,184,0.5)", fontWeight: 700 }}>Segmento</th>
                          <th style={{ padding: "6px 8px", textAlign: "right", color: "rgba(148,163,184,0.5)", fontWeight: 700 }}>Gasto</th>
                          <th style={{ padding: "6px 8px", textAlign: "right", color: "rgba(148,163,184,0.5)", fontWeight: 700 }}>Clics</th>
                          <th style={{ padding: "6px 8px", textAlign: "right", color: "rgba(148,163,184,0.5)", fontWeight: 700 }}>CTR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdownData.map((row: any, idx: number) => {
                          const segLabel = breakdownTab === "age_gender"
                            ? `${row.age || "?"} / ${row.gender || "?"}`
                            : breakdownTab === "platform"
                            ? row.publisher_platform || "?"
                            : row.impression_device || "?";
                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                              <td style={{ padding: "6px 8px", color: "rgba(255,255,255,0.8)" }}>{segLabel}</td>
                              <td style={{ padding: "6px 8px", textAlign: "right", color: "#22d3ee" }}>{fmt$(row.spend)}</td>
                              <td style={{ padding: "6px 8px", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{fmtNum(row.clicks)}</td>
                              <td style={{ padding: "6px 8px", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{fmtPct(row.ctr)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(148,163,184,0.3)", fontSize: "11px" }}>
                    Sin datos de breakdown disponibles
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── AI Analysis Panel ── */}
          <AIAnalysisPanel item={item} level={level} />
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.5; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

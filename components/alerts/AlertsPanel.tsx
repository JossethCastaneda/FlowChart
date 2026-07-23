"use client";
import React, { useState } from "react";
import { AlertTriangle, Info, AlertCircle, CheckCircle, X, Trash2, CheckCheck, Bell, BellOff, Filter } from "lucide-react";
import { useAlertsStore, type ZefirusAlert, type AlertSeverity } from "@/stores/alertsStore";

const SEVERITY_CONFIG: Record<AlertSeverity, {
  bg: string; border: string; text: string; label: string; icon: React.FC<{ size?: number; style?: React.CSSProperties }>;
}> = {
  danger:  { bg: "rgba(226,68,92,0.06)", border: "rgba(226,68,92,0.2)", text: "var(--red)",     label: "Critico",       icon: AlertCircle },
  warning: { bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.2)", text: "var(--amber)",  label: "Advertencia", icon: AlertTriangle },
  info:    { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.2)", text: "var(--cyan)",   label: "Info",        icon: Info },
  success: { bg: "rgba(0,200,117,0.06)",  border: "rgba(0,200,117,0.2)",  text: "var(--emerald)", label: "Exito",      icon: CheckCircle },
};

type FilterType = "all" | AlertSeverity;

export default function AlertsPanel() {
  const { alerts, unreadCount, soundEnabled, markRead, markAllRead, dismiss, clearAll, toggleSound } = useAlertsStore();
  const [filter, setFilter] = useState<FilterType>("all");
  const [showRead, setShowRead] = useState(true);

  const filtered = alerts.filter(a => {
    if (!showRead && a.read) return false;
    if (filter !== "all" && a.severity !== filter) return false;
    if (a.dismissed) return false;
    return true;
  });

  const counts = {
    all: alerts.filter(a => !a.dismissed).length,
    danger: alerts.filter(a => a.severity === "danger" && !a.dismissed).length,
    warning: alerts.filter(a => a.severity === "warning" && !a.dismissed).length,
    info: alerts.filter(a => a.severity === "info" && !a.dismissed).length,
    success: alerts.filter(a => a.severity === "success" && !a.dismissed).length,
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Ahora";
    if (diffMin < 60) return `Hace ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Hace ${diffH}h`;
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: active ? 700 : 500,
    background: active ? "var(--surface-hover)" : "transparent",
    color: active ? "var(--foreground)" : "var(--text-muted)",
    border: active ? "1px solid var(--border)" : "1px solid transparent",
    cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            Centro de Alertas
          </h2>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al dia"}
            {" "} - {counts.all} total
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Silenciar alertas" : "Activar sonido"}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
              color: soundEnabled ? "var(--emerald)" : "var(--text-muted)",
              background: "var(--surface-hover)", border: "1px solid var(--border)",
              cursor: "pointer",
            }}
          >
            {soundEnabled ? <Bell size={11} /> : <BellOff size={11} />}
            {soundEnabled ? "Sonido ON" : "Sonido OFF"}
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
              color: "var(--cyan)", background: "var(--surface-hover)",
              border: "1px solid var(--border)", cursor: "pointer",
            }}>
              <CheckCheck size={11} /> Marcar todo leido
            </button>
          )}
          {counts.all > 0 && (
            <button onClick={clearAll} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
              color: "var(--red)", background: "var(--surface-hover)",
              border: "1px solid var(--border)", cursor: "pointer",
            }}>
              <Trash2 size={11} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        <Filter size={11} style={{ color: "var(--text-muted)", marginRight: 4 }} />
        <button onClick={() => setFilter("all")} style={filterBtnStyle(filter === "all")}>
          Todas ({counts.all})
        </button>
        <button onClick={() => setFilter("danger")} style={{ ...filterBtnStyle(filter === "danger"), color: filter === "danger" ? "var(--red)" : undefined }}>
          Criticas ({counts.danger})
        </button>
        <button onClick={() => setFilter("warning")} style={{ ...filterBtnStyle(filter === "warning"), color: filter === "warning" ? "var(--amber)" : undefined }}>
          Advertencias ({counts.warning})
        </button>
        <button onClick={() => setFilter("info")} style={{ ...filterBtnStyle(filter === "info"), color: filter === "info" ? "var(--cyan)" : undefined }}>
          Info ({counts.info})
        </button>
        <div style={{ flex: 1 }} />
        <label style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showRead}
            onChange={() => setShowRead(!showRead)}
            style={{ accentColor: "var(--cyan)" }}
          />
          Mostrar leidas
        </label>
      </div>

      {/* Alert List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.length === 0 && (
          <div style={{
            padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 12,
            background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)",
          }}>
            {counts.all === 0 ? "No hay alertas registradas" : "No hay alertas con este filtro"}
          </div>
        )}
        {filtered.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
          const Icon = config.icon;
          return (
            <div
              key={alert.id}
              onClick={() => { if (!alert.read) markRead(alert.id); }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 8,
                background: alert.read ? "var(--surface)" : config.bg,
                border: `1px solid ${alert.read ? "var(--border)" : config.border}`,
                cursor: alert.read ? "default" : "pointer",
                opacity: alert.read ? 0.7 : 1,
                transition: "all 0.15s",
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 2 }}>
                <Icon size={14} style={{ color: config.text }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: alert.read ? "var(--text-secondary)" : config.text, margin: 0 }}>
                    {alert.title}
                  </p>
                  {!alert.read && (
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: config.text, flexShrink: 0,
                    }} />
                  )}
                </div>
                {alert.message && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0", lineHeight: 1.4 }}>
                    {alert.message}
                  </p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{formatTime(alert.timestamp)}</span>
                  <span style={{
                    fontSize: 8, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
                    background: "var(--surface-hover)", color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>{alert.source}</span>
                  {alert.projectName && (
                    <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>{alert.projectName}</span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismiss(alert.id); }}
                style={{
                  background: "none", border: "none", padding: 4, cursor: "pointer",
                  color: "var(--text-muted)", flexShrink: 0,
                  opacity: 0.5, transition: "opacity 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.5"; }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

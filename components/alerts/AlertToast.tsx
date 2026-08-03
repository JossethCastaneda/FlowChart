"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { AlertTriangle, Info, AlertCircle, CheckCircle, X, Bell, BellOff, Activity } from "lucide-react";
import { useAlertsStore, type ZefirusAlert, type AlertSeverity } from "@/stores/alertsStore";
import AlertsPanel from "./AlertsPanel";

/* ── Toast Item ── */
interface ToastProps {
  alert: ZefirusAlert;
  onDismiss: (id: string) => void;
}

const SEVERITY_CONFIG: Record<AlertSeverity, {
  bg: string; border: string; text: string; icon: React.FC<{ size?: number; className?: string; color?: string }>;
}> = {
  danger:  { bg: "rgba(226,68,92,0.12)", border: "rgba(226,68,92,0.4)", text: "var(--red)",     icon: AlertCircle },
  warning: { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.4)", text: "var(--amber)",  icon: AlertTriangle },
  info:    { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.4)", text: "var(--cyan)",   icon: Info },
  success: { bg: "rgba(0,200,117,0.12)",  border: "rgba(0,200,117,0.4)",  text: "var(--emerald)", icon: CheckCircle },
};

function Toast({ alert, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(alert.id), 300);
    }, 6000);
    return () => clearTimeout(timer);
  }, [alert.id, onDismiss]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(alert.id), 300);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 10,
        background: config.bg,
        border: `1px solid ${config.border}`,
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
        maxWidth: 380,
        width: "100%",
        animation: isExiting ? "slideOut 0.3s ease forwards" : "slideIn 0.3s ease",
        transition: "all 0.3s ease",
        cursor: "pointer",
      }}
      onClick={handleClose}
    >
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        <Icon size={16} color={config.text} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: config.text, margin: 0, lineHeight: 1.3 }}>
          {alert.title}
        </p>
        {alert.message && (
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "3px 0 0", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {alert.message}
          </p>
        )}
        <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>
          {alert.source} - {new Date(alert.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        style={{
          background: "none", border: "none", padding: 2, cursor: "pointer",
          color: "var(--text-muted)", flexShrink: 0,
        }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

/* ── Toast Container (Global) ── */
export function AlertToastContainer() {
  const alerts = useAlertsStore((s) => s.alerts);
  const dismiss = useAlertsStore((s) => s.dismiss);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());

  // Watch for new alerts and show them as toasts
  useEffect(() => {
    const latest = alerts.filter(a => !a.dismissed && !a.read && !seenRef.current.has(a.id));
    if (latest.length > 0) {
      const newIds = new Set(visibleIds);
      latest.forEach(a => {
        newIds.add(a.id);
        seenRef.current.add(a.id);
      });
      setVisibleIds(newIds);
    }
  }, [alerts]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismiss = useCallback((id: string) => {
    setVisibleIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    dismiss(id);
  }, [dismiss]);

  const visible = alerts.filter(a => visibleIds.has(a.id)).slice(0, 5);
  if (visible.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "auto",
        }}
      >
        {visible.map(a => (
          <Toast key={a.id} alert={a} onDismiss={handleDismiss} />
        ))}
      </div>
    </>
  );
}

/* ── Alert Bell Button (for header/navbar) ── */
export function AlertBellButton() {
  const unreadCount = useAlertsStore((s) => s.unreadCount);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  const soundEnabled = useAlertsStore((s) => s.soundEnabled);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
  const toggleSound = useAlertsStore((s) => s.toggleSound);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div style={{ position: "relative" }} ref={containerRef}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          onClick={() => setOpen(!open)}
        style={{
          position: "relative",
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "6px 8px",
          cursor: "pointer",
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: 4,
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--foreground)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <Bell size={14} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            background: "var(--red)", color: "white",
            fontSize: 9, fontWeight: 700, borderRadius: "50%",
            minWidth: 16, height: 16, display: "flex",
            alignItems: "center", justifyContent: "center",
            padding: "0 4px",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      </div>

      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 8,
          width: 380,
          maxHeight: 500,
          overflowY: "auto",
          background: "var(--panel-bg)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "0 10px 40px var(--overlay-dark)",
          zIndex: 9999,
          padding: 16
        }}>
          <AlertsPanel />
        </div>
      )}
    </div>
  );
}

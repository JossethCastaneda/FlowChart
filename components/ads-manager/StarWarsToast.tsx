"use client";

import React, { useEffect, useState, useCallback } from "react";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { toStardate } from "@/lib/ads-metrics";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 5000
}

interface StarWarsToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4" />,
  error:   <AlertCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  info:    <Info className="w-4 h-4" />,
};

const COLORS: Record<ToastType, { border: string; glow: string; icon: string; bg: string }> = {
  success: { border: "#34d399", glow: "rgba(52,211,153,0.15)", icon: "#34d399", bg: "rgba(5,25,15,0.95)" },
  error:   { border: "#ef4444", glow: "rgba(239,68,68,0.15)", icon: "#ef4444", bg: "rgba(25,5,5,0.95)" },
  warning: { border: "#fbbf24", glow: "rgba(251,191,36,0.15)", icon: "#fbbf24", bg: "rgba(25,20,5,0.95)" },
  info:    { border: "#22d3ee", glow: "rgba(34,211,238,0.15)", icon: "#22d3ee", bg: "rgba(5,15,25,0.95)" },
};

const SW_TITLES: Record<ToastType, string> = {
  success: "⚡ Misión completada",
  error:   "💥 Alerta Imperial",
  warning: "⚠️ Sensor detectó anomalía",
  info:    "📡 Transmisión recibida",
};

function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const colors = COLORS[toast.type];

  return (
    <div
      style={{
        display: "flex", alignItems: "flex-start", gap: "10px",
        padding: "12px 14px",
        background: colors.bg,
        backdropFilter: "blur(12px)",
        border: `1px solid ${colors.border}40`,
        borderLeft: `3px solid ${colors.border}`,
        borderRadius: "8px",
        boxShadow: `0 8px 24px -4px rgba(0,0,0,0.6), 0 0 15px ${colors.glow}`,
        minWidth: "320px",
        maxWidth: "420px",
        opacity: visible && !exiting ? 1 : 0,
        transform: visible && !exiting ? "translateX(0)" : "translateX(20px)",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        pointerEvents: "auto",
      }}
    >
      <div style={{ color: colors.icon, flexShrink: 0, marginTop: "1px" }}>
        {ICONS[toast.type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "11.5px", fontWeight: 700,
          color: "white", letterSpacing: "0.03em",
          marginBottom: "3px",
        }}>
          {toast.title || SW_TITLES[toast.type]}
        </div>
        {toast.message && (
          <div style={{ fontSize: "10.5px", color: "rgba(148,163,184,0.75)", lineHeight: "1.4" }}>
            {toast.message}
          </div>
        )}
        <div style={{
          fontSize: "8.5px", color: "rgba(148,163,184,0.35)",
          marginTop: "4px", letterSpacing: "0.04em",
        }}>
          {toStardate()}
        </div>
      </div>
      <button
        onClick={() => {
          setExiting(true);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        style={{
          background: "none", border: "none", color: "rgba(148,163,184,0.4)",
          cursor: "pointer", padding: 0, display: "flex", flexShrink: 0,
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(148,163,184,0.4)")}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function StarWarsToastContainer({ toasts, onDismiss }: StarWarsToastProps) {
  return (
    <div
      style={{
        position: "fixed", bottom: "24px", right: "24px",
        zIndex: 9999,
        display: "flex", flexDirection: "column-reverse", gap: "8px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ── Hook for managing toasts ────────────────────────────────────────────────
let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
    const id = `toast-${++toastIdCounter}`;
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}

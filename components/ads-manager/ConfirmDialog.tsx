"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const VARIANTS = {
  danger: {
    border: "rgba(239,68,68,0.25)",
    bg: "rgba(239,68,68,0.06)",
    icon: "#ef4444",
    btn: "rgba(239,68,68,0.15)",
    btnBorder: "rgba(239,68,68,0.35)",
    btnColor: "#ef4444",
  },
  warning: {
    border: "rgba(251,191,36,0.25)",
    bg: "rgba(251,191,36,0.06)",
    icon: "#fbbf24",
    btn: "rgba(251,191,36,0.15)",
    btnBorder: "rgba(251,191,36,0.35)",
    btnColor: "#fbbf24",
  },
  info: {
    border: "rgba(0,212,255,0.25)",
    bg: "rgba(0,212,255,0.06)",
    icon: "#22d3ee",
    btn: "rgba(0,212,255,0.15)",
    btnBorder: "rgba(0,212,255,0.35)",
    btnColor: "#22d3ee",
  },
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "warning",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const v = VARIANTS[variant];

  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)", zIndex: 201,
          width: "380px", maxWidth: "90vw",
          background: "rgba(8,14,28,0.98)", backdropFilter: "blur(16px)",
          border: `1px solid ${v.border}`, borderRadius: "12px",
          padding: "24px",
          boxShadow: `0 20px 60px -12px rgba(0,0,0,0.7), 0 0 20px ${v.bg}`,
          animation: "scaleIn 0.2s ease-out",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "8px",
            background: v.bg, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <AlertTriangle className="w-5 h-5" style={{ color: v.icon }} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "white", marginBottom: "6px" }}>
              {title}
            </div>
            <div style={{ fontSize: "12px", color: "rgba(148,163,184,0.7)", lineHeight: "1.5" }}>
              {message}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "8px 16px", fontSize: "11px", fontWeight: 600,
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px", color: "rgba(148,163,184,0.7)", cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "8px 16px", fontSize: "11px", fontWeight: 600,
              background: v.btn, border: `1px solid ${v.btnBorder}`,
              borderRadius: "6px", color: v.btnColor, cursor: "pointer",
              transition: "all 0.15s",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: translate(-50%, -50%) scale(0.95); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}

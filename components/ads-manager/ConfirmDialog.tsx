"use client";

import React from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
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
    border: "rgba(229,72,77,0.25)",
    bg: "rgba(229,72,77,0.06)",
    icon: "var(--red)",
    btn: "rgba(229,72,77,0.15)",
    btnBorder: "rgba(229,72,77,0.35)",
    btnColor: "var(--red)",
  },
  warning: {
    border: "rgba(251,191,36,0.25)",
    bg: "rgba(251,191,36,0.06)",
    icon: "var(--amber)",
    btn: "rgba(251,191,36,0.15)",
    btnBorder: "rgba(251,191,36,0.35)",
    btnColor: "var(--amber)",
  },
  info: {
    border: "rgba(59,130,246,0.25)",
    bg: "rgba(59,130,246,0.06)",
    icon: "var(--cyan)",
    btn: "rgba(59,130,246,0.15)",
    btnBorder: "rgba(59,130,246,0.35)",
    btnColor: "var(--cyan)",
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
          background: "var(--panel-bg)", 
        }}
      />
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)", zIndex: 201,
          width: "380px", maxWidth: "90vw",
          background: "var(--surface)", 
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
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", marginBottom: "6px" }}>
              {title}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
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
              background: "var(--surface-hover)", border: "1px solid var(--hairline)",
              borderRadius: "6px", color: "var(--text-secondary)", cursor: "pointer",
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

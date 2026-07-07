"use client";
import React from "react";
import { X, Clipboard, Clock, Trash2 } from "lucide-react";
import { useClipboardStore } from "@/stores/clipboardStore";

interface ClipboardModalProps {
  onClose: () => void;
  onPaste: () => void;
}

export function ClipboardModal({ onClose, onPaste }: ClipboardModalProps) {
  const { items, timestamp, clear } = useClipboardStore();

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, background: "var(--panel-bg)", backdropFilter: "blur(8px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 101,
        width: "420px", maxWidth: "90vw", background: "rgba(8,14,28,0.98)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(59,130,246,0.15)", borderRadius: "12px", overflow: "hidden",
        boxShadow: "0 20px 60px -12px rgba(0,0,0,0.7)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700, color: "var(--foreground)" }}>
            <Clipboard className="w-4 h-4" style={{ color: "var(--cyan)" }} />
            Elementos copiados
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div style={{ padding: "16px 20px", maxHeight: "300px", overflowY: "auto" }} className="custom-scrollbar">
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Clipboard className="w-8 h-8" style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                No hay elementos copiados
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                Selecciona elementos y usa Ctrl+C para copiar
              </div>
            </div>
          ) : (
            <>
              {timestamp && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "9px", color: "var(--text-muted)", marginBottom: "10px" }}>
                  <Clock className="w-3 h-3" />
                  Copiado: {new Date(timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
              )}
              {items.map((item, i) => (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", marginBottom: "4px",
                  borderRadius: "6px", background: "var(--surface-hover)", border: "1px solid var(--hairline)",
                }}>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, width: "18px" }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", color: "var(--foreground)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>ID: {item.id}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", padding: "12px 20px", borderTop: "1px solid var(--border)", justifyContent: "flex-end" }}>
          <button
            onClick={() => { clear(); onClose(); }}
            disabled={items.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: "4px", padding: "7px 14px", fontSize: "11px", fontWeight: 600,
              background: "var(--red-dim)", border: "1px solid rgba(229,72,77,0.2)", borderRadius: "6px",
              color: items.length > 0 ? "var(--red)" : "rgba(148,163,184,0.65)", cursor: items.length > 0 ? "pointer" : "not-allowed",
            }}
          >
            <Trash2 className="w-3 h-3" /> Limpiar
          </button>
          <button
            onClick={() => { onPaste(); onClose(); }}
            disabled={items.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: "4px", padding: "7px 14px", fontSize: "11px", fontWeight: 600,
              background: items.length > 0 ? "rgba(59,130,246,0.1)" : "rgba(148,163,184,0.05)",
              border: `1px solid ${items.length > 0 ? "rgba(59,130,246,0.25)" : "rgba(148,163,184,0.18)"}`, borderRadius: "6px",
              color: items.length > 0 ? "var(--cyan)" : "rgba(148,163,184,0.65)",
              cursor: items.length > 0 ? "pointer" : "not-allowed",
            }}
          >
            Pegar todos ({items.length})
          </button>
        </div>
      </div>
    </>
  );
}

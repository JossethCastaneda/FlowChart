"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface ModalConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  inputPlaceholder?: string;
  onConfirm: (inputValue?: string) => void;
  onCancel?: () => void;
}

let showModalFn: ((config: ModalConfig) => void) | null = null;

/** Show a confirmation modal. Returns a promise that resolves when confirmed. */
export function showConfirm(config: Omit<ModalConfig, "onConfirm"> & { onConfirm?: () => void }): Promise<boolean> {
  return new Promise((resolve) => {
    if (showModalFn) {
      showModalFn({
        ...config,
        onConfirm: () => {
          config.onConfirm?.();
          resolve(true);
        },
        onCancel: () => resolve(false),
      });
    } else {
      // Fallback to native
      const result = window.confirm(config.message);
      if (result) config.onConfirm?.();
      resolve(result);
    }
  });
}

/** Show a prompt modal with input. */
export function showPrompt(config: { title: string; message: string; placeholder?: string }): Promise<string | null> {
  return new Promise((resolve) => {
    if (showModalFn) {
      showModalFn({
        title: config.title,
        message: config.message,
        inputPlaceholder: config.placeholder,
        confirmLabel: "Confirmar",
        onConfirm: (val) => resolve(val || null),
        onCancel: () => resolve(null),
      });
    } else {
      resolve(window.prompt(config.message));
    }
  });
}

export function ConfirmModalContainer() {
  const [config, setConfig] = useState<ModalConfig | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    showModalFn = (c) => {
      setConfig(c);
      setInputValue("");
    };
    return () => { showModalFn = null; };
  }, []);

  useEffect(() => {
    if (config?.inputPlaceholder && inputRef.current) {
      inputRef.current.focus();
    }
  }, [config]);

  const handleConfirm = useCallback(() => {
    config?.onConfirm(inputValue);
    setConfig(null);
  }, [config, inputValue]);

  const handleCancel = useCallback(() => {
    config?.onCancel?.();
    setConfig(null);
  }, [config]);

  // Close on Escape
  useEffect(() => {
    if (!config) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
      if (e.key === "Enter" && !config.inputPlaceholder) handleConfirm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [config, handleCancel, handleConfirm]);

  if (!config) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          {config.danger && <AlertTriangle size={20} style={{ color: "var(--red)", flexShrink: 0 }} />}
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>
            {config.title}
          </h3>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: config.inputPlaceholder ? 12 : 20, lineHeight: 1.5 }}>
          {config.message}
        </p>
        {config.inputPlaceholder && (
          <input
            ref={inputRef}
            type="text"
            placeholder={config.inputPlaceholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            style={{
              width: "100%", padding: "10px 14px", marginBottom: 20, boxSizing: "border-box",
              background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.15)",
              color: "var(--foreground)", fontSize: 13, outline: "none", borderRadius: 6,
            }}
          />
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={handleCancel}
            style={{
              padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: "rgba(255,255,255,0.06)", border: "1px solid var(--hairline)",
              color: "var(--text-secondary)", cursor: "pointer",
            }}
          >
            {config.cancelLabel || "Cancelar"}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: config.danger ? "rgba(255,45,85,0.15)" : "rgba(0,212,255,0.12)",
              border: `1px solid ${config.danger ? "rgba(255,45,85,0.3)" : "rgba(0,212,255,0.25)"}`,
              color: config.danger ? "var(--red)" : "var(--cyan)", cursor: "pointer",
            }}
          >
            {config.confirmLabel || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

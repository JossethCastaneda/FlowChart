"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let addToastFn: ((type: ToastType, message: string) => void) | null = null;

/** Call this from anywhere to show a toast */
export function showToast(type: ToastType, message: string) {
  if (addToastFn) addToastFn(type, message);
}

const icons = {
  success: <CheckCircle size={16} style={{ color: "#06d6a0", flexShrink: 0 }} />,
  error: <XCircle size={16} style={{ color: "#ff2d55", flexShrink: 0 }} />,
  info: <Info size={16} style={{ color: "#00d4ff", flexShrink: 0 }} />,
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {icons[t.type]}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

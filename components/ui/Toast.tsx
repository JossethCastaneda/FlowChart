"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let addToastFn: ((type: ToastType, message: string) => void) | null = null;
let toastQueue: Array<{type: ToastType, message: string}> = [];

/** Call this from anywhere to show a toast */
export function showToast(type: ToastType, message: string) {
  if (addToastFn) {
    addToastFn(type, message);
  } else {
    toastQueue.push({ type, message });
  }
}

import { AlertTriangle } from "lucide-react";
import { SIcon } from "@/components/ui/SIcon";

const icons = {
  success: <SIcon icon={CheckCircle} size={16} style={{ color: "var(--fc-success)", flexShrink: 0 }} />,
  error: <SIcon icon={XCircle} size={16} style={{ color: "var(--fc-danger)", flexShrink: 0 }} />,
  info: <SIcon icon={Info} size={16} style={{ color: "var(--fc-accent)", flexShrink: 0 }} />,
  warning: <SIcon icon={AlertTriangle} size={16} style={{ color: "var(--fc-warning)", flexShrink: 0 }} />,
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
    // Drain queue
    if (toastQueue.length > 0) {
      toastQueue.forEach(t => addToast(t.type, t.message));
      toastQueue = [];
    }
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
            style={{ background: "none", border: "none", color: "var(--fc-text-muted)", cursor: "pointer", padding: 2 }}
          >
            <SIcon icon={X} size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

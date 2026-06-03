import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ title = "PERTURBACIÓN EN LA FUERZA", message, onRetry, retryLabel = "REINTENTAR" }: ErrorStateProps) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
        <AlertTriangle className="w-6 h-6 text-red-500" style={{ color: "var(--red)" }} />
      </div>
      <p style={{ fontFamily: "var(--font-display)", fontSize: "14px", letterSpacing: "0.15em", color: "var(--red)", textTransform: "uppercase" }}>
        {title}
      </p>
      <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.7)", marginTop: "12px", maxWidth: "400px", lineHeight: "1.5" }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: "24px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            padding: "8px 20px",
            border: "1px solid rgba(148,163,184,0.3)",
            color: "var(--foreground)",
            background: "rgba(255,255,255,0.05)",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.borderColor = "rgba(148,163,184,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.borderColor = "rgba(148,163,184,0.3)";
          }}
        >
          <RefreshCw className="w-3 h-3" /> {retryLabel}
        </button>
      )}
    </div>
  );
}

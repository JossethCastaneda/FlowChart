import React, { useState } from "react";

interface StatusToggleProps {
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | string;
  onToggle: (newStatus: "ACTIVE" | "PAUSED") => Promise<boolean>;
}

export function StatusToggle({ status, onToggle }: StatusToggleProps) {
  const isActive = status === "ACTIVE";
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const targetStatus = isActive ? "PAUSED" : "ACTIVE";
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
    const success = await onToggle(targetStatus);
    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: isActive ? "flex-end" : "flex-start",
        width: "28px",
        height: "15px",
        borderRadius: "999px",
        background: loading
          ? "rgba(148,163,184,0.22)"
          : isActive
          ? "var(--fc-accent)"
          : "rgba(148,163,184,0.65)",
        border: "none",
        padding: "2px",
        cursor: loading ? "not-allowed" : "pointer",
        position: "relative",
        transition: "background-color 0.2s, justify-content 0.2s",
        boxShadow: isActive ? "0 0 8px rgba(59,130,246,0.4)" : "none",
      }}
    >
      <div
        style={{
          width: "11px",
          height: "11px",
          borderRadius: "50%",
          background: loading ? "rgba(255,255,255,0.5)" : "white",
          transition: "transform 0.2s",
          transform: isActive ? "translateX(0)" : "translateX(0)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
        }}
      />
    </button>
  );
}

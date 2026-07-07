import React, { useState } from "react";
import { Copy, Play, Pause, Archive, Trash2, X } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onAction: (action: "duplicate" | "activate" | "pause" | "archive" | "delete") => Promise<void>;
}

export function BulkActionBar({ selectedCount, onClearSelection, onAction }: BulkActionBarProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: "duplicate" | "activate" | "pause" | "archive" | "delete") => {
    if (loading) return;
    setLoading(action);
    await onAction(action);
    setLoading(null);
  };

  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--surface)",
        
        border: "1px solid var(--border-strong)",
        borderRadius: "999px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.6), 0 0 15px rgba(59,130,246,0.15)",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        zIndex: 100,
        animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={onClearSelection}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "2px",
            borderRadius: "50%",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <X className="w-4 h-4" />
        </button>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--foreground)", fontFamily: "var(--font-display)" }}>
          {selectedCount} Seleccionado{selectedCount > 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ width: "1px", height: "16px", background: "var(--border)" }} />

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ActionButton
          icon={<Copy className="w-3.5 h-3.5" />}
          label="Duplicar"
          loading={loading === "duplicate"}
          onClick={() => handleAction("duplicate")}
        />
        <ActionButton
          icon={<Play className="w-3.5 h-3.5" />}
          label="Activar"
          loading={loading === "activate"}
          color="var(--emerald)"
          onClick={() => handleAction("activate")}
        />
        <ActionButton
          icon={<Pause className="w-3.5 h-3.5" />}
          label="Pausar"
          loading={loading === "pause"}
          color="var(--amber)"
          onClick={() => handleAction("pause")}
        />
        <ActionButton
          icon={<Archive className="w-3.5 h-3.5" />}
          label="Archivar"
          loading={loading === "archive"}
          onClick={() => handleAction("archive")}
        />
        <ActionButton
          icon={<Trash2 className="w-3.5 h-3.5" />}
          label="Eliminar"
          loading={loading === "delete"}
          color="var(--red)"
          onClick={() => {
            if (confirm(`¿Estás seguro de que deseas eliminar ${selectedCount} elemento(s)?`)) {
              handleAction("delete");
            }
          }}
        />
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  loading,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "999px",
        color: loading ? "var(--text-muted)" : color || "var(--text-secondary)",
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.borderColor = color || "var(--cyan)";
          e.currentTarget.style.color = "white";
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = color || "var(--text-secondary)";
        }
      }}
    >
      {loading ? (
        <div
          style={{
            width: "12px",
            height: "12px",
            border: "2px solid rgba(255,255,255,0.65)",
            borderTopColor: "var(--cyan)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      ) : (
        icon
      )}
      <span>{label}</span>
    </button>
  );
}

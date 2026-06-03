import React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, actionIcon }: EmptyStateProps) {
  return (
    <div style={{ padding: "56px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ color: "rgba(148,163,184,0.25)", marginBottom: "16px" }}>
        {icon}
      </div>
      <p style={{ fontFamily: "var(--font-display)", fontSize: "14px", letterSpacing: "0.2em", color: "rgba(148,163,184,0.6)", textTransform: "uppercase" }}>
        {title}
      </p>
      <p style={{ fontSize: "12px", color: "rgba(148,163,184,0.4)", marginTop: "8px", maxWidth: "400px", lineHeight: "1.5" }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          className="btn-primary"
          onClick={onAction}
          style={{ marginTop: "24px", display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          {actionIcon} {actionLabel}
        </button>
      )}
    </div>
  );
}

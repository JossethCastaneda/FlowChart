import React, { ReactNode } from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";

export interface EmptyStateProps {
  reason?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  
  // Legacy props support
  icon?: ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  reason, 
  action, 
  className = "",
  icon,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction
}) => {
  const displayTitle = title || reason;
  const displayDesc = description;
  const displayAction = action || (onAction && actionLabel ? { label: actionLabel, onClick: onAction } : undefined);

  return (
    <div className={`fc-empty-state ${className}`}>
      <div className="fc-empty-state-icon">
        {icon ? icon : <Icon name="filtro" size={32} />}
      </div>
      <div className="fc-empty-state-reason">{displayTitle}</div>
      {displayDesc && (
        <div style={{ color: 'var(--fc-text-muted)', fontSize: 13, marginBottom: 16 }}>
          {displayDesc}
        </div>
      )}
      {displayAction && (
        <Button variant="secondary" onClick={displayAction.onClick} className="fc-empty-state-action">
          {actionIcon && <span style={{ marginRight: 6 }}>{actionIcon}</span>}
          {displayAction.label}
        </Button>
      )}
    </div>
  );
};

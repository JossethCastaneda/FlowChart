"use client";

import React, { forwardRef } from "react";
import { GripVertical, Trash2 } from "lucide-react";

export interface DashboardWidgetProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onRemove?: () => void;
}

export const DashboardWidget = forwardRef<HTMLDivElement, DashboardWidgetProps>(
  ({ id, title, icon, children, onRemove, style, className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        style={style}
        className={`dashboard-widget ${className || ""}`}
        {...rest}
      >
        {/* ── Header (drag handle) ── */}
        <div className="dashboard-widget__header">
          <div className="dashboard-widget__drag-handle">
            <GripVertical style={{ width: 14, height: 14 }} />
          </div>

          <div className="dashboard-widget__title">
            {icon && <span className="dashboard-widget__icon">{icon}</span>}
            <span>{title}</span>
          </div>

          <div className="dashboard-widget__actions">
            {/* Remove button */}
            <button
              className="dashboard-widget__action-btn dashboard-widget__action-btn--danger"
              onPointerDown={(e) => e.stopPropagation()} // prevent drag
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
              title="Eliminar widget"
            >
              <Trash2 style={{ width: 12, height: 12 }} />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="dashboard-widget__content">{children}</div>
      </div>
    );
  }
);

DashboardWidget.displayName = "DashboardWidget";

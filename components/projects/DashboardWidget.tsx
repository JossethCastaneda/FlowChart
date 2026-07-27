"use client";

import React, { useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronUp, Maximize2, Minimize2, Trash2 } from "lucide-react";

export interface DashboardWidgetProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  colSpan: number;
  collapsed: boolean;
  minColSpan?: number;
  maxColSpan?: number;
  children: React.ReactNode;
  onToggleCollapse?: () => void;
  onResize?: (newColSpan: number) => void;
  onRemove?: () => void;
  /** Total grid columns (default 4) */
  gridColumns?: number;
}

export function DashboardWidget({
  id,
  title,
  icon,
  colSpan,
  collapsed,
  minColSpan = 1,
  maxColSpan = 4,
  children,
  onToggleCollapse,
  onResize,
  onRemove,
  gridColumns = 4,
}: DashboardWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [isResizing, setIsResizing] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition || undefined,
    gridColumn: `span ${colSpan}`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : isResizing ? 50 : "auto",
  };

  /* ── Resize via pointer drag ── */
  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);

      const startX = e.clientX;
      const startSpan = colSpan;
      const target = e.currentTarget as HTMLElement;
      const widget = target.closest(".dashboard-widget") as HTMLElement | null;
      if (!widget) return;
      const widgetRect = widget.getBoundingClientRect();
      const colWidth = widgetRect.width / startSpan;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const newSpanRaw = Math.round(startSpan + dx / colWidth);
        const clamped = Math.max(minColSpan, Math.min(maxColSpan, newSpanRaw, gridColumns));
        if (clamped !== colSpan) {
          onResize?.(clamped);
        }
      };

      const onUp = () => {
        setIsResizing(false);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [colSpan, minColSpan, maxColSpan, gridColumns, onResize]
  );

  /* ── Quick resize buttons ── */
  const cycleSize = useCallback(() => {
    // Cycle: current → next step → min → ...
    const sizes = Array.from(
      { length: maxColSpan - minColSpan + 1 },
      (_, i) => minColSpan + i
    );
    const idx = sizes.indexOf(colSpan);
    const next = sizes[(idx + 1) % sizes.length];
    onResize?.(next);
  }, [colSpan, minColSpan, maxColSpan, onResize]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`dashboard-widget${isDragging ? " dashboard-widget--dragging" : ""}${collapsed ? " dashboard-widget--collapsed" : ""}${isResizing ? " dashboard-widget--resizing" : ""}`}
      {...attributes}
    >
      {/* ── Header (drag handle) ── */}
      <div className="dashboard-widget__header">
        <div className="dashboard-widget__drag-handle" {...listeners}>
          <GripVertical style={{ width: 14, height: 14 }} />
        </div>

        <div className="dashboard-widget__title">
          {icon && <span className="dashboard-widget__icon">{icon}</span>}
          <span>{title}</span>
        </div>

        <div className="dashboard-widget__actions">
          {/* Resize cycle button */}
          <button
            className="dashboard-widget__action-btn"
            onClick={cycleSize}
            title={`Cambiar tamaño (${colSpan}/${gridColumns} cols)`}
          >
            {colSpan < gridColumns ? (
              <Maximize2 style={{ width: 12, height: 12 }} />
            ) : (
              <Minimize2 style={{ width: 12, height: 12 }} />
            )}
          </button>

          {/* Collapse toggle */}
          <button
            className="dashboard-widget__action-btn"
            onClick={onToggleCollapse}
            title={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? (
              <ChevronDown style={{ width: 12, height: 12 }} />
            ) : (
              <ChevronUp style={{ width: 12, height: 12 }} />
            )}
          </button>

          {/* Remove button */}
          {onRemove && (
            <button
              className="dashboard-widget__action-btn dashboard-widget__action-btn--danger"
              onClick={onRemove}
              title="Eliminar gráfico"
            >
              <Trash2 style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {!collapsed && (
        <div className="dashboard-widget__content">{children}</div>
      )}

      {/* ── Resize handle (bottom-right corner) ── */}
      {!collapsed && (
        <div
          className="dashboard-widget__resize-handle"
          onPointerDown={handleResizeStart}
          title="Arrastrar para redimensionar"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M9 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

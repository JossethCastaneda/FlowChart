"use client";

import React, { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { ResponsiveGridLayout, type Layout, type LayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { RotateCcw } from "lucide-react";
import { DashboardWidget } from "./DashboardWidget";
import {
  useDashboardLayoutStore,
  type WidgetLayout,
} from "@/stores/dashboardLayoutStore";

/* ═══ TYPES ═══ */
export interface WidgetDefinition {
  id: string;
  title: string;
  icon?: React.ReactNode;
  /** Default width in columns */
  defaultColSpan: number;
  /** Minimum allowed column span */
  minColSpan?: number;
  /** Maximum allowed column span */
  maxColSpan?: number;
  /** Default height in rows */
  defaultRowSpan?: number;
  /** Minimum allowed row span */
  minRowSpan?: number;
  /** Maximum allowed row span */
  maxRowSpan?: number;
  /** Content render function — receives current layout config if dynamic */
  render: (config?: any) => React.ReactNode;
}

interface DashboardGridProps {
  /** Unique key for layout persistence (e.g., "project-resumen") */
  layoutKey: string;
  /** Widget definitions (static/defaults) */
  widgets: WidgetDefinition[];
  /** Templates for dynamic widgets */
  templates?: Record<string, WidgetDefinition>;
  /** Number of grid columns (default 12) */
  columns?: number;
  /** Show reset button */
  showReset?: boolean;
  /** Custom actions in the toolbar */
  renderToolbarActions?: () => React.ReactNode;
}

/* ═══ COMPONENT ═══ */
export function DashboardGrid({
  layoutKey,
  widgets,
  templates,
  columns = 12,
  showReset = true,
  renderToolbarActions,
}: DashboardGridProps) {
  const { getLayout, setLayout, removeWidget, resetLayout } =
    useDashboardLayoutStore();

  // Width measured from the actual rendered container
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Attach ResizeObserver AFTER the element renders via a callback ref pattern
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
    };

    measure(); // initial measure

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }); // ← intentionally NO dependency array: runs after every render so
      //   it always catches the element once it's mounted in the DOM.

  /* ── Build default layout from widget definitions ── */
  const defaults: WidgetLayout[] = useMemo(
    () =>
      widgets.map((w, i) => ({
        id: w.id,
        x: (i * w.defaultColSpan) % columns,
        y: Infinity,
        w: w.defaultColSpan,
        h: w.defaultRowSpan || 6,
        minW: w.minColSpan || 1,
        maxW: w.maxColSpan || columns,
        minH: w.minRowSpan || 3,
        maxH: w.maxRowSpan,
        collapsed: false,
      })),
    [widgets, columns]
  );

  /* ── Merged layout (stored + defaults) ── */
  const widgetLayouts = useMemo(
    () => getLayout(layoutKey, defaults),
    [getLayout, layoutKey, defaults]
  );

  /* ── Ensure reset button shows only when a layout is saved ── */
  const hasStoredLayout = useDashboardLayoutStore(
    (s) => !!s.layouts[layoutKey]?.length
  );

  /* ── Widget map for quick lookup ── */
  const widgetMap = useMemo(() => {
    const map = new Map<string, WidgetDefinition>();
    for (const w of widgets) map.set(w.id, w);
    return map;
  }, [widgets]);

  const handleLayoutChange = useCallback(
    (currentLayout: Layout) => {
      const updatedWidgets = widgetLayouts.map((wl) => {
        const match = currentLayout.find((l: LayoutItem) => l.i === wl.id);
        if (match) {
          return { ...wl, x: match.x, y: match.y, w: match.w, h: match.h };
        }
        return wl;
      });
      setLayout(layoutKey, updatedWidgets);
    },
    [layoutKey, setLayout, widgetLayouts]
  );

  const handleReset = useCallback(() => {
    resetLayout(layoutKey);
  }, [layoutKey, resetLayout]);

  // Translate to react-grid-layout format
  const rgridLayout: Layout = widgetLayouts.map((wl) => {
    const def = wl.type && templates ? templates[wl.type] : widgetMap.get(wl.id);
    return {
      i: wl.id,
      x: wl.x,
      y: wl.y,
      w: wl.w,
      h: wl.h,
      minW: def?.minColSpan || 1,
      maxW: def?.maxColSpan || columns,
      minH: def?.minRowSpan || 3,
      maxH: wl.maxH || def?.maxRowSpan,
      static: false,
    };
  });

  return (
    <div
      className="dashboard-grid-container"
      ref={containerRef}
    >
      {/* Toolbar */}
      {((showReset && hasStoredLayout) || renderToolbarActions) && (
        <div
          className="dashboard-grid-toolbar"
          style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 12 }}
        >
          {renderToolbarActions?.()}
          {showReset && hasStoredLayout && (
            <button
              className="dashboard-grid-reset-btn"
              onClick={handleReset}
              title="Restaurar layout por defecto"
            >
              <RotateCcw style={{ width: 12, height: 12 }} />
              <span>Reset Layout</span>
            </button>
          )}
        </div>
      )}

      {/* Grid — rendered only when we have a real measured width */}
      {width > 0 && (
        <ResponsiveGridLayout
          className="layout"
          width={width}
          layouts={{ lg: rgridLayout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: columns, md: columns, sm: columns, xs: 1, xxs: 1 }}
          rowHeight={50}
          onLayoutChange={handleLayoutChange}
          dragConfig={{ handle: ".dashboard-widget__drag-handle" }}
          margin={[12, 12]}
          containerPadding={[0, 0]}
        >
          {widgetLayouts.map((wl) => {
            const def = wl.type && templates ? templates[wl.type] : widgetMap.get(wl.id);
            if (!def) return <div key={wl.id} />;
            const title = wl.config?.title || def.title;
            return (
              <div key={wl.id} className="dashboard-grid-item">
                <DashboardWidget
                  id={wl.id}
                  title={title}
                  icon={def.icon}
                  onRemove={() => removeWidget(layoutKey, wl.id)}
                >
                  {def.render(wl.config)}
                </DashboardWidget>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}

"use client";

import React, {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  ResponsiveGridLayout,
  type Layout,
  type LayoutItem,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { RotateCcw } from "lucide-react";
import { DashboardWidget } from "./DashboardWidget";
import {
  useDashboardLayoutStore,
  mergeWithDefaults,
  type WidgetLayout,
} from "@/stores/dashboardLayoutStore";

/* ═══ CONSTANTS ═══ */
const ROW_HEIGHT = 10;
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
const HEADER_HEIGHT = 36; // .dashboard-widget__header min-height
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
const CONTENT_PADDING = 28; // 14px top + 14px bottom in .dashboard-widget__content
const MARGIN: [number, number] = [12, 12];
const MIN_ROWS = 4;

/* ═══ TYPES ═══ */
export interface WidgetDefinition {
  id: string;
  title: string;
  icon?: React.ReactNode;
  defaultColSpan: number;
  minColSpan?: number;
  maxColSpan?: number;
  /**
   * Fixed row height. If omitted, widget auto-sizes to content.
   * When set, auto-height is disabled for this widget.
   */
  defaultRowSpan?: number;
  minRowSpan?: number;
  maxRowSpan?: number;
  render: (config?: Record<string, unknown>) => React.ReactNode;
}

interface DashboardGridProps {
  layoutKey: string;
  widgets: WidgetDefinition[];
  templates?: Record<string, WidgetDefinition>;
  columns?: number;
  showReset?: boolean;
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
  const { setLayout, removeWidget, resetLayout, updateWidget } =
    useDashboardLayoutStore();

  /* ─────────────────────────────────────
     1. CONTAINER WIDTH — callback ref
     ───────────────────────────────────── */
  const containerRef = useRef<HTMLDivElement | null>(null);
  const roWidthRef = useRef<ResizeObserver | null>(null);
  const [width, setWidth] = useState(0);

  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    // Tear down previous
    roWidthRef.current?.disconnect();
    roWidthRef.current = null;
    containerRef.current = el;
    if (!el) return;

    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    roWidthRef.current = ro;
  }, []);

  // Clean up on unmount
  useEffect(() => () => roWidthRef.current?.disconnect(), []);


  /* ─────────────────────────────────────
     3. LAYOUT — reactive store subscription
     ───────────────────────────────────── */
  const defaults: WidgetLayout[] = useMemo(
    () =>
      widgets.map((w, i) => ({
        id: w.id,
        x: (i * w.defaultColSpan) % columns,
        y: 99999, // safe large number — RGL normalizes; JSON.stringify(Infinity) === "null"
        w: w.defaultColSpan,
        h: w.defaultRowSpan ?? 20,
        minW: w.minColSpan || 1,
        maxW: w.maxColSpan || columns,
        minH: w.minRowSpan || MIN_ROWS,
        maxH: w.maxRowSpan,
        collapsed: false,
      })),
    [widgets, columns]
  );

  // ✅ FIX: subscribe to the ACTUAL store slice, not the stable getLayout method
  const stored = useDashboardLayoutStore((s) => s.layouts[layoutKey]);
  const mergedLayouts = useMemo(
    () => mergeWithDefaults(stored, defaults),
    [stored, defaults]
  );

  const widgetLayouts = mergedLayouts;

  /* ─────────────────────────────────────
     4. STORE HAS SAVED LAYOUT — for reset button visibility
     ───────────────────────────────────── */
  const hasStoredLayout = useDashboardLayoutStore(
    (s) => !!s.layouts[layoutKey]?.length
  );

  /* ─────────────────────────────────────
     5. WIDGET MAP
     ───────────────────────────────────── */
  const widgetMap = useMemo(() => {
    const map = new Map<string, WidgetDefinition>();
    for (const w of widgets) map.set(w.id, w);
    return map;
  }, [widgets]);

  /* ─────────────────────────────────────
     6. CALLBACKS
     ───────────────────────────────────── */
  // Debounced layout persistence — onLayoutChange fires every frame during drag
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestLayoutRef = useRef<Layout | null>(null);

  const flushLayout = useCallback(() => {
    const currentLayout = latestLayoutRef.current;
    if (!currentLayout) return;
    latestLayoutRef.current = null;

    const updatedWidgets = mergedLayouts.map((wl) => {
      const match = currentLayout.find((l: LayoutItem) => l.i === wl.id);
      if (match) {
        return { ...wl, x: match.x, y: match.y, w: match.w, h: match.h };
      }
      return wl;
    });
    setLayout(layoutKey, updatedWidgets);
  }, [layoutKey, setLayout, mergedLayouts]);

  const handleLayoutChange = useCallback(
    (currentLayout: Layout) => {
      latestLayoutRef.current = currentLayout;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(flushLayout, 200);
    },
    [flushLayout]
  );

  // Clean up timer on unmount
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const handleResizeStop = useCallback(
    (_layout: Layout, _oldItem: LayoutItem | null, newItem: LayoutItem | null) => {
      if (!newItem) return;
      updateWidget(layoutKey, newItem.i, { h: newItem.h });
    },
    [layoutKey, updateWidget]
  );

  const handleReset = useCallback(() => {
    resetLayout(layoutKey);
  }, [layoutKey, resetLayout]);

  /* ─────────────────────────────────────
     7. TRANSLATE TO RGL FORMAT
     ───────────────────────────────────── */
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
      minH: def?.minRowSpan || MIN_ROWS,
      maxH: wl.maxH || def?.maxRowSpan,
      static: false,
    };
  });

  /* ─────────────────────────────────────
     8. RENDER
     ───────────────────────────────────── */
  return (
    <div className="dashboard-grid-container" ref={setContainerRef}>
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

      {/* Grid */}
      {width > 0 && (
        <ResponsiveGridLayout
          className="layout"
          width={width}
          layouts={{ lg: rgridLayout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: columns, md: columns, sm: columns, xs: 1, xxs: 1 }}
          rowHeight={ROW_HEIGHT}
          onLayoutChange={handleLayoutChange}
          onResizeStop={handleResizeStop}
          dragConfig={{ handle: ".dashboard-widget__drag-handle" }}
          margin={MARGIN}
          containerPadding={[0, 0]}
          autoSize
        >
          {widgetLayouts.map((wl) => {
            const def =
              wl.type && templates
                ? templates[wl.type]
                : widgetMap.get(wl.id);
            if (!def) return <div key={wl.id} />;
            const title = wl.config?.title as string || def.title;
            return (
              <div key={wl.id} className="dashboard-grid-item">
                <DashboardWidget
                  id={wl.id}
                  title={title}
                  icon={def.icon}
                  onRemove={() => removeWidget(layoutKey, wl.id)}
                >
                  <div style={{ width: "100%", height: "100%" }}>
                    {def.render(wl.config)}
                  </div>
                </DashboardWidget>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}

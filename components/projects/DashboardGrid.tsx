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
  type WidgetLayout,
} from "@/stores/dashboardLayoutStore";

/* ═══ CONSTANTS ═══ */
const ROW_HEIGHT = 10; // px per row unit — small granularity for precise auto-sizing
const HEADER_HEIGHT = 36; // .dashboard-widget__header min-height
const CONTENT_PADDING = 28; // 14px top + 14px bottom padding in .dashboard-widget__content
const MARGIN = 12; // grid margin between items
const MIN_ROWS = 4; // minimum rows any widget can have

/* ═══ TYPES ═══ */
export interface WidgetDefinition {
  id: string;
  title: string;
  icon?: React.ReactNode;
  defaultColSpan: number;
  minColSpan?: number;
  maxColSpan?: number;
  /** Fixed row height override. If omitted, widget auto-sizes to content. */
  defaultRowSpan?: number;
  minRowSpan?: number;
  maxRowSpan?: number;
  render: (config?: any) => React.ReactNode;
}

interface DashboardGridProps {
  layoutKey: string;
  widgets: WidgetDefinition[];
  templates?: Record<string, WidgetDefinition>;
  columns?: number;
  showReset?: boolean;
  renderToolbarActions?: () => React.ReactNode;
}

/* ═══ Helper: content height → grid rows ═══ */
function contentHeightToRows(contentHeight: number): number {
  const totalHeight = contentHeight + CONTENT_PADDING + HEADER_HEIGHT;
  return Math.max(MIN_ROWS, Math.ceil(totalHeight / (ROW_HEIGHT + MARGIN)));
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

  /* ── Container width measurement ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }); // no deps — re-attaches after every render so ref is always populated

  /* ── Auto-height: track content heights per widget ── */
  const [contentHeights, setContentHeights] = useState<Record<string, number>>({});
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const roMapRef = useRef<Map<string, ResizeObserver>>(new Map());

  // Attach / detach ResizeObservers for each widget's content div
  const registerContentRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      // Clean up old observer for this id
      roMapRef.current.get(id)?.disconnect();
      roMapRef.current.delete(id);
      contentRefs.current[id] = el;

      if (!el) return;

      const ro = new ResizeObserver(([entry]) => {
        const h = entry.contentRect.height;
        setContentHeights((prev) => {
          if (prev[id] === h) return prev;
          return { ...prev, [id]: h };
        });
      });
      ro.observe(el);
      roMapRef.current.set(id, ro);

      // Initial measurement
      const h = el.getBoundingClientRect().height;
      if (h > 0) {
        setContentHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
      }
    },
    []
  );

  // Disconnect all observers on unmount
  useEffect(() => {
    const roMap = roMapRef.current;
    return () => roMap.forEach((ro) => ro.disconnect());
  }, []);

  /* ── Build default layout from widget definitions ── */
  const defaults: WidgetLayout[] = useMemo(
    () =>
      widgets.map((w, i) => ({
        id: w.id,
        x: (i * w.defaultColSpan) % columns,
        y: Infinity,
        w: w.defaultColSpan,
        h: w.defaultRowSpan ?? 20, // generous default until auto-sized
        minW: w.minColSpan || 1,
        maxW: w.maxColSpan || columns,
        minH: w.minRowSpan || MIN_ROWS,
        maxH: w.maxRowSpan,
        collapsed: false,
      })),
    [widgets, columns]
  );

  /* ── Merged layout (stored + defaults) ── */
  const storedWidgetLayouts = useMemo(
    () => getLayout(layoutKey, defaults),
    [getLayout, layoutKey, defaults]
  );

  /* ── Apply auto-heights to layout ── */
  const widgetLayouts = useMemo(() => {
    return storedWidgetLayouts.map((wl) => {
      const def = wl.type && templates ? templates[wl.type] : widgets.find((w) => w.id === wl.id);
      // If widget has a fixed row span defined, respect it; otherwise auto-size
      if (def?.defaultRowSpan != null) return wl;
      const measuredH = contentHeights[wl.id];
      if (measuredH == null) return wl;
      return { ...wl, h: contentHeightToRows(measuredH) };
    });
  }, [storedWidgetLayouts, contentHeights, widgets, templates]);

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
      const updatedWidgets = storedWidgetLayouts.map((wl) => {
        const match = currentLayout.find((l: LayoutItem) => l.i === wl.id);
        if (match) {
          return { ...wl, x: match.x, y: match.y, w: match.w, h: match.h };
        }
        return wl;
      });
      setLayout(layoutKey, updatedWidgets);
    },
    [layoutKey, setLayout, storedWidgetLayouts]
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
      minH: def?.minRowSpan || MIN_ROWS,
      maxH: wl.maxH || def?.maxRowSpan,
      static: false,
    };
  });

  return (
    <div className="dashboard-grid-container" ref={containerRef}>
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
          dragConfig={{ handle: ".dashboard-widget__drag-handle" }}
          margin={[MARGIN, MARGIN]}
          containerPadding={[0, 0]}
          /* Allow layout to expand vertically to content size */
          autoSize
        >
          {widgetLayouts.map((wl) => {
            const def =
              wl.type && templates
                ? templates[wl.type]
                : widgetMap.get(wl.id);
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
                  {/* Measure content height via ref */}
                  <div
                    ref={(el) => registerContentRef(wl.id, el)}
                    style={{ width: "100%" }}
                  >
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

"use client";

import React, { useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
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
  /** Default column span (1-4) */
  defaultColSpan: number;
  /** Minimum allowed column span */
  minColSpan?: number;
  /** Maximum allowed column span */
  maxColSpan?: number;
  /** Content render function — receives current layout state */
  render: () => React.ReactNode;
}

interface DashboardGridProps {
  /** Unique key for layout persistence (e.g., "project-resumen") */
  layoutKey: string;
  /** Widget definitions */
  widgets: WidgetDefinition[];
  /** Number of grid columns (default 4) */
  columns?: number;
  /** Show reset button */
  showReset?: boolean;
}

/* ═══ COMPONENT ═══ */
export function DashboardGrid({
  layoutKey,
  widgets,
  columns = 4,
  showReset = true,
}: DashboardGridProps) {
  const { getLayout, setLayout, updateWidget, reorderWidgets, resetLayout } =
    useDashboardLayoutStore();

  /* ── Build default layout from widget definitions ── */
  const defaults: WidgetLayout[] = useMemo(
    () =>
      widgets.map((w, i) => ({
        id: w.id,
        colSpan: w.defaultColSpan,
        order: i,
        collapsed: false,
      })),
    [widgets]
  );

  /* ── Merged layout (stored + defaults) ── */
  const layout = useMemo(
    () => getLayout(layoutKey, defaults),
    [getLayout, layoutKey, defaults]
  );

  /* ── Ensure layout is persisted on first render ── */
  const hasStoredLayout = useDashboardLayoutStore(
    (s) => !!s.layouts[layoutKey]?.length
  );

  /* ── Widget map for quick lookup ── */
  const widgetMap = useMemo(() => {
    const map = new Map<string, WidgetDefinition>();
    for (const w of widgets) map.set(w.id, w);
    return map;
  }, [widgets]);

  /* ── DnD sensors ── */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeId, setActiveId] = React.useState<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Ensure layout is persisted before reordering
      if (!hasStoredLayout) {
        setLayout(layoutKey, layout);
      }
      reorderWidgets(layoutKey, String(active.id), String(over.id));
    },
    [layoutKey, layout, hasStoredLayout, setLayout, reorderWidgets]
  );

  const handleResize = useCallback(
    (widgetId: string, newColSpan: number) => {
      // Ensure layout is persisted
      if (!hasStoredLayout) {
        setLayout(layoutKey, layout);
      }
      updateWidget(layoutKey, widgetId, { colSpan: newColSpan });
    },
    [layoutKey, layout, hasStoredLayout, setLayout, updateWidget]
  );

  const handleToggleCollapse = useCallback(
    (widgetId: string) => {
      const w = layout.find((l) => l.id === widgetId);
      if (!w) return;
      if (!hasStoredLayout) {
        setLayout(layoutKey, layout);
      }
      updateWidget(layoutKey, widgetId, { collapsed: !w.collapsed });
    },
    [layoutKey, layout, hasStoredLayout, setLayout, updateWidget]
  );

  const handleReset = useCallback(() => {
    resetLayout(layoutKey);
  }, [layoutKey, resetLayout]);

  /* ── Sorted widget IDs for SortableContext ── */
  const sortedIds = useMemo(() => layout.map((l) => l.id), [layout]);

  /* ── Active widget for DragOverlay ── */
  const activeWidget = activeId ? widgetMap.get(activeId) : null;
  const activeLayout = activeId
    ? layout.find((l) => l.id === activeId)
    : null;

  return (
    <div className="dashboard-grid-container">
      {/* Reset button */}
      {showReset && hasStoredLayout && (
        <div className="dashboard-grid-toolbar">
          <button
            className="dashboard-grid-reset-btn"
            onClick={handleReset}
            title="Restaurar layout por defecto"
          >
            <RotateCcw style={{ width: 12, height: 12 }} />
            <span>Reset Layout</span>
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortedIds} strategy={rectSortingStrategy}>
          <div
            className="dashboard-grid"
            style={{
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
            }}
          >
            {layout.map((wl) => {
              const def = widgetMap.get(wl.id);
              if (!def) return null;
              return (
                <DashboardWidget
                  key={wl.id}
                  id={wl.id}
                  title={def.title}
                  icon={def.icon}
                  colSpan={wl.colSpan}
                  collapsed={wl.collapsed}
                  minColSpan={def.minColSpan ?? 1}
                  maxColSpan={def.maxColSpan ?? columns}
                  gridColumns={columns}
                  onResize={(newSpan) => handleResize(wl.id, newSpan)}
                  onToggleCollapse={() => handleToggleCollapse(wl.id)}
                >
                  {def.render()}
                </DashboardWidget>
              );
            })}
          </div>
        </SortableContext>

        {/* ── Drag Overlay ── */}
        <DragOverlay>
          {activeWidget && activeLayout ? (
            <div
              className="dashboard-widget dashboard-widget--overlay"
              style={{ gridColumn: `span ${activeLayout.colSpan}` }}
            >
              <div className="dashboard-widget__header">
                <div className="dashboard-widget__drag-handle">
                  <span style={{ width: 14, height: 14 }} />
                </div>
                <div className="dashboard-widget__title">
                  {activeWidget.icon && (
                    <span className="dashboard-widget__icon">
                      {activeWidget.icon}
                    </span>
                  )}
                  <span>{activeWidget.title}</span>
                </div>
              </div>
              <div
                className="dashboard-widget__content"
                style={{ opacity: 0.4, minHeight: 80 }}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

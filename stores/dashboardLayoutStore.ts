"use client";

import { create } from "zustand";

/* ═══ TYPES ═══ */
export interface WidgetLayout {
  /** Unique widget identifier */
  id: string;
  /** Widget template type (for dynamic widgets) */
  type?: string;
  /** Custom configuration for the widget (metrics, title, etc) */
  config?: any;
  /** Column span (1-4 on a 4-column grid) */
  colSpan: number;
  /** Sort order */
  order: number;
  /** Whether the widget is collapsed */
  collapsed: boolean;
}

interface DashboardLayoutState {
  /** Layout map: tabKey → array of widget layouts */
  layouts: Record<string, WidgetLayout[]>;

  /** Get the layout for a specific tab, falling back to defaults */
  getLayout: (tabKey: string, defaults: WidgetLayout[]) => WidgetLayout[];

  /** Update the full layout for a tab */
  setLayout: (tabKey: string, layout: WidgetLayout[]) => void;

  /** Update a single widget's properties */
  updateWidget: (
    tabKey: string,
    widgetId: string,
    updates: Partial<Pick<WidgetLayout, "colSpan" | "collapsed" | "config">>
  ) => void;

  /** Add a new widget to the layout */
  addWidget: (tabKey: string, widget: Omit<WidgetLayout, "order">) => void;

  /** Remove a widget from the layout */
  removeWidget: (tabKey: string, widgetId: string) => void;

  /** Reorder widgets after a drag-and-drop */
  reorderWidgets: (tabKey: string, activeId: string, overId: string) => void;

  /** Reset a tab's layout to defaults */
  resetLayout: (tabKey: string) => void;
}

/* ═══ LOCALSTORAGE HELPERS ═══ */
const STORAGE_KEY = "zef:dashboard-layouts";

function loadFromStorage(): Record<string, WidgetLayout[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(layouts: Record<string, WidgetLayout[]>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/* ═══ STORE ═══ */
export const useDashboardLayoutStore = create<DashboardLayoutState>(
  (set, get) => ({
    layouts: loadFromStorage(),

    getLayout(tabKey, defaults) {
      const stored = get().layouts[tabKey];
      if (!stored || stored.length === 0) return defaults;

      // Merge: keep stored order/colSpan/collapsed but ensure all default
      // widgets exist (in case new widgets were added since last save)
      const storedMap = new Map(stored.map((w) => [w.id, w]));
      const merged: WidgetLayout[] = [];
      let maxOrder = stored.reduce((m, w) => Math.max(m, w.order), 0);

      // First: add all stored widgets in their saved order
      for (const s of stored) {
        merged.push(s);
      }

      // Then: add any NEW defaults that don't exist in stored
      for (const d of defaults) {
        if (!storedMap.has(d.id)) {
          maxOrder++;
          merged.push({ ...d, order: maxOrder });
        }
      }

      return merged.sort((a, b) => a.order - b.order);
    },

    setLayout(tabKey, layout) {
      const layouts = { ...get().layouts, [tabKey]: layout };
      set({ layouts });
      saveToStorage(layouts);
    },

    updateWidget(tabKey, widgetId, updates) {
      const current = get().layouts[tabKey];
      if (!current) return;
      const updated = current.map((w) =>
        w.id === widgetId ? { ...w, ...updates } : w
      );
      const layouts = { ...get().layouts, [tabKey]: updated };
      set({ layouts });
      saveToStorage(layouts);
    },

    addWidget(tabKey, widget) {
      const current = get().layouts[tabKey] || [];
      const maxOrder = current.reduce((m, w) => Math.max(m, w.order), -1);
      const newWidget: WidgetLayout = { ...widget, order: maxOrder + 1 };
      const layouts = { ...get().layouts, [tabKey]: [...current, newWidget] };
      set({ layouts });
      saveToStorage(layouts);
    },

    removeWidget(tabKey, widgetId) {
      const current = get().layouts[tabKey];
      if (!current) return;
      const filtered = current.filter((w) => w.id !== widgetId);
      // Re-assign orders
      const withOrder = filtered.map((w, i) => ({ ...w, order: i }));
      const layouts = { ...get().layouts, [tabKey]: withOrder };
      set({ layouts });
      saveToStorage(layouts);
    },

    reorderWidgets(tabKey, activeId, overId) {
      const current = get().layouts[tabKey];
      if (!current) return;

      const oldIndex = current.findIndex((w) => w.id === activeId);
      const newIndex = current.findIndex((w) => w.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...current];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      // Re-assign order values
      const withOrder = reordered.map((w, i) => ({ ...w, order: i }));
      const layouts = { ...get().layouts, [tabKey]: withOrder };
      set({ layouts });
      saveToStorage(layouts);
    },

    resetLayout(tabKey) {
      const layouts = { ...get().layouts };
      delete layouts[tabKey];
      set({ layouts });
      saveToStorage(layouts);
    },
  })
);

"use client";

import { create } from "zustand";

/* ═══ TYPES ═══ */
export interface WidgetLayout {
  /** Unique widget identifier */
  id: string;
  /** Widget template type (for dynamic widgets) */
  type?: string;
  /** Custom configuration for the widget (metrics, title, etc) */
  config?: Record<string, unknown>;
  /** X position in grid */
  x: number;
  /** Y position in grid */
  y: number;
  /** Width in columns */
  w: number;
  /** Height in rows */
  h: number;
  /** Min width */
  minW?: number;
  /** Max width */
  maxW?: number;
  /** Min height */
  minH?: number;
  /** Max height */
  maxH?: number;
  /** Whether the widget is collapsed */
  collapsed: boolean;
}

interface DashboardLayoutState {
  /** Layout map: tabKey → array of widget layouts */
  layouts: Record<string, WidgetLayout[]>;

  /** Update the full layout for a tab */
  setLayout: (tabKey: string, layout: WidgetLayout[]) => void;

  /** Update a single widget's properties */
  updateWidget: (
    tabKey: string,
    widgetId: string,
    updates: Partial<Pick<WidgetLayout, "w" | "h" | "collapsed" | "config">>
  ) => void;

  /** Add a new widget to the layout */
  addWidget: (tabKey: string, widget: Omit<WidgetLayout, "x" | "y">) => void;

  /** Remove a widget from the layout */
  removeWidget: (tabKey: string, widgetId: string) => void;

  /** Reset a tab's layout to defaults */
  resetLayout: (tabKey: string) => void;
}

/* ═══ LOCALSTORAGE HELPERS ═══ */
// v3 key — invalidates v2 which had y: Infinity corruption + frozen‐memo bugs
const STORAGE_KEY = "zef:dashboard-layouts-v3";

function loadFromStorage(): Record<string, WidgetLayout[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveToStorage(layouts: Record<string, WidgetLayout[]>) {
  if (typeof window === "undefined") return;
  // Debounce writes — onLayoutChange fires every frame during drag
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }, 300);
}

/* ═══ PURE MERGE — exported for use in component ═══ */
export function mergeWithDefaults(
  stored: WidgetLayout[] | undefined,
  defaults: WidgetLayout[]
): WidgetLayout[] {
  if (!stored || stored.length === 0) return defaults;

  const storedMap = new Map(stored.map((w) => [w.id, w]));
  const merged: WidgetLayout[] = [];
  let maxY = 0;

  for (const s of stored) {
    if (s.y + s.h > maxY) maxY = s.y + s.h;
    merged.push(s);
  }

  // Append any NEW defaults that don't exist in stored
  for (const d of defaults) {
    if (!storedMap.has(d.id)) {
      merged.push({ ...d, x: 0, y: maxY });
      maxY += d.h;
    }
  }

  return merged;
}

/* ═══ STORE ═══ */
export const useDashboardLayoutStore = create<DashboardLayoutState>(
  (set, get) => ({
    layouts: loadFromStorage(),

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

      let maxY = 0;
      for (const s of current) {
        if (s.y + s.h > maxY) maxY = s.y + s.h;
      }

      const newWidget: WidgetLayout = { ...widget, x: 0, y: maxY };
      const layouts = { ...get().layouts, [tabKey]: [...current, newWidget] };
      set({ layouts });
      saveToStorage(layouts);
    },

    removeWidget(tabKey, widgetId) {
      const current = get().layouts[tabKey];
      if (!current) return;
      const filtered = current.filter((w) => w.id !== widgetId);
      const layouts = { ...get().layouts, [tabKey]: filtered };
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

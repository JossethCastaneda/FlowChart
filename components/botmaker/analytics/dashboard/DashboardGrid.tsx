"use client";

/**
 * Dependency-free drag-and-drop + resizable dashboard grid.
 * 12-column snap grid, pointer-event based. Layout is controlled by the parent
 * (persisted to localStorage there). Drag a tile by its header, resize from the
 * bottom-right handle. Editing chrome only shows when `editable` is true.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";

export interface GridItem {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

interface Props {
  items: GridItem[];
  onChange: (items: GridItem[]) => void;
  renderItem: (id: string) => React.ReactNode;
  onRemove?: (id: string) => void;
  editable?: boolean;
  cols?: number;
  rowHeight?: number;
  gap?: number;
  accent?: string;
}

type Active =
  | { id: string; mode: "move" | "resize"; startX: number; startY: number; orig: { x: number; y: number; w: number; h: number } }
  | null;

export default function DashboardGrid({
  items, onChange, renderItem, onRemove, editable = false,
  cols = 12, rowHeight = 96, gap = 12, accent = "var(--purple)",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);
  const [active, setActive] = useState<Active>(null);
  const [draft, setDraft] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const cellW = Math.max(40, (width - gap * (cols - 1)) / cols);
  const unitX = cellW + gap;
  const unitY = rowHeight + gap;

  const pos = useCallback((it: GridItem) => {
    const d = draft[it.id];
    const x = d?.x ?? it.x, y = d?.y ?? it.y, w = d?.w ?? it.w, h = d?.h ?? it.h;
    return {
      left: Math.round(x * unitX),
      top: Math.round(y * unitY),
      width: Math.round(w * cellW + (w - 1) * gap),
      height: Math.round(h * rowHeight + (h - 1) * gap),
    };
  }, [draft, unitX, unitY, cellW, gap, rowHeight]);

  // Global pointer handlers while dragging/resizing.
  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - active.startX;
      const dy = e.clientY - active.startY;
      const dCols = Math.round(dx / unitX);
      const dRows = Math.round(dy / unitY);
      const it = items.find((i) => i.id === active.id);
      if (!it) return;
      if (active.mode === "move") {
        const x = clamp(active.orig.x + dCols, 0, cols - active.orig.w);
        const y = Math.max(0, active.orig.y + dRows);
        setDraft({ [active.id]: { x, y, w: active.orig.w, h: active.orig.h } });
      } else {
        const w = clamp(active.orig.w + dCols, it.minW ?? 2, cols - active.orig.x);
        const h = Math.max(it.minH ?? 2, active.orig.h + dRows);
        setDraft({ [active.id]: { x: active.orig.x, y: active.orig.y, w, h } });
      }
    };
    const onUp = () => {
      const d = draft[active.id];
      if (d) onChange(items.map((i) => (i.id === active.id ? { ...i, ...d } : i)));
      setActive(null);
      setDraft({});
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [active, draft, items, onChange, unitX, unitY, cols]);

  const start = (id: string, mode: "move" | "resize") => (e: React.PointerEvent) => {
    if (!editable) return;
    e.preventDefault();
    const it = items.find((i) => i.id === id);
    if (!it) return;
    setActive({ id, mode, startX: e.clientX, startY: e.clientY, orig: { x: it.x, y: it.y, w: it.w, h: it.h } });
  };

  const maxRow = items.reduce((m, it) => {
    const d = draft[it.id];
    return Math.max(m, (d?.y ?? it.y) + (d?.h ?? it.h));
  }, 0);
  const containerHeight = Math.max(1, maxRow) * unitY;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", height: containerHeight, transition: active ? "none" : "height 0.2s" }}>
      {items.map((it) => {
        const p = pos(it);
        const isActive = active?.id === it.id;
        return (
          <div
            key={it.id}
            style={{
              position: "absolute", left: p.left, top: p.top, width: p.width, height: p.height,
              transition: isActive ? "none" : "left 0.18s, top 0.18s, width 0.18s, height 0.18s",
              background: "var(--row-hover, rgba(255,255,255,0.03))",
              border: `1px solid ${isActive ? accent + "80" : "var(--hairline, rgba(255,255,255,0.08))"}`,
              borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column",
              boxShadow: isActive ? `0 12px 36px rgba(0,0,0,0.45)` : "none", zIndex: isActive ? 50 : 1,
            }}
          >
            <div
              onPointerDown={start(it.id, "move")}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 10px",
                borderBottom: "1px solid var(--hairline, rgba(255,255,255,0.06))",
                cursor: editable ? "grab" : "default", flexShrink: 0,
                background: editable ? "rgba(168,85,247,0.06)" : "transparent", userSelect: "none",
              }}
            >
              {editable && <GripVertical style={{ width: 13, height: 13, color: accent, opacity: 0.7 }} />}
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.02em", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {it.title}
              </span>
              {editable && onRemove && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onRemove(it.id)}
                  title="Quitar widget"
                  style={{ display: "flex", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2, borderRadius: 6 }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: 12, minHeight: 0 }}>{renderItem(it.id)}</div>

            {editable && (
              <div
                onPointerDown={start(it.id, "resize")}
                title="Redimensionar"
                style={{
                  position: "absolute", right: 0, bottom: 0, width: 18, height: 18, cursor: "nwse-resize",
                  background: `linear-gradient(135deg, transparent 50%, ${accent}90 50%)`, borderBottomRightRadius: 12,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

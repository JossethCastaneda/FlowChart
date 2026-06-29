"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";

interface ConnectedPage {
  id: string;
  name: string;
  picture: string | null;
  instagramId: string | null;
}

interface PageSelectorProps {
  module: string;
  onSelectionChange?: (selectedPageIds: string[]) => void;
  multiSelect?: boolean;
}

/**
 * Multi-select page picker. Fetches connected pages from the Integration
 * and lets users check/uncheck which pages a module should use.
 */
export function PageSelector({ module, onSelectionChange, multiSelect = true }: PageSelectorProps) {
  const [pages, setPages] = useState<ConnectedPage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/connect/status")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const modPages = data?.modules?.[module]?.pages || data?.pages || [];
        if (modPages.length) {
          setPages(modPages);
          // Select all by default
          setSelectedIds(new Set(modPages.map((p: any) => p.id)));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [module]);

  useEffect(() => {
    onSelectionChange?.(Array.from(selectedIds));
  }, [selectedIds]);

  const toggle = (pageId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (multiSelect) {
        if (next.has(pageId)) {
          // Don't allow deselecting all
          if (next.size > 1) next.delete(pageId);
        } else {
          next.add(pageId);
        }
      } else {
        next.clear();
        next.add(pageId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === pages.length) {
      // Keep at least one
      setSelectedIds(new Set([pages[0]?.id].filter(Boolean)));
    } else {
      setSelectedIds(new Set(pages.map(p => p.id)));
    }
  };

  if (loading || pages.length === 0) return null;

  const selectedCount = selectedIds.size;
  const label = selectedCount === pages.length
    ? "Todas las páginas"
    : `${selectedCount} de ${pages.length} páginas`;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8,
          background: "rgba(255,255,255,0.09)",
          border: "1px solid var(--hairline)",
          color: "var(--foreground)", fontSize: 12, cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
      >
        <Globe style={{ width: 12, height: 12, color: "var(--cyan)" }} />
        {label}
        <ChevronDown style={{
          width: 12, height: 12, color: "var(--text-muted)",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          minWidth: 280, borderRadius: 10, overflow: "hidden",
          background: "rgba(15,15,30,0.98)",
          border: "1px solid var(--hairline)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          zIndex: 100,
        }}>
          {/* Header with Select All */}
          {multiSelect && pages.length > 1 && (
            <button
              onClick={toggleAll}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "10px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-secondary)", fontSize: 11,
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                border: `1px solid ${selectedIds.size === pages.length ? "var(--cyan)" : "rgba(255,255,255,0.15)"}`,
                background: selectedIds.size === pages.length ? "rgba(0,212,255,0.15)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selectedIds.size === pages.length && (
                  <Check style={{ width: 10, height: 10, color: "var(--cyan)" }} />
                )}
              </div>
              Seleccionar todas
            </button>
          )}

          {/* Page list */}
          {pages.map(page => {
            const isSelected = selectedIds.has(page.id);
            return (
              <button
                key={page.id}
                onClick={() => toggle(page.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "10px 14px",
                  background: isSelected ? "rgba(0,212,255,0.04)" : "transparent",
                  border: "none", cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = "var(--row-hover)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isSelected ? "rgba(0,212,255,0.04)" : "transparent";
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: `1px solid ${isSelected ? "var(--cyan)" : "rgba(255,255,255,0.15)"}`,
                  background: isSelected ? "rgba(0,212,255,0.15)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}>
                  {isSelected && (
                    <Check style={{ width: 10, height: 10, color: "var(--cyan)" }} />
                  )}
                </div>

                {/* Page picture */}
                {page.picture ? (
                  <img
                    src={page.picture}
                    alt={page.name}
                    style={{
                      width: 24, height: 24, borderRadius: "50%",
                      objectFit: "cover", flexShrink: 0,
                    }}
                  />
                ) : (
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: "rgba(0,212,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 600, color: "var(--cyan)",
                    flexShrink: 0,
                  }}>
                    {page.name.charAt(0)}
                  </div>
                )}

                {/* Page info */}
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)" }}>
                    {page.name}
                  </div>
                  {page.instagramId && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      + Instagram vinculado
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Click outside overlay */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99 }}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}

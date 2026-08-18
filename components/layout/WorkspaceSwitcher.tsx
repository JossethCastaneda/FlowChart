"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Check } from "lucide-react";
import { HoloIcon } from "@/components/ui/HoloIcon";
import type { Workspace } from "@/types/workspace";

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [active, setActive] = useState<Workspace | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspace", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.data && data.data.length > 0) {
          setWorkspaces(data.data);
          // El activo es el primero (API ordena por cookie active)
          setActive(data.data[0]);
        }
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSwitch(ws: Workspace) {
    if (ws.id === active?.id) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      const res = await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: ws.id }),
      });
      if (res.ok) {
        // Recargar página completa para que TODAS las queries
        // tomen el nuevo workspace activo desde la cookie
        // eslint-disable-next-line react-hooks/immutability -- TODO: [React] Refactor de hooks anti-patrón
        window.location.href = "/dashboard/resumen";
        return;
      }
    } catch {
      // Keep the switcher interactive after transient network failures.
    }
    setSwitching(false);
  }

  if (loading || !active) return null;

  return (
    <div ref={dropdownRef} className="workspace-switcher" style={{
      padding: "12px",
      position: "relative",
    }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "8px 12px",
          background: "color-mix(in srgb, #0E7A80 12%, transparent)",
          borderRadius: "8px",
          border: "none",
          cursor: switching ? "wait" : "pointer",
          color: "var(--fc-text)",
          opacity: switching ? 0.6 : 1,
          transition: "all 0.2s ease",
        }}
      >
        <div style={{
          width: 32, height: 32,
          borderRadius: "6px",
          background: "#0E7A80",
          display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
          fontFamily: "var(--fc-font-sans)",
          fontSize: "11px", fontWeight: 600, color: "#FFFFFF",
        }}>
          {active.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="sidebar-hide-compact" style={{ flex: 1, textAlign: "left", minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
          <p style={{
            fontFamily: "var(--fc-font-sans)",
            fontSize: "13px", fontWeight: 500,
            color: "var(--fc-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {active.name}
          </p>
          <p style={{
            fontFamily: "var(--fc-font-sans)",
            fontSize: "11px",
            color: "var(--fc-text-muted)",
          }}>
            {active.role.toUpperCase()} · {active.memberCount} miembro{active.memberCount !== 1 ? "s" : ""}
          </p>
        </div>
        <HoloIcon icon={ChevronDown} variant="cyan" isActive={false} className="sidebar-hide-compact" style={{
          width: 16, height: 16,
          flexShrink: 0,
          color: "var(--fc-text-muted)",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }} />
      </button>

      {open && (
        <div className="workspace-switcher-dropdown" role="menu" aria-label="Workspaces" style={{
          position: "absolute",
          top: "100%",
          left: "12px",
          right: "12px",
          zIndex: 200,
          background: "var(--fc-surface-overlay)",
          border: "1px solid var(--fc-border-strong)",
          borderRadius: "8px",
          marginTop: "4px",
          maxHeight: "300px",
          overflowY: "auto",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleSwitch(ws)}
              role="menuitem"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                background: ws.id === active.id
                  ? "var(--fc-surface-hover)" : "none",
                border: "none",
                cursor: "pointer",
                color: "var(--fc-text)",
                borderBottom: "1px solid var(--fc-border-subtle)",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--fc-surface-hover)")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  ws.id === active.id
                    ? "var(--fc-surface-hover)" : "transparent")}
            >
              <div style={{
                width: 32, height: 32,
                background: ws.id === active.id
                  ? "#0E7A80"
                  : "var(--fc-accent-wash)",
                display: "flex", alignItems: "center",
                justifyContent: "center",
                fontSize: "11px", fontWeight: 600, color: ws.id === active.id ? "#FFFFFF" : "var(--fc-text)",
                fontFamily: "var(--fc-font-sans)",
                flexShrink: 0,
                borderRadius: "6px",
              }}>
                {ws.name.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                <p style={{
                  fontFamily: "var(--fc-font-sans)",
                  fontSize: "13px", fontWeight: 500,
                  color: "var(--fc-text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {ws.name}
                </p>
                <p style={{
                  fontFamily: "var(--fc-font-sans)",
                  fontSize: "11px",
                  color: "var(--fc-text-muted)",
                }}>
                  {ws.role.toUpperCase()}
                </p>
              </div>
              {ws.id === active.id && (
                <HoloIcon icon={Check} variant="cyan" isActive={false} style={{
                  width: 16, height: 16, flexShrink: 0, color: "#0E7A80"
                }} />
              )}
            </button>
          ))}

          {/* Crear nuevo workspace */}
          <button
            onClick={() => {
              setOpen(false);
              window.location.href = "/onboarding?new=1";
            }}
            role="menuitem"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--fc-text-secondary)",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--fc-surface-hover)")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")}
          >
            <div style={{
              width: 32, height: 32,
              background: "color-mix(in srgb, #0E7A80 8%, transparent)",
              border: "1px dashed #A6C8C9",
              display: "flex", alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              borderRadius: "6px",
            }}>
              <HoloIcon icon={Plus} variant="cyan" isActive={false} style={{
                width: 16, height: 16, color: "#0E7A80"
              }} />
            </div>
            <span style={{ fontFamily: "var(--fc-font-sans)", fontSize: "13px", color: "var(--fc-text-secondary)" }}>
              Crear nuevo workspace
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

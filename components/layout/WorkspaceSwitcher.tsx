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
      borderBottom: "1px solid var(--fc-border-subtle)",
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
          gap: "8px",
          padding: "8px 10px",
          background: "var(--fc-accent-wash)",
          border: "1px solid var(--fc-border)",
          cursor: switching ? "wait" : "pointer",
          color: "var(--fc-text)",
          opacity: switching ? 0.6 : 1,
          transition: "all 0.2s ease",
        }}
      >
        <div style={{
          width: 28, height: 28,
          background: "var(--fc-accent)",
          display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
          fontFamily: "var(--fc-font-sans)",
          fontSize: "10px", fontWeight: 700, color: "var(--fc-text)",
        }}>
          {active.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="sidebar-hide-compact" style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <p style={{
            fontFamily: "var(--fc-font-sans)",
            fontSize: "10px", fontWeight: 600,
            color: "var(--fc-text)", letterSpacing: "0.1em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {active.name}
          </p>
          <p style={{
            fontSize: "9px",
            color: "var(--fc-text-muted)",
            marginTop: "1px",
          }}>
            {active.role} · {active.memberCount} miembro
            {active.memberCount !== 1 ? "s" : ""}
          </p>
        </div>
        <HoloIcon icon={ChevronDown} variant="cyan" isActive={open} className="sidebar-hide-compact" style={{
          width: 14, height: 14,
          flexShrink: 0,
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
          
          marginTop: "4px",
          maxHeight: "300px",
          overflowY: "auto",
          boxShadow: "var(--fc-shadow-overlay)",
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
                width: 24, height: 24,
                background: ws.id === active.id
                  ? "var(--fc-accent)"
                  : "var(--fc-accent-wash)",
                display: "flex", alignItems: "center",
                justifyContent: "center",
                fontSize: "10px", fontWeight: 700,
                fontFamily: "var(--fc-font-sans)",
                flexShrink: 0,
              }}>
                {ws.name.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: "12px", color: "var(--fc-text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {ws.name}
                </p>
                <p style={{
                  fontSize: "10px",
                  color: "var(--fc-text-muted)",
                }}>
                  {ws.role}
                </p>
              </div>
              {ws.id === active.id && (
                <HoloIcon icon={Check} variant="cyan" isActive={true} style={{
                  width: 12, height: 12, flexShrink: 0,
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
              width: 24, height: 24,
              background: "var(--fc-accent-wash)",
              border: "1px dashed var(--fc-border-strong)",
              display: "flex", alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <HoloIcon icon={Plus} variant="cyan" isActive={true} style={{
                width: 12, height: 12, opacity: 0.5
              }} />
            </div>
            <span style={{ fontSize: "12px" }}>
              Crear nuevo workspace
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Check } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
}

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [active, setActive] = useState<Workspace | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((data) => {
        if (data.data && data.data.length > 0) {
          setWorkspaces(data.data);
          // El activo es el primero (API ordena por cookie active)
          setActive(data.data[0]);
        }
        setLoading(false);
      });
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
    const res = await fetch("/api/workspace/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: ws.id }),
    });
    if (res.ok) {
      // Recargar página completa para que TODAS las queries
      // tomen el nuevo workspace activo desde la cookie
      window.location.href = "/dashboard/resumen";
    } else {
      setSwitching(false);
    }
  }

  if (loading || !active) return null;

  return (
    <div ref={dropdownRef} style={{
      padding: "12px",
      borderBottom: "1px solid rgba(0,212,255,0.08)",
      position: "relative",
    }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 10px",
          background: "rgba(0,212,255,0.04)",
          border: "1px solid rgba(0,212,255,0.1)",
          cursor: switching ? "wait" : "pointer",
          color: "white",
          opacity: switching ? 0.6 : 1,
          transition: "all 0.2s ease",
        }}
      >
        <div style={{
          width: 28, height: 28,
          background: "linear-gradient(135deg, #00d4ff, #0088cc)",
          display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "10px", fontWeight: 700, color: "white",
        }}>
          {active.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="sidebar-hide-compact" style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <p style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "10px", fontWeight: 600,
            color: "white", letterSpacing: "0.1em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {active.name}
          </p>
          <p style={{
            fontSize: "9px",
            color: "rgba(148,163,184,0.4)",
            marginTop: "1px",
          }}>
            {active.role} · {active.memberCount} miembro
            {active.memberCount !== 1 ? "s" : ""}
          </p>
        </div>
        <ChevronDown className="sidebar-hide-compact" style={{
          width: 14, height: 14,
          color: "rgba(148,163,184,0.4)",
          flexShrink: 0,
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }} />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: "12px",
          right: "12px",
          zIndex: 200,
          background: "rgba(5,8,18,0.98)",
          border: "1px solid rgba(0,212,255,0.15)",
          backdropFilter: "blur(20px)",
          marginTop: "4px",
          maxHeight: "300px",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleSwitch(ws)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                background: ws.id === active.id
                  ? "rgba(0,212,255,0.06)" : "none",
                border: "none",
                cursor: "pointer",
                color: "white",
                borderBottom: "1px solid rgba(0,212,255,0.05)",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "rgba(0,212,255,0.08)")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  ws.id === active.id
                    ? "rgba(0,212,255,0.06)" : "transparent")}
            >
              <div style={{
                width: 24, height: 24,
                background: ws.id === active.id
                  ? "linear-gradient(135deg, #00d4ff, #0088cc)"
                  : "rgba(0,212,255,0.15)",
                display: "flex", alignItems: "center",
                justifyContent: "center",
                fontSize: "10px", fontWeight: 700,
                fontFamily: "'Orbitron', sans-serif",
                flexShrink: 0,
              }}>
                {ws.name.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: "12px", color: "white",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {ws.name}
                </p>
                <p style={{
                  fontSize: "10px",
                  color: "rgba(148,163,184,0.4)",
                }}>
                  {ws.role}
                </p>
              </div>
              {ws.id === active.id && (
                <Check style={{
                  width: 12, height: 12,
                  color: "#00d4ff", flexShrink: 0,
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
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(148,163,184,0.6)",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                "rgba(0,212,255,0.04)")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")}
          >
            <div style={{
              width: 24, height: 24,
              background: "rgba(0,212,255,0.05)",
              border: "1px dashed rgba(0,212,255,0.2)",
              display: "flex", alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <Plus style={{
                width: 12, height: 12,
                color: "rgba(0,212,255,0.5)",
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

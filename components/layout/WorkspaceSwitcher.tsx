"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown, Plus, Check } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
}

export function WorkspaceSwitcher() {
  const { data: session } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [active, setActive] = useState<Workspace | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          setWorkspaces(data.data);
          const current = data.data.find(
            (w: Workspace) => w.id === session.activeWorkspaceId
          ) || data.data[0];
          setActive(current || null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (loading || !active) return null;

  return (
    <div ref={ref} style={{ padding: "12px", borderBottom: "1px solid var(--border)", position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 10px",
          background: "rgba(0,212,255,0.04)",
          border: "1px solid rgba(0,212,255,0.1)",
          cursor: "pointer",
          color: "white",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            background: "linear-gradient(135deg, var(--cyan), #0088cc)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "11px",
            fontWeight: 700,
            color: "white",
          }}
        >
          {active.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="sidebar-hide-compact" style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "10px", fontWeight: 600, color: "white", letterSpacing: "0.1em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {active.name}
          </p>
          <p style={{ fontSize: "10px", color: "rgba(148,163,184,0.4)", marginTop: "1px" }}>
            {active.role}
          </p>
        </div>
        <ChevronDown className="sidebar-hide-compact" style={{ width: 14, height: 14, color: "rgba(148,163,184,0.4)", flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "12px",
            right: "12px",
            zIndex: 200,
            background: "rgba(5,8,18,0.98)",
            border: "1px solid rgba(0,212,255,0.15)",
            backdropFilter: "blur(20px)",
            marginTop: "4px",
          }}
        >
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => { setActive(ws); setOpen(false); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "white",
                borderBottom: "1px solid rgba(0,212,255,0.05)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,212,255,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <div style={{ width: 24, height: 24, background: ws.id === active.id ? "var(--cyan)" : "rgba(0,212,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, fontFamily: "'Orbitron', sans-serif", flexShrink: 0, color: ws.id === active.id ? "#050812" : "var(--cyan)" }}>
                {ws.name.substring(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <p style={{ fontSize: "12px", color: "white" }}>{ws.name}</p>
                <p style={{ fontSize: "10px", color: "rgba(148,163,184,0.4)" }}>{ws.memberCount} miembro{ws.memberCount !== 1 ? "s" : ""}</p>
              </div>
              {ws.id === active.id && <Check style={{ width: 12, height: 12, color: "var(--cyan)" }} />}
            </button>
          ))}

          <button
            onClick={() => { setOpen(false); window.location.href = "/onboarding"; }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(148,163,184,0.5)",
              borderTop: "1px solid rgba(0,212,255,0.08)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(6,214,160,0.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Plus style={{ width: 14, height: 14 }} />
            <span style={{ fontSize: "12px" }}>Nuevo workspace</span>
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, Clock, AlertTriangle, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, { icon: typeof Bell; color: string }> = {
  task_assigned: { icon: UserPlus, color: "#00d4ff" },
  sla_warning: { icon: Clock, color: "#fdab3d" },
  sla_expired: { icon: AlertTriangle, color: "#e2445c" },
  status_changed: { icon: Check, color: "#00c875" },
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.data) setNotifications(data.data);
      if (data.unreadCount !== undefined) setUnreadCount(data.unreadCount);
    } catch {}
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Browser notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Show browser notification for new unread items
  useEffect(() => {
    if (unreadCount > 0 && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const latest = notifications.find(n => !n.read);
      if (latest) {
        const bNotif = new window.Notification(`SODARE — ${latest.title}`, {
          body: latest.message,
          icon: "/icon.svg",
          tag: latest.id,
        });
        bNotif.onclick = () => {
          window.focus();
          if (latest.link) router.push(latest.link);
          bNotif.close();
        };
      }
    }
  }, [unreadCount, notifications, router]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Calculate panel position relative to the bell button
  useEffect(() => {
    if (open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  const markAllRead = async () => {
    setLoading(true);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
    setLoading(false);
  };

  const handleClick = (n: Notification) => {
    if (n.link) router.push(n.link);
    setOpen(false);
  };

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <>
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        aria-label="Notificaciones"
        aria-expanded={open}
        style={{
          position: "relative", background: "none", border: "none", cursor: "pointer",
          padding: 6, color: unreadCount > 0 ? "#00d4ff" : "rgba(148,163,184,0.65)",
          transition: "color 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "#00d4ff"}
        onMouseLeave={e => { if (unreadCount === 0) e.currentTarget.style.color = "rgba(148,163,184,0.65)"; }}
      >
        <Bell style={{ width: 18, height: 18 }} />
        <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>Notificaciones</span>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 0, minWidth: 16, height: 16,
            background: "#e2445c", borderRadius: 8, fontSize: 9, fontWeight: 700,
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px", boxShadow: "0 0 8px rgba(226,68,92,0.5)",
            animation: "status-pulse 2s infinite",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Portal-rendered notification panel — always on top */}
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Panel de notificaciones"
          style={{
            position: "fixed",
            top: panelPos.top,
            right: panelPos.right,
            width: 370,
            maxWidth: "calc(100vw - 24px)",
            maxHeight: "min(480px, calc(100vh - 80px))",
            background: "#0c1020",
            border: "1px solid rgba(0,212,255,0.18)",
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 16px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,212,255,0.08)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            animation: "fadeInScale 0.2s ease-out",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px", borderBottom: "1px solid rgba(0,212,255,0.08)",
            background: "rgba(0,212,255,0.03)", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell style={{ width: 14, height: 14, color: "#00d4ff" }} />
              <span style={{
                fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700,
                color: "#e2e8f0", letterSpacing: "0.1em",
              }}>NOTIFICACIONES</span>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: "#fff", background: "#e2445c",
                  borderRadius: 8, padding: "1px 6px", minWidth: 16, textAlign: "center",
                }}>{unreadCount}</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} disabled={loading} style={{
                  fontSize: 10, color: "#00d4ff", background: "none", border: "none",
                  cursor: "pointer", opacity: loading ? 0.5 : 1, fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}>
                  Marcar todo leído
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Cerrar notificaciones" style={{
                background: "none", border: "none", cursor: "pointer", color: "#64748b",
                padding: 2, display: "flex",
              }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <Bell style={{ width: 28, height: 28, color: "rgba(100,116,139,0.4)", margin: "0 auto 10px" }} />
                <p style={{ fontSize: 12, color: "rgba(148,163,184,0.5)", margin: 0 }}>Sin notificaciones</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => {
                const typeCfg = TYPE_ICONS[n.type] || TYPE_ICONS.task_assigned;
                const Icon = typeCfg.icon;
                return (
                  <div key={n.id} onClick={() => handleClick(n)} style={{
                    display: "flex", gap: 12, padding: "12px 18px", cursor: n.link ? "pointer" : "default",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: n.read ? "transparent" : "rgba(0,212,255,0.04)",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "rgba(0,212,255,0.04)"}>
                    <div style={{
                      flexShrink: 0, width: 32, height: 32, borderRadius: 8,
                      background: `${typeCfg.color}18`, display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon style={{ width: 14, height: 14, color: typeCfg.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 3 }}>
                        <span style={{
                          fontSize: 12, fontWeight: n.read ? 500 : 700,
                          color: n.read ? "#94a3b8" : "#e2e8f0",
                          lineHeight: 1.3,
                        }}>{n.title}</span>
                        <span style={{ fontSize: 9, color: "rgba(148,163,184,0.6)", flexShrink: 0, marginTop: 2 }}>{timeAgo(n.createdAt)}</span>
                      </div>
                      <p style={{
                        fontSize: 11, color: n.read ? "rgba(148,163,184,0.5)" : "rgba(148,163,184,0.8)",
                        margin: 0, lineHeight: 1.4, display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>{n.message}</p>
                    </div>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00d4ff", flexShrink: 0, alignSelf: "center", boxShadow: "0 0 8px rgba(0,212,255,0.5)" }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

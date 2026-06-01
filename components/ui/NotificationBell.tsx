"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, Clock, AlertTriangle, UserPlus, ExternalLink } from "lucide-react";
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
  const ref = useRef<HTMLDivElement>(null);
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
          tag: latest.id, // Prevents duplicates
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
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

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
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        style={{
          position: "relative", background: "none", border: "none", cursor: "pointer",
          padding: 6, color: unreadCount > 0 ? "#00d4ff" : "rgba(148,163,184,0.4)",
          transition: "color 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "#00d4ff"}
        onMouseLeave={e => { if (unreadCount === 0) e.currentTarget.style.color = "rgba(148,163,184,0.4)"; }}
      >
        <Bell style={{ width: 18, height: 18 }} />
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

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340,
          background: "rgba(8,12,24,0.97)", border: "1px solid rgba(0,212,255,0.12)",
          borderRadius: 8, overflow: "hidden",
          boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
          zIndex: 100,
          animation: "fadeInScale 0.2s ease-out",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px", borderBottom: "1px solid rgba(0,212,255,0.06)",
          }}>
            <span style={{
              fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700,
              color: "#e2e8f0", letterSpacing: "0.1em",
            }}>NOTIFICACIONES</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} disabled={loading} style={{
                fontSize: 10, color: "#00d4ff", background: "none", border: "none",
                cursor: "pointer", opacity: loading ? 0.5 : 1,
              }}>
                Marcar todo leido
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <Bell style={{ width: 24, height: 24, color: "rgba(148,163,184,0.15)", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 12, color: "rgba(148,163,184,0.3)" }}>Sin notificaciones</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => {
                const typeCfg = TYPE_ICONS[n.type] || TYPE_ICONS.task_assigned;
                const Icon = typeCfg.icon;
                return (
                  <div key={n.id} onClick={() => handleClick(n)} style={{
                    display: "flex", gap: 10, padding: "12px 16px", cursor: n.link ? "pointer" : "default",
                    borderBottom: "1px solid rgba(255,255,255,0.02)",
                    background: n.read ? "transparent" : "rgba(0,212,255,0.02)",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "rgba(0,212,255,0.02)"}>
                    <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 6, background: `${typeCfg.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon style={{ width: 13, height: 13, color: typeCfg.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: n.read ? "rgba(148,163,184,0.5)" : "#e2e8f0" }}>{n.title}</span>
                        <span style={{ fontSize: 9, color: "rgba(148,163,184,0.3)", flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.message}</p>
                    </div>
                    {!n.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", flexShrink: 0, alignSelf: "center", boxShadow: "0 0 6px rgba(0,212,255,0.5)" }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

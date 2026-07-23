import { create } from "zustand";

/* ── Alert Types ── */
export type AlertSeverity = "info" | "warning" | "danger" | "success";

export interface ZefirusAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  source: string;       // e.g. "gasto", "webhook", "system"
  projectId?: string;
  projectName?: string;
  dismissed: boolean;
}

interface AlertsState {
  alerts: ZefirusAlert[];
  unreadCount: number;
  soundEnabled: boolean;
  addAlert: (alert: Omit<ZefirusAlert, "id" | "timestamp" | "read" | "dismissed">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  toggleSound: () => void;
}

const STORAGE_KEY = "zefirus-alerts";
const MAX_ALERTS = 200;

function loadAlerts(): ZefirusAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAlerts(alerts: ZefirusAlert[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, MAX_ALERTS)));
  } catch { /* quota exceeded — silently fail */ }
}

function loadSoundPref(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem("zefirus-alerts-sound");
    return v === null ? true : v === "true";
  } catch { return true; }
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: loadAlerts(),
  unreadCount: loadAlerts().filter(a => !a.read).length,
  soundEnabled: loadSoundPref(),

  addAlert: (alert) => {
    const newAlert: ZefirusAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      read: false,
      dismissed: false,
    };

    set((state) => {
      const updated = [newAlert, ...state.alerts].slice(0, MAX_ALERTS);
      saveAlerts(updated);
      return {
        alerts: updated,
        unreadCount: updated.filter(a => !a.read).length,
      };
    });

    // Play sound if enabled
    if (get().soundEnabled) {
      playAlertSound(alert.severity);
    }
  },

  markRead: (id) => {
    set((state) => {
      const updated = state.alerts.map(a => a.id === id ? { ...a, read: true } : a);
      saveAlerts(updated);
      return { alerts: updated, unreadCount: updated.filter(a => !a.read).length };
    });
  },

  markAllRead: () => {
    set((state) => {
      const updated = state.alerts.map(a => ({ ...a, read: true }));
      saveAlerts(updated);
      return { alerts: updated, unreadCount: 0 };
    });
  },

  dismiss: (id) => {
    set((state) => {
      const updated = state.alerts.map(a => a.id === id ? { ...a, dismissed: true, read: true } : a);
      saveAlerts(updated);
      return { alerts: updated, unreadCount: updated.filter(a => !a.read).length };
    });
  },

  clearAll: () => {
    saveAlerts([]);
    set({ alerts: [], unreadCount: 0 });
  },

  toggleSound: () => {
    set((state) => {
      const next = !state.soundEnabled;
      if (typeof window !== "undefined") {
        localStorage.setItem("zefirus-alerts-sound", String(next));
      }
      return { soundEnabled: next };
    });
  },
}));

/* ── Sound System ── */
function playAlertSound(severity: AlertSeverity) {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Different tones per severity
    const tones: Record<AlertSeverity, { freq: number; duration: number; type: OscillatorType }> = {
      danger:  { freq: 880, duration: 0.25, type: "square" },
      warning: { freq: 660, duration: 0.2,  type: "triangle" },
      info:    { freq: 520, duration: 0.15, type: "sine" },
      success: { freq: 740, duration: 0.15, type: "sine" },
    };

    const t = tones[severity] || tones.info;
    osc.type = t.type;
    osc.frequency.setValueAtTime(t.freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t.duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + t.duration);

    // Cleanup
    setTimeout(() => ctx.close(), (t.duration + 0.1) * 1000);
  } catch {
    // AudioContext not supported or user hasn't interacted yet
  }
}

import { create } from "zustand";

interface ClipboardItem {
  id: string;
  name: string;
  level: "campaigns" | "adsets" | "ads";
}

interface ClipboardState {
  items: ClipboardItem[];
  timestamp: number | null;
  copy: (items: ClipboardItem[]) => void;
  paste: () => ClipboardItem[];
  clear: () => void;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  items: (() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem("zefirus-clipboard");
      return stored ? JSON.parse(stored).items || [] : [];
    } catch { return []; }
  })(),
  timestamp: (() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem("zefirus-clipboard");
      return stored ? JSON.parse(stored).timestamp || null : null;
    } catch { return null; }
  })(),

  copy: (items) => {
    const timestamp = Date.now();
    set({ items, timestamp });
    try {
      sessionStorage.setItem("zefirus-clipboard", JSON.stringify({ items, timestamp }));
    } catch {}
  },

  paste: () => {
    const { items } = get();
    return items;
  },

  clear: () => {
    set({ items: [], timestamp: null });
    try {
      sessionStorage.removeItem("zefirus-clipboard");
    } catch {}
  },
}));

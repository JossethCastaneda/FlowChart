"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Prevent hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-24 skeleton rounded-md" />;
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg border border-[var(--fc-border)] bg-[var(--fc-surface)]">
      <button
        onClick={() => setTheme("light")}
        className={`p-1.5 rounded-md transition-colors ${
          theme === "light"
            ? "bg-[var(--fc-accent-wash)] text-[var(--fc-accent)]"
            : "text-[var(--fc-text-muted)] hover:text-[var(--fc-text)] hover:bg-[var(--surface-hover)]"
        }`}
        title="Modo Claro"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-1.5 rounded-md transition-colors ${
          theme === "dark"
            ? "bg-[var(--fc-accent-wash)] text-[var(--fc-accent)]"
            : "text-[var(--fc-text-muted)] hover:text-[var(--fc-text)] hover:bg-[var(--surface-hover)]"
        }`}
        title="Modo Oscuro (Ink)"
      >
        <Moon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-1.5 rounded-md transition-colors ${
          theme === "system"
            ? "bg-[var(--fc-accent-wash)] text-[var(--fc-accent)]"
            : "text-[var(--fc-text-muted)] hover:text-[var(--fc-text)] hover:bg-[var(--surface-hover)]"
        }`}
        title="Usar Sistema"
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
}

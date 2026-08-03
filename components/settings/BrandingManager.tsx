"use client";

import { useState, useEffect } from "react";
import { Palette, Image as ImageIcon } from "lucide-react";

export function BrandingManager() {
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#5b9bff");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inp: React.CSSProperties = {
    padding: "8px 12px",
    background: "var(--cyan-dim)",
    border: "1px solid rgba(59,130,246,0.1)",
    color: "var(--foreground)",
    fontSize: "13px",
    outline: "none",
    width: "100%",
  };

  useEffect(() => {
    fetch("/api/workspace/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.branding) {
          setLogoUrl(data.branding.logoUrl || "");
          setAccentColor(data.branding.accentColor || "#5b9bff");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Error al cargar configuración.");
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // First, get the full current config since PUT replaces it.
      const resCfg = await fetch("/api/workspace/settings");
      const currentCfg = await resCfg.json();

      const payload = {
        ...currentCfg,
        branding: {
          logoUrl,
          accentColor,
        },
      };

      const res = await fetch("/api/workspace/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar branding");
      }

      setSuccess("Branding actualizado correctamente. (Recarga la página para ver los cambios)");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse h-20 bg-[var(--surface-hover)]/50 rounded-lg"></div>;
  }

  return (
    <div className="glass-panel p-4 md:p-6 mt-6">
      <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 md:mb-5">
        <span className="section-title flex items-center gap-2">
          <Palette className="w-4 h-4 text-[var(--cyan)]" /> Branding (Marca Blanca)
        </span>
      </div>
      
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Personaliza la apariencia de la plataforma para los enlaces mágicos compartidos con tus clientes.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1.5 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> URL del Logo
          </label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            style={inp}
            placeholder="https://ejemplo.com/logo.png"
          />
        </div>

        <div>
          <label className="text-[11px] text-[var(--text-muted)] block mb-1.5 flex items-center gap-1">
            <Palette className="w-3 h-3" /> Color de Acento (HEX)
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-10 h-10 p-1 bg-transparent border border-[var(--border)] rounded cursor-pointer"
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              style={{ ...inp, width: "120px" }}
              placeholder="#5b9bff"
              pattern="^#[0-9a-fA-F]{6}$"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        {success && <p className="text-xs text-emerald-400">{success}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full sm:w-auto self-start mt-2"
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Guardando..." : "Guardar Branding"}
        </button>
      </div>
    </div>
  );
}

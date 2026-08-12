"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { openConnectPopup } from "@/lib/connect-popup";
import { X, Plus } from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { MetaIcon, FacebookIcon, InstagramIcon } from "@/components/ui/AppIcons";

interface ConnectedProfile {
  id?: string;
  name: string | null;
  picture: string | null;
}

// Identidad estable: un literal por defecto se recrearía en cada render y haría
// que el efecto refetchee en bucle.
const DEFAULT_PROVIDERS = ["meta_publisher_facebook", "meta_publisher_instagram", "meta_social"];

interface ConnectedMetaBadgeProps {
  /** Módulo a conectar si no hay cuenta (api/connect/[module]). */
  module?: string;
  /**
   * Providers de Integration a inspeccionar, en orden de prioridad. El badge
   * muestra el perfil del PRIMERO conectado. Por defecto solo mira los del
   * propio Publisher para reflejar su cuenta independiente (no la genérica).
   */
  providers?: string[];
  /** Texto del botón cuando no hay cuenta conectada. */
  connectLabel?: string;
}

/**
 * Muestra el PERFIL DE FACEBOOK conectado (nickname + avatar) de un módulo
 * concreto. Cada módulo tiene su cuenta independiente: el badge no asume un
 * acceso único compartido, sino que lee la integración del módulo dado.
 */
export function ConnectedMetaBadge({
  module = "publisher_facebook",
  providers = DEFAULT_PROVIDERS,
  connectLabel,
}: ConnectedMetaBadgeProps) {
  const labelToUse = connectLabel || (module === "community" || module === "social" || module === "inbox" ? "Conectar Facebook e Instagram" : module.includes("instagram") ? "Conectar Instagram" : "Conectar Facebook");
  const [profile, setProfile] = useState<ConnectedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const providersKey = providers.join(",");

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspace/integrations`);
      const json = await res.json();
      // Envelope estándar { success, data: { data: [...] } }.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      const list: any[] = Array.isArray(json) ? json : (json?.data?.data ?? []);
      // Primer provider conectado (en orden de prioridad). Se prefiere el perfil
      // de Facebook (nickname + avatar); si una conexión antigua aún no lo tiene
      // capturado, se cae al usuario que la conectó para no mostrar "Conectar"
      // sobre una cuenta realmente conectada (reconectar poblará el perfil FB).
      let fbProfile: ConnectedProfile | null = null;
      let fallback: ConnectedProfile | null = null;
      for (const provider of providers) {
        const intg = list.find((i) => i.provider === provider && i.connected);
        if (!intg) continue;
        if (intg.connectedProfile?.name || intg.connectedProfile?.picture) {
          fbProfile = intg.connectedProfile as ConnectedProfile;
          break;
        }
        if (!fallback && intg.connectedBy) {
          fallback = { name: intg.connectedBy.name ?? null, picture: intg.connectedBy.image ?? null };
        }
      }
      setProfile(fbProfile ?? fallback);
    } catch (e) {
      console.error(e);
      setProfile(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providersKey]);

  const handleDisconnect = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de que deseas desvincular esta cuenta de Meta?")) return;
    try {
      setLoading(true);
      const res = await fetch("/api/connect/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: module }),
      });
      if (res.ok) {
        setProfile(null);
        await fetchIntegrations();
        // Notify other tabs and components
        window.postMessage({ type: "INTEGRATION_UPDATED" }, window.location.origin);
      } else {
        const errData = await res.json();
        alert(errData.error || "Error al desvincular");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }, [module, fetchIntegrations]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
    fetchIntegrations();
    // Reaccionar a conexiones hechas desde el popup OAuth.
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "OAUTH_SUCCESS" || e.data?.type === "INTEGRATION_UPDATED") {
        fetchIntegrations();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [fetchIntegrations]);

  if (loading) {
    return (
      <div style={{ height: 32, width: 120, borderRadius: 16, background: "var(--surface-hover)", animation: "pulse 2s infinite" }} />
    );
  }

  if (!profile) {
    const isIg = module.includes("instagram");
    return (
      <BadgeConnectDropdown 
        onConnectFacebook={() => openConnectPopup(module.replace('instagram', 'facebook'), fetchIntegrations)}
        onConnectInstagram={() => openConnectPopup(module.replace('facebook', 'instagram'), fetchIntegrations)}
        label={labelToUse}
        isIg={isIg}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 8px 4px 4px",
        borderRadius: 20,
        background: "var(--surface-hover)",
        border: "1px solid var(--fc-border)",
      }}
      title="Perfil de Facebook conectado que otorga los permisos de esta sección"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", position: "relative", background: "var(--surface-hover)" }}>
          {profile.picture ? (
            <Image src={profile.picture} alt={profile.name || "Perfil"} fill style={{ objectFit: "cover" }} unoptimized />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--fc-text)" }}>
              {profile.name?.charAt(0) || "F"}
            </div>
          )}
        </div>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--fc-text-secondary)", maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {profile.name || "Usuario"}
        </span>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--fc-success)", marginLeft: 4 }} />
      </div>
      <div style={{ display: "flex", gap: 2, paddingLeft: 4, borderLeft: "1px solid var(--fc-border)", marginLeft: 4 }}>
        <BadgeConnectDropdown 
          onConnectFacebook={() => openConnectPopup(`${module.replace('instagram', 'facebook')}?force=1`, fetchIntegrations)}
          onConnectInstagram={() => openConnectPopup(`${module.replace('facebook', 'instagram')}?force=1`, fetchIntegrations)}
          isSmallIcon={true}
          label={labelToUse}
          isIg={module.includes("instagram")}
        />

        <button
          onClick={handleDisconnect}
          style={{
            background: "none",
            border: "none",
            color: "var(--fc-text-muted)",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            transition: "color 0.2s, background-color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--fc-danger)";
            e.currentTarget.style.backgroundColor = "rgba(229,72,77, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--fc-text-muted)";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          title="Desconectar cuenta"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

import { ChevronDown } from "lucide-react";

function BadgeConnectDropdown({
  onConnectFacebook,
  onConnectInstagram,
  isSmallIcon = false,
  label = "Conectar Facebook",
  isIg = false,
}: {
  onConnectFacebook: () => void;
  onConnectInstagram: () => void;
  isSmallIcon?: boolean;
  label?: string;
  isIg?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block", zIndex: 50 }}>
      {isSmallIcon ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: "none",
            border: "none",
            color: "var(--fc-text-muted)",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            transition: "color 0.2s, background-color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.backgroundColor = "var(--fc-surface)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--fc-text-muted)";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          title="Agregar más cuentas"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 16,
            background: "var(--fc-surface)",
            border: isIg ? "1px solid rgba(214, 36, 159, 0.2)" : "1px solid rgba(0,132,255,0.2)",
            color: isIg ? "#d6249f" : "#0084ff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
        >
          {isIg ? <InstagramIcon size={14} /> : <FacebookIcon size={14} />}
          {label}
          <ChevronDown style={{ width: 12, height: 12, opacity: 0.7, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
        </button>
      )}

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 260,
            background: "var(--panel-bg)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--glass-border)",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            padding: "8px 0",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "6px 14px 4px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--fc-text-muted)", letterSpacing: "0.05em", textAlign: "left" }}>
            Selecciona plataforma
          </div>
          <button
            onClick={() => { onConnectFacebook(); setIsOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", color: "var(--fc-text)", fontFamily: "inherit", fontSize: 13, textAlign: "left", transition: "background 0.2s", width: "100%" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <FacebookIcon size={20} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 600 }}>Facebook</span>
              <span style={{ fontSize: 10, color: "var(--fc-text-muted)" }}>Gestiona tus páginas</span>
            </div>
          </button>
          <button
            onClick={() => { onConnectInstagram(); setIsOpen(false); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", color: "var(--fc-text)", fontFamily: "inherit", fontSize: 13, textAlign: "left", transition: "background 0.2s", width: "100%" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <InstagramIcon size={20} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 600 }}>Instagram</span>
              <span style={{ fontSize: 10, color: "var(--fc-text-muted)" }}>Conecta tus cuentas</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

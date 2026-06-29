"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { openConnectPopup } from "@/lib/connect-popup";

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
  connectLabel = "Conectar Facebook",
}: ConnectedMetaBadgeProps) {
  const [profile, setProfile] = useState<ConnectedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const providersKey = providers.join(",");

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspace/integrations`);
      const json = await res.json();
      // Envelope estándar { success, data: { data: [...] } }.
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

  useEffect(() => {
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
      <div style={{ height: 32, width: 120, borderRadius: 16, background: "rgba(255,255,255,0.05)", animation: "pulse 2s infinite" }} />
    );
  }

  if (!profile) {
    return (
      <button
        onClick={() => openConnectPopup(module, fetchIntegrations)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 16,
          background: "rgba(0,132,255,0.1)",
          border: "1px solid rgba(0,132,255,0.2)",
          color: "#0084ff",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {connectLabel}
      </button>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 12px 4px 4px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
      title="Perfil de Facebook conectado que otorga los permisos de esta sección"
    >
      <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", position: "relative", background: "rgba(255,255,255,0.1)" }}>
        {profile.picture ? (
          <Image src={profile.picture} alt={profile.name || "Perfil"} fill style={{ objectFit: "cover" }} unoptimized />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>
            {profile.name?.charAt(0) || "F"}
          </div>
        )}
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {profile.name || "Usuario"}
      </span>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--emerald)", marginLeft: 4 }} />
    </div>
  );
}

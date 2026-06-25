"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { openConnectPopup } from "@/lib/connect-popup";

export function ConnectedMetaBadge() {
  const [data, setData] = useState<{ name: string | null; image: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch(`/api/workspace/integrations`);
      const list = await res.json();
      const meta = list.find((i: any) => i.provider === "meta" && i.connected);
      if (meta && meta.connectedUser) {
        setData({
          name: meta.connectedUser.name,
          image: meta.connectedUser.image,
        });
      } else {
        setData(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
    
    // Listen for connection events from the popup
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "OAUTH_SUCCESS" || e.data?.type === "INTEGRATION_UPDATED") {
        fetchIntegrations();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (loading) {
    return (
      <div style={{ height: 32, width: 120, borderRadius: 16, background: "rgba(255,255,255,0.05)", animation: "pulse 2s infinite" }} />
    );
  }

  if (!data) {
    return (
      <button
        onClick={() => openConnectPopup("community", fetchIntegrations)}
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
        Conectar Facebook
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
      title="Perfil de Facebook conectado que otorga los permisos"
    >
      <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", position: "relative", background: "rgba(255,255,255,0.1)" }}>
        {data.image ? (
          <Image src={data.image} alt={data.name || "Perfil"} fill style={{ objectFit: "cover" }} unoptimized />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>
            {data.name?.charAt(0) || "F"}
          </div>
        )}
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", maxWidth: 100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {data.name || "Usuario"}
      </span>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--emerald)", marginLeft: 4 }} />
    </div>
  );
}

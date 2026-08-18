"use client";

import React, { useEffect, useState } from "react";

/**
 * FlowChartBrandDefs
 * This component must be mounted once in the app (e.g. in layout.tsx or ClientMainWrapper.tsx).
 * It injects the global SVG definitions (<defs>) for the holographic gradients and filters
 * that make up the FlowChart brand aesthetic. Any SVG in the app can then reference these.
 */
export function FlowChartBrandDefs() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- TODO: [React] Refactor de hooks anti-patrón
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute", width: 0, height: 0, visibility: "hidden" }}>
        <defs>
          {/* ─── Azul (marca) ─── */}
          <linearGradient id="flowchart-holo-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--fc-accent)" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="var(--fc-accent)" />
          </linearGradient>

          {/* ─── Verde (éxito/crecimiento) ─── */}
          <linearGradient id="flowchart-holo-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--fc-success)" />
            <stop offset="50%" stopColor="#2b9a67" />
            <stop offset="100%" stopColor="var(--fc-success)" />
          </linearGradient>

          {/* ─── Magenta atenuado (métricas) ─── */}
          <linearGradient id="flowchart-holo-pink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bc5fb2" />
            <stop offset="50%" stopColor="var(--fc-module-aria)" />
            <stop offset="100%" stopColor="#bc5fb2" />
          </linearGradient>

          {/* ─── Naranja atenuado (escucha/planner) ─── */}
          <linearGradient id="flowchart-holo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d98843" />
            <stop offset="50%" stopColor="var(--fc-warning)" />
            <stop offset="100%" stopColor="#d98843" />
          </linearGradient>
        </defs>
      </svg>
      <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style={{ display: "none" }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <symbol id="fc-reportes" viewBox="0 0 24 24"><rect x="3" y="14" width="4" height="7" rx="1"></rect><rect x="10" y="9" width="4" height="12" rx="1"></rect><rect x="17" y="3" width="4" height="18" rx="1"></rect></symbol>
        <symbol id="fc-canales" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2"></rect><rect x="14" y="3" width="7" height="7" rx="2"></rect><rect x="3" y="14" width="7" height="7" rx="2"></rect><rect x="14" y="14" width="7" height="7" rx="2"></rect></symbol>
        <symbol id="fc-flujo" viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="12" r="3"></circle><path d="M6 9v6"></path><path d="M9 18h6v-6"></path></symbol>
        <symbol id="fc-conectar" viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></symbol>
        <symbol id="fc-integracion" viewBox="0 0 24 24"><path d="M9 3v6"></path><path d="M15 3v6"></path><rect x="7" y="9" width="10" height="6" rx="2"></rect><path d="M12 15v6"></path></symbol>
        <symbol id="fc-exportar" viewBox="0 0 24 24"><path d="M12 4v11"></path><path d="M7 10l5 5 5-5"></path><path d="M4 20h16"></path></symbol>
        <symbol id="fc-importar" viewBox="0 0 24 24"><path d="M12 15V4"></path><path d="M7 9l5-5 5 5"></path><path d="M4 20h16"></path></symbol>
        <symbol id="fc-filtro" viewBox="0 0 24 24"><path d="M4 7h16"></path><path d="M7 12h10"></path><path d="M10 17h4"></path></symbol>
        <symbol id="fc-rango" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"></rect><path d="M4 10h16"></path><path d="M9 3v3"></path><path d="M15 3v3"></path></symbol>
        <symbol id="fc-programado" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><path d="M12 8v4.5l3 2"></path></symbol>
        <symbol id="fc-buscar" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="M15.5 15.5L20 20"></path></symbol>
        <symbol id="fc-ajustes" viewBox="0 0 24 24"><path d="M4 7h16"></path><path d="M4 17h16"></path><circle cx="10" cy="7" r="2.4"></circle><circle cx="15" cy="17" r="2.4"></circle></symbol>
        <symbol id="fc-usuario" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"></circle><path d="M5 20v-1.5a4 4 0 014-4h6a4 4 0 014 4V20"></path></symbol>
        <symbol id="fc-equipo" viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3"></circle><path d="M3 20v-1.5a4 4 0 014-4h4a4 4 0 014 4V20"></path><path d="M16 6.2a3 3 0 010 4.6"></path><path d="M18 14.7a4 4 0 013 3.8V20"></path></symbol>
        <symbol id="fc-plantilla" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M4 9h16"></path><path d="M9 9v11"></path></symbol>
        <symbol id="fc-verificado" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><path d="M8.5 12.5l2.5 2.5 4.5-5"></path></symbol>
        <symbol id="fc-alerta" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><path d="M12 8v5"></path><path d="M12 16.5v.01"></path></symbol>
        <symbol id="fc-subida" viewBox="0 0 24 24"><path d="M7 17L17 7"></path><path d="M9 7h8v8"></path></symbol>
        <symbol id="fc-bajada" viewBox="0 0 24 24"><path d="M7 7l10 10"></path><path d="M17 9v8H9"></path></symbol>
        <symbol id="fc-mas" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"></circle><circle cx="12" cy="12" r="1.6"></circle><circle cx="19" cy="12" r="1.6"></circle></symbol>
      </svg>
    </>
  );
}

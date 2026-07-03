"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if available
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "70vh", padding: "24px",
      textAlign: "center",
    }}>
      <div style={{
        width: "100%", maxWidth: "440px",
        background: "var(--surface)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(229,72,77,0.25)",
        borderRadius: "20px", padding: "36px 32px",
        position: "relative", overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(229,72,77,0.1)",
      }}>
        {/* Top neon accent bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "2px",
          background: "linear-gradient(90deg, transparent, var(--red), transparent)",
        }} />

        {/* Ambient glow top-left */}
        <div style={{
          position: "absolute", top: -60, left: -60,
          width: 180, height: 180,
          background: "rgba(229,72,77,0.12)", filter: "blur(60px)",
          borderRadius: "50%", pointerEvents: "none",
        }} />

        {/* Icon */}
        <div style={{
          width: "60px", height: "60px", borderRadius: "16px",
          background: "rgba(229,72,77,0.1)",
          border: "1px solid rgba(229,72,77,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
          boxShadow: "0 0 30px rgba(229,72,77,0.2)",
        }}>
          <AlertTriangle style={{ width: 28, height: 28, color: "var(--red)" }} />
        </div>

        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: "16px", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "var(--foreground)", marginBottom: "10px",
        }}>
          Error Crítico Detectado
        </h2>

        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px", lineHeight: 1.6 }}>
          Algo salió mal al cargar esta sección. Hemos registrado el error para investigarlo.
          Puedes intentar recargar la página o volver al inicio.
        </p>

        <div style={{
          padding: "12px 14px",
          background: "rgba(0,0,0,0.35)", backdropFilter: "blur(10px)",
          border: "1px solid var(--hairline)",
          borderRadius: "8px", marginBottom: "24px",
          textAlign: "left", overflow: "hidden",
        }}>
          <p style={{
            fontSize: "11px", fontFamily: "monospace",
            color: "rgba(255,100,100,0.8)", wordBreak: "break-word",
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {error.message || "Error desconocido en el renderizado."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => reset()}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: "8px", padding: "11px 16px", borderRadius: "10px",
              background: "var(--surface-hover)",
              border: "1px solid var(--border)",
              color: "var(--foreground)", fontSize: "13px", fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
            }}
          >
            <RefreshCcw style={{ width: 14, height: 14 }} />
            Reintentar
          </button>
          <Link
            href="/dashboard/resumen"
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: "8px", padding: "11px 16px", borderRadius: "10px",
              background: "linear-gradient(135deg, var(--cyan), #2563eb)",
              border: "none",
              color: "#fff", fontSize: "13px", fontWeight: 600,
              textDecoration: "none", transition: "all 0.2s",
              boxShadow: "0 4px 16px rgba(59,130,246,0.35)",
            }}
          >
            <Home style={{ width: 14, height: 14 }} />
            Ir al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

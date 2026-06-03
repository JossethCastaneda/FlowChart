"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function DeletionContent() {
  const params = useSearchParams();
  const code = params.get("code");

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0a0f1e 0%, #111827 100%)",
      padding: "20px",
    }}>
      <div style={{
        maxWidth: 480,
        width: "100%",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "40px 32px",
        textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, margin: "0 auto 20px",
          borderRadius: "50%",
          background: "rgba(0,200,117,0.1)",
          border: "1px solid rgba(0,200,117,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24,
        }}>
          ✓
        </div>
        <h1 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 18,
          fontWeight: 700,
          color: "white",
          letterSpacing: "0.05em",
          marginBottom: 12,
        }}>
          Solicitud de Eliminación de Datos
        </h1>
        <p style={{ fontSize: 14, color: "rgba(148,163,184,0.7)", lineHeight: 1.6, marginBottom: 24 }}>
          Tu solicitud de eliminación de datos ha sido recibida y está siendo procesada.
          Todos los datos asociados a tu cuenta de Facebook/Meta serán eliminados de nuestros sistemas.
        </p>
        {code && (
          <div style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            padding: "16px",
            marginBottom: 24,
          }}>
            <p style={{ fontSize: 11, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Código de confirmación
            </p>
            <p style={{ fontSize: 14, color: "#00d4ff", fontFamily: "monospace", fontWeight: 600, wordBreak: "break-all" }}>
              {code}
            </p>
          </div>
        )}
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.8 }}>
          <p><strong style={{ color: "#94a3b8" }}>Estado:</strong> En proceso</p>
          <p><strong style={{ color: "#94a3b8" }}>Tiempo estimado:</strong> Hasta 90 días</p>
          <p style={{ marginTop: 12 }}>
            Si tienes preguntas, contacta a{" "}
            <a href="mailto:soporte@sodare.xyz" style={{ color: "#00d4ff", textDecoration: "none" }}>
              soporte@sodare.xyz
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DataDeletionPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0f1e" }} />}>
      <DeletionContent />
    </Suspense>
  );
}

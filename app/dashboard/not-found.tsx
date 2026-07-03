"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function DashboardNotFound() {
  const router = useRouter();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: 20,
        textAlign: "center",
        padding: "40px 24px",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "rgba(226,68,92,0.08)",
          border: "1px solid rgba(226,68,92,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertTriangle style={{ width: 28, height: 28, color: "var(--red)" }} />
      </div>

      <div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--foreground)",
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}
        >
          MÓDULO NO ENCONTRADO
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 360 }}>
          Esta sección no existe o fue movida. Verifica la URL o regresa al dashboard.
        </p>
      </div>

      <button
        onClick={() => router.push("/dashboard/resumen")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          borderRadius: 8,
          background: "linear-gradient(135deg, var(--cyan), #2563eb)",
          border: "none",
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          boxShadow: "0 4px 16px rgba(59,130,246,0.35)",
          transition: "all 0.2s",
        }}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} />
        Ir al Dashboard
      </button>
    </div>
  );
}

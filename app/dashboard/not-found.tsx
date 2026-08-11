"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
          background: "var(--fc-surface)",
          border: "1px solid rgba(226,68,92,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertTriangle style={{ width: 28, height: 28, color: "var(--fc-danger)" }} />
      </div>

      <div>
        <h2
          style={{
            fontFamily: "var(--fc-font-display)",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--fc-text)",
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}
        >
          MÓDULO NO ENCONTRADO
        </h2>
        <p style={{ fontSize: 13, color: "var(--fc-text-muted)", maxWidth: 360 }}>
          Esta sección no existe o fue movida. Verifica la URL o regresa al dashboard.
        </p>
      </div>

      <Button
        variant="primary"
        onClick={() => router.push("/dashboard/resumen")}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} />
        Ir al Dashboard
      </Button>
    </div>
  );
}

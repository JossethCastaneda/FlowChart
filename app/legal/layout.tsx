import React from "react";
import Link from "next/link";
import { FlowChartLogo } from "@/components/ui/FlowChartLogo";

export const metadata = {
  title: "Términos de Servicio — FlowChart",
  description: "Términos y condiciones de uso de la plataforma FlowChart. Centro de mando de marketing multicanal.",
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "var(--fc-bg)",
      color: "var(--fc-text)",
      fontFamily: "var(--font-sans)",
    }}>
      {/* Top nav */}
      <header style={{
        borderBottom: "1px solid rgba(59,130,246,0.12)",
        background: "var(--fc-surface)",
        
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "0 24px",
      }}>
        <div style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 60,
        }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <FlowChartLogo />
          </Link>
          <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Link href="/legal/terms" style={{ fontSize: 13, color: "var(--fc-text-muted)", textDecoration: "none" }}>
              Términos
            </Link>
            <Link href="/legal/privacy" style={{ fontSize: 13, color: "var(--fc-text-muted)", textDecoration: "none" }}>
              Privacidad
            </Link>
            <Link
              href="/login"
              style={{
                fontSize: 13,
                color: "#5b9bff",
                textDecoration: "none",
                border: "1px solid rgba(59,130,246,0.3)",
                borderRadius: 8,
                padding: "6px 16px",
                transition: "all 0.2s",
              }}
            >
              Acceder
            </Link>
          </nav>
        </div>
      </header>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>

      {/* Footer */}
      <footer style={{
        border: "1px solid var(--hairline)",
        padding: "32px 24px",
        textAlign: "center",
        marginTop: 80,
      }}>
        <p style={{ fontSize: 12, color: "var(--fc-text-muted)" }}>
           {new Date().getFullYear()} FlowChart. Todos los derechos reservados.
        </p>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 12 }}>
          <Link href="/legal/terms" style={{ fontSize: 12, color: "var(--fc-text-muted)", textDecoration: "none" }}>
            Términos de Servicio
          </Link>
          <Link href="/legal/privacy" style={{ fontSize: 12, color: "var(--fc-text-muted)", textDecoration: "none" }}>
            Política de Privacidad
          </Link>
          <Link href="/login" style={{ fontSize: 12, color: "var(--fc-text-muted)", textDecoration: "none" }}>
            Iniciar Sesión
          </Link>
        </div>
      </footer>
    </div>
  );
}

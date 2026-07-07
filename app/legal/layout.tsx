import React from "react";
import Link from "next/link";
import { SodareLogo } from "@/components/ui/SodareLogo";

export const metadata = {
  title: "Términos de Servicio — Sodare",
  description: "Términos y condiciones de uso de la plataforma Sodare. Centro de mando de marketing multicanal.",
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#04070e",
      color: "#dde6f0",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Top nav */}
      <header style={{
        borderBottom: "1px solid rgba(59,130,246,0.12)",
        background: "rgba(4,9,22,0.95)",
        backdropFilter: "blur(20px)",
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
            <SodareLogo />
          </Link>
          <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Link href="/legal/terms" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}>
              Términos
            </Link>
            <Link href="/legal/privacy" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}>
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
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "32px 24px",
        textAlign: "center",
        marginTop: 80,
      }}>
        <p style={{ fontSize: 12, color: "#6c7c93" }}>
          © {new Date().getFullYear()} Sodare. Todos los derechos reservados.
        </p>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 12 }}>
          <Link href="/legal/terms" style={{ fontSize: 12, color: "#6c7c93", textDecoration: "none" }}>
            Términos de Servicio
          </Link>
          <Link href="/legal/privacy" style={{ fontSize: 12, color: "#6c7c93", textDecoration: "none" }}>
            Política de Privacidad
          </Link>
          <Link href="/login" style={{ fontSize: 12, color: "#6c7c93", textDecoration: "none" }}>
            Iniciar Sesión
          </Link>
        </div>
      </footer>
    </div>
  );
}

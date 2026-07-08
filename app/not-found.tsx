import Link from "next/link";
import { SodareLogo } from "@/components/ui/SodareLogo";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column" as const,
      alignItems: "center", justifyContent: "center",
      background: "var(--background)", color: "var(--foreground)",
      padding: "24px",
      textAlign: "center" as const,
    }}>
      <SodareLogo size="sm" animated={false} />

      <h1 style={{
        fontSize: "clamp(80px, 15vw, 160px)",
        fontWeight: 700,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        margin: "40px 0 16px",
        background: "linear-gradient(90deg, var(--cyan), #818cf8)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}>
        404
      </h1>

      <p style={{ fontSize: 21, fontWeight: 600, marginBottom: 8, color: "var(--foreground)" }}>
        Página no encontrada
      </p>
      <p style={{ fontSize: 17, color: "var(--text-muted)", marginBottom: 40, maxWidth: 400, lineHeight: 1.5 }}>
        La página que buscas no existe o fue movida a otra dirección.
      </p>

      <Link href="/" style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "16px 32px", borderRadius: 980,
        background: "var(--cyan)", color: "var(--background)",
        fontSize: 17, fontWeight: 600,
        textDecoration: "none", transition: "all 0.3s",
      }}>
        Volver al inicio
      </Link>
    </div>
  );
}

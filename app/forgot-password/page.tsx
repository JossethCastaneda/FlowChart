"use client";
import { useState } from "react";
import { SodareLogo } from "@/components/ui/SodareLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Ingresa un email válido");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al procesar");
        setLoading(false);
        return;
      }

      const data = await res.json();
      // Dev mode: el API devuelve el enlace directamente cuando no hay email configurado
      if (data.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
      }
      setSent(true);
    } catch {
      setError("Error de red");
      setLoading(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#030508",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(15, 23, 42, 0.6)",
    border: "1px solid rgba(91,155,255, 0.1)",
    borderRadius: "16px",
    padding: "40px",
    maxWidth: "440px",
    width: "100%",
    backdropFilter: "blur(20px)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(15, 23, 42, 0.8)",
    border: "1px solid rgba(100, 116, 139, 0.3)",
    borderRadius: "8px",
    color: "var(--foreground)",
    fontSize: "14px",
    outline: "none",
    marginBottom: "16px",
    boxSizing: "border-box",
  };

  const btnStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, var(--c-brand), #2563eb)",
    border: "none",
    borderRadius: "8px",
    color: "#030508",
    fontWeight: 700,
    fontSize: "14px",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : 1,
    letterSpacing: "1px",
  };

  if (sent) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ color: "var(--c-brand)", fontSize: "20px", marginBottom: "16px", textAlign: "center" }}>
            {devResetUrl ? "🔧 Modo Desarrollo" : "📧 Revisa tu email"}
          </h1>

          {devResetUrl ? (
            // ── Modo desarrollo: mostrar el enlace directamente ──────────────
            <div>
              <p style={{ color: "var(--text-secondary)", textAlign: "center", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
                El servicio de email no está configurado en este entorno.
                Usa el siguiente enlace para restablecer la contraseña:
              </p>
              <div style={{
                background: "rgba(91,155,255, 0.05)",
                border: "1px solid rgba(91,155,255, 0.2)",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "16px",
                wordBreak: "break-all",
              }}>
                <p style={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Enlace de reset (expira en 1 hora)
                </p>
                <a
                  href={devResetUrl}
                  style={{
                    color: "var(--c-brand)",
                    fontSize: "13px",
                    wordBreak: "break-all",
                    textDecoration: "none",
                  }}
                >
                  {devResetUrl}
                </a>
              </div>
              <a
                href={devResetUrl}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px",
                  background: "linear-gradient(135deg, var(--c-brand), #2563eb)",
                  color: "#030508",
                  fontWeight: 700,
                  fontSize: "14px",
                  borderRadius: "8px",
                  textDecoration: "none",
                  letterSpacing: "1px",
                  marginBottom: "16px",
                }}
              >
                RESTABLECER CONTRASEÑA →
              </a>
            </div>
          ) : (
            // ── Modo producción: instrucciones de email ──────────────────────
            <p style={{ color: "var(--text-secondary)", textAlign: "center", fontSize: "14px", lineHeight: "1.6" }}>
              Si <strong style={{ color: "var(--foreground)" }}>{email}</strong> está registrado,
              recibirás un enlace para restablecer tu contraseña.
            </p>
          )}

          <p style={{ color: "var(--text-muted)", textAlign: "center", fontSize: "12px", marginTop: "16px" }}>
            El enlace expira en 1 hora.
          </p>
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <a
              href="/login"
              style={{
                color: "var(--c-brand)",
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              ← Volver al login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
          <SodareLogo size="lg" />
        </div>
        <p style={{
          color: "var(--text-secondary)",
          fontSize: "14px",
          textAlign: "center",
          marginBottom: "32px",
        }}>
          Recuperar contraseña
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Tu email registrado"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />

          {error && (
            <p style={{ color: "var(--red)", fontSize: "12px", margin: "-8px 0 12px" }}>
              {error}
            </p>
          )}

          <button type="submit" style={btnStyle} disabled={loading}>
            {loading ? "ENVIANDO..." : "ENVIAR ENLACE →"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <a
            href="/login"
            style={{
              color: "rgba(91,155,255, 0.6)",
              fontSize: "12px",
              textDecoration: "none",
            }}
          >
            ← Volver al login
          </a>
        </div>
      </div>
    </div>
  );
}

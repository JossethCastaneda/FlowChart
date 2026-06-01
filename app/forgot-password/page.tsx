"use client";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

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
    border: "1px solid rgba(0, 240, 255, 0.1)",
    borderRadius: "16px",
    padding: "40px",
    maxWidth: "420px",
    width: "100%",
    backdropFilter: "blur(20px)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(15, 23, 42, 0.8)",
    border: "1px solid rgba(100, 116, 139, 0.3)",
    borderRadius: "8px",
    color: "#e2e8f0",
    fontSize: "14px",
    outline: "none",
    marginBottom: "16px",
    boxSizing: "border-box",
  };

  const btnStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #00f0ff, #0080ff)",
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
          <h1 style={{ color: "#00f0ff", fontSize: "20px", marginBottom: "16px", textAlign: "center" }}>
            📧 Revisa tu email
          </h1>
          <p style={{ color: "#94a3b8", textAlign: "center", fontSize: "14px", lineHeight: "1.6" }}>
            Si <strong style={{ color: "#e2e8f0" }}>{email}</strong> está registrado,
            recibirás un enlace para restablecer tu contraseña.
          </p>
          <p style={{ color: "#64748b", textAlign: "center", fontSize: "12px", marginTop: "24px" }}>
            El enlace expira en 1 hora.
          </p>
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <a
              href="/login"
              style={{
                color: "#00f0ff",
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
        <h1 style={{
          color: "#00f0ff",
          fontSize: "20px",
          fontWeight: 700,
          marginBottom: "8px",
          textAlign: "center",
          letterSpacing: "2px",
        }}>
          ⚡ SODARE
        </h1>
        <p style={{
          color: "#94a3b8",
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
            <p style={{ color: "#ef4444", fontSize: "12px", margin: "-8px 0 12px" }}>
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
              color: "rgba(0, 240, 255, 0.6)",
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

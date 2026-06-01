"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Mínimo 8 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al restablecer");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
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
    marginBottom: "12px",
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
    marginTop: "8px",
  };

  if (success) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ color: "#00f0ff", fontSize: "20px", marginBottom: "16px", textAlign: "center" }}>
            ✅ Contraseña actualizada
          </h1>
          <p style={{ color: "#94a3b8", textAlign: "center", fontSize: "14px" }}>
            Redirigiendo al login...
          </p>
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
          Nueva contraseña
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Nueva contraseña (mín. 8 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
            minLength={8}
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={inputStyle}
            required
          />

          {error && (
            <p style={{ color: "#ef4444", fontSize: "12px", margin: "8px 0" }}>
              {error}
            </p>
          )}

          <button type="submit" style={btnStyle} disabled={loading}>
            {loading ? "PROCESANDO..." : "RESTABLECER CONTRASEÑA →"}
          </button>
        </form>
      </div>
    </div>
  );
}

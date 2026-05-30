"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Zap, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  // CRÍTICO: Verificar si el usuario YA tiene workspace
  // Esto cubre el caso donde un invitado fue redirigido aquí
  // porque el JWT tenía hasWorkspace: false (cacheado antes de
  // aceptar la invitación)
  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => r.json())
      .then(async (data) => {
        if (data.data && data.data.length > 0) {
          // Ya tiene workspace — refrescar JWT y redirigir
          await update();
          router.push("/dashboard/resumen");
          router.refresh();
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        setChecking(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (name.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al crear workspace");
        setLoading(false);
        return;
      }

      // Refrescar JWT para que hasWorkspace = true
      await update();
      router.push("/dashboard/resumen");
      router.refresh();
    } catch {
      setError("Error de red. Intenta de nuevo.");
      setLoading(false);
    }
  }

  // Mientras verifica si ya tiene workspace
  if (checking) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--background)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Loader2 style={{ width: 32, height: 32, color: "#00d4ff",
          animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "440px",
          margin: "0 16px",
          padding: "40px",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <div className="sidebar-logo-icon">
            <Zap style={{ color: "var(--cyan)", width: 20, height: 20 }} />
          </div>
          <span
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "18px",
              fontWeight: 700,
              color: "white",
              letterSpacing: "0.2em",
            }}
          >
            SODARE
          </span>
        </div>

        <h1
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--cyan)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          Inicializar Command Center
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.6)", marginBottom: "28px" }}>
          Dale un nombre a tu workspace. Podrás invitar a tu equipo después.
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 600,
              color: "rgba(148,163,184,0.5)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Nombre del workspace
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Mi Agencia / Mi Empresa"
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "rgba(0,212,255,0.03)",
              border: "1px solid rgba(0,212,255,0.15)",
              color: "white",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
            }}
            autoFocus
          />
          {error && (
            <p style={{ fontSize: "12px", color: "var(--red)", marginTop: "6px" }}>
              {error}
            </p>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="btn-primary"
          style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Inicializando..." : "Crear workspace →"}
        </button>
      </div>
    </div>
  );
}

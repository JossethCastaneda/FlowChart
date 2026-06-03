"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { SodareLogo } from "@/components/ui/SodareLogo";

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", background: "var(--background)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Loader2 style={{ width: 32, height: 32, color: "#00d4ff",
          animation: "spin 1s linear infinite" }} />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const isNewWorkspace = searchParams.get("new") === "1";

  // Verificar si el usuario YA tiene workspace
  // Si ?new=1 → skip this check (quiere crear uno adicional)
  useEffect(() => {
    if (isNewWorkspace) {
      setChecking(false);
      return;
    }
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
      // Crear el workspace
      const createRes = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const createData = await createRes.json();

      if (!createRes.ok) {
        setError(createData.error || "Error al crear workspace");
        setLoading(false);
        return;
      }

      // Setear como workspace activo (cookie)
      await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: createData.data.id }),
      });

      // Forzar reload completo para regenerar JWT y cookie
      window.location.href = "/dashboard/resumen";
    } catch {
      setError("Error de red. Intenta de nuevo.");
      setLoading(false);
    }
  }

  // Loading mientras verifica
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
        <div style={{ marginBottom: "32px" }}>
          <SodareLogo size="md" />
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
          {isNewWorkspace ? "Nuevo Workspace" : "Inicializar Command Center"}
        </h1>
        <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "28px" }}>
          {isNewWorkspace
            ? "Crea un workspace adicional para otro cliente o equipo."
            : "Dale un nombre a tu workspace. Podrás invitar a tu equipo después."}
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 600,
              color: "#64748b",
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

        {/* Volver al dashboard si es workspace adicional */}
        {isNewWorkspace && (
          <button
            onClick={() => router.back()}
            style={{
              width: "100%",
              marginTop: "12px",
              padding: "8px",
              background: "transparent",
              border: "1px solid rgba(0,212,255,0.08)",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            ← Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

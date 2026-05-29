"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Zap, Users } from "lucide-react";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = params.token as string;

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setInvite(data.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Error al cargar la invitación");
        setLoading(false);
      });
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    const res = await fetch(`/api/invite/${token}`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Error al aceptar");
      setAccepting(false);
      return;
    }

    router.push(data.redirectTo || "/dashboard/resumen");
    router.refresh();
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid rgba(0,212,255,0.2)", borderTopColor: "var(--cyan)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "420px", margin: "0 16px", padding: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <div className="sidebar-logo-icon">
            <Zap style={{ color: "var(--cyan)", width: 20, height: 20 }} />
          </div>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "18px", fontWeight: 700, color: "white", letterSpacing: "0.2em" }}>
            SODARE
          </span>
        </div>

        {error ? (
          <>
            <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "12px", color: "var(--red)", letterSpacing: "0.15em", marginBottom: "8px" }}>INVITACIÓN INVÁLIDA</p>
            <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.6)" }}>{error}</p>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", padding: "12px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.1)" }}>
              <Users style={{ width: 20, height: 20, color: "var(--cyan)", flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "11px", color: "var(--cyan)", letterSpacing: "0.1em" }}>
                  {invite?.workspace?.name}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.5)", marginTop: "2px" }}>
                  Rol: {invite?.role}
                </p>
              </div>
            </div>

            {status !== "authenticated" ? (
              <>
                <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.6)", marginBottom: "20px" }}>
                  Elige cómo quieres iniciar sesión para unirte al workspace.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <button
                    onClick={() => signIn("google", { callbackUrl: `/invite/${token}` })}
                    className="btn-primary"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    Continuar con Google
                  </button>
                  <button
                    onClick={() => signIn("facebook", { callbackUrl: `/invite/${token}` })}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "transparent",
                      border: "1px solid rgba(0,212,255,0.15)",
                      color: "rgba(148,163,184,0.6)",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Continuar con Facebook
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.7)", marginBottom: "24px" }}>
                  Fuiste invitado a unirte a este workspace.
                </p>

                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="btn-primary"
                  style={{ width: "100%", justifyContent: "center", opacity: accepting ? 0.6 : 1 }}
                >
                  {accepting ? "Aceptando..." : "Aceptar invitación →"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

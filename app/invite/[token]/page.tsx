"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Zap, Users, Loader2 } from "lucide-react";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const token = params.token as string;

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

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
    setError("");
    const res = await fetch(`/api/invite/${token}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al aceptar");
      setAccepting(false);
      return;
    }
    setDone(true);
    await update();
    setTimeout(() => router.push("/dashboard/resumen"), 1500);
  }

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "420px",
    margin: "0 16px",
    padding: "40px",
    background: "rgba(8,12,24,0.85)",
    border: "1px solid rgba(0,212,255,0.15)",
    backdropFilter: "blur(20px)",
  };

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#030508",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <Loader2 style={{ width: 32, height: 32, color: "var(--cyan)",
          animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px",
          marginBottom: "32px" }}>
          <div style={{ width: 38, height: 38, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "#000", border: "1px solid rgba(0,212,255,0.4)" }}>
            <Zap style={{ width: 20, height: 20, color: "#00d4ff" }} />
          </div>
          <span style={{ fontFamily: "'Orbitron', sans-serif",
            fontSize: "18px", fontWeight: 700, color: "white",
            letterSpacing: "0.2em" }}>
            SODARE
          </span>
        </div>

        {error ? (
          <>
            <p style={{ fontFamily: "'Orbitron', sans-serif",
              fontSize: "11px", color: "#ff2d55", letterSpacing: "0.15em",
              marginBottom: "8px" }}>
              INVITACIÓN INVÁLIDA
            </p>
            <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.6)" }}>
              {error}
            </p>
          </>
        ) : done ? (
          <p style={{ fontFamily: "'Orbitron', sans-serif",
            fontSize: "12px", color: "#06d6a0", letterSpacing: "0.15em" }}>
            ✓ BIENVENIDO AL EQUIPO — REDIRIGIENDO...
          </p>
        ) : (
          <>
            {/* Workspace info */}
            <div style={{ display: "flex", alignItems: "center",
              gap: "10px", marginBottom: "20px", padding: "12px",
              background: "rgba(0,212,255,0.04)",
              border: "1px solid rgba(0,212,255,0.1)" }}>
              <Users style={{ width: 20, height: 20,
                color: "#00d4ff", flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: "'Orbitron', sans-serif",
                  fontSize: "11px", color: "#00d4ff",
                  letterSpacing: "0.1em" }}>
                  {invite?.workspace?.name}
                </p>
                <p style={{ fontSize: "11px",
                  color: "rgba(148,163,184,0.5)", marginTop: "2px" }}>
                  Rol: {invite?.role}
                </p>
              </div>
            </div>

            <p style={{ fontSize: "13px",
              color: "rgba(148,163,184,0.7)", marginBottom: "8px" }}>
              Fuiste invitado a unirte a este workspace.
            </p>
            <p style={{ fontSize: "12px",
              color: "rgba(148,163,184,0.4)", marginBottom: "24px" }}>
              Invitado como: {invite?.email}
            </p>

            {status !== "authenticated" ? (
              <div style={{ display: "flex", flexDirection: "column",
                gap: "10px" }}>
                <button
                  onClick={() => signIn("google",
                    { callbackUrl: `/invite/${token}` })}
                  style={{ width: "100%", padding: "12px",
                    background: "rgba(0,212,255,0.1)",
                    border: "1px solid rgba(0,212,255,0.3)",
                    color: "white", cursor: "pointer",
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: "11px", letterSpacing: "0.15em" }}>
                  CONTINUAR CON GOOGLE
                </button>
                <button
                  onClick={() => signIn("facebook",
                    { callbackUrl: `/invite/${token}` })}
                  style={{ width: "100%", padding: "12px",
                    background: "transparent",
                    border: "1px solid rgba(0,212,255,0.1)",
                    color: "rgba(148,163,184,0.6)", cursor: "pointer",
                    fontSize: "13px" }}>
                  Continuar con Facebook
                </button>
              </div>
            ) : (
              <button
                onClick={handleAccept}
                disabled={accepting}
                style={{ width: "100%", padding: "12px",
                  background: "rgba(0,212,255,0.1)",
                  border: "1px solid rgba(0,212,255,0.3)",
                  color: accepting ? "rgba(148,163,184,0.4)" : "white",
                  cursor: accepting ? "not-allowed" : "pointer",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "11px", letterSpacing: "0.15em" }}>
                {accepting ? "PROCESANDO..." : "ACEPTAR INVITACIÓN →"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

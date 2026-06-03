"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Zap, Users, Loader2, CheckCircle } from "lucide-react";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const token = params.token as string;
  const autoAcceptAttempted = useRef(false);

  const [invite, setInvite] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  // 1. Cargar datos de la invitación
  useEffect(() => {
    if (!token) return;
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setInvite(data.data);
        setPageLoading(false);
      })
      .catch(() => {
        setError("Error de red. Intenta de nuevo.");
        setPageLoading(false);
      });
  }, [token]);

  // 2. AUTO-ACCEPT: Si el usuario ya está autenticado y la invitación
  // está cargada, intentar aceptar automáticamente.
  // Esto cubre el caso donde el usuario hizo login con Google/Facebook
  // y fue redirigido de vuelta a /invite/[token].
  useEffect(() => {
    if (
      status === "authenticated" &&
      invite &&
      !success &&
      !accepting &&
      !error &&
      !autoAcceptAttempted.current
    ) {
      autoAcceptAttempted.current = true;
      handleAccept();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, invite]);

  async function handleAccept() {
    setAccepting(true);
    setError("");

    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        // Si ya es miembro, redirigir directo
        if (res.status === 409) {
          setSuccess(true);
          await update();
          setTimeout(() => {
            window.location.href = "/dashboard/resumen";
          }, 1000);
          return;
        }
        setError(data.error || "Error al aceptar la invitación");
        setAccepting(false);
        return;
      }

      setSuccess(true);

      // Forzar refresh del JWT para que hasWorkspace = true
      await update();
      // Dar tiempo extra para que el JWT se propague al middleware
      await new Promise((r) => setTimeout(r, 500));
      await update();

      setTimeout(() => {
        window.location.href = "/dashboard/resumen";
      }, 1500);
    } catch {
      setError("Error de red. Intenta de nuevo.");
      setAccepting(false);
    }
  }

  async function handleRegisterAndAccept() {
    if (!regName || !regPassword) {
      setRegError("Completa todos los campos");
      return;
    }
    if (regPassword.length < 8) {
      setRegError("Mínimo 8 caracteres");
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError("Las contraseñas no coinciden");
      return;
    }
    setRegLoading(true);
    setRegError("");

    // 1. Registrar
    const regRes = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: regName,
        email: invite?.email,
        password: regPassword,
      }),
    });
    const regData = await regRes.json();
    if (!regRes.ok) {
      setRegLoading(false);
      setRegError(regData.error || "Error al registrar");
      return;
    }

    // 2. Auto-login
    const result = await signIn("credentials", {
      email: invite?.email,
      password: regPassword,
      redirect: false,
    });
    if (result?.error) {
      setRegLoading(false);
      setRegError("Cuenta creada pero login falló. Intenta login manual.");
      return;
    }

    // 3. Aceptar invitación
    const acceptRes = await fetch(`/api/invite/${token}`, { method: "POST" });
    const acceptData = await acceptRes.json();
    if (!acceptRes.ok && acceptRes.status !== 409) {
      setRegLoading(false);
      setRegError(acceptData.error || "Error al aceptar invitación");
      return;
    }

    setSuccess(true);
    await update();
    setTimeout(() => {
      router.push("/dashboard/resumen");
      router.refresh();
    }, 1500);
  }

  // ── Estilos ──
  const page: React.CSSProperties = {
    minHeight: "100vh", background: "#030508",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const card: React.CSSProperties = {
    width: "100%", maxWidth: "420px", margin: "0 16px", padding: "40px",
    background: "rgba(8,12,24,0.85)",
    border: "1px solid rgba(0,212,255,0.15)",
    backdropFilter: "blur(20px)",
  };
  const orbitron: React.CSSProperties = {
    fontFamily: "'Orbitron', sans-serif",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    background: "rgba(0,212,255,0.03)",
    border: "1px solid rgba(0,212,255,0.15)",
    color: "white", fontSize: "13px", outline: "none",
    boxSizing: "border-box" as const,
  };

  // ── Loading ──
  if (pageLoading) {
    return (
      <div style={page}>
        <Loader2 style={{ width: 32, height: 32, color: "#00d4ff",
          animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  // ── Error fatal (token inválido/expirado) ──
  if (error && !invite) {
    return (
      <div style={page}>
        <div style={card}>
          <Logo />
          <p style={{ ...orbitron, fontSize: "11px", color: "#ff2d55",
            letterSpacing: "0.15em", marginBottom: "8px" }}>
            INVITACIÓN INVÁLIDA
          </p>
          <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.6)" }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (success) {
    return (
      <div style={page}>
        <div style={{ ...card, textAlign: "center" as const }}>
          <CheckCircle style={{ width: 48, height: 48,
            color: "#06d6a0", margin: "0 auto 16px" }} />
          <p style={{ ...orbitron, fontSize: "12px",
            color: "#06d6a0", letterSpacing: "0.15em" }}>
            ¡BIENVENIDO AL EQUIPO!
          </p>
          <p style={{ fontSize: "12px",
            color: "rgba(148,163,184,0.75)", marginTop: "8px" }}>
            Redirigiendo al Command Center...
          </p>
        </div>
      </div>
    );
  }

  // ── Accepting in progress ──
  if (accepting) {
    return (
      <div style={page}>
        <div style={{ ...card, textAlign: "center" as const }}>
          <Loader2 style={{ width: 32, height: 32, color: "#00d4ff",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px" }} />
          <p style={{ ...orbitron, fontSize: "11px",
            color: "#00d4ff", letterSpacing: "0.15em" }}>
            PROCESANDO INVITACIÓN...
          </p>
        </div>
      </div>
    );
  }

  // ── Main view ──
  return (
    <div style={page}>
      <div style={card}>
        <Logo />

        {/* Info del workspace */}
        <div style={{ display: "flex", alignItems: "center",
          gap: "10px", marginBottom: "20px", padding: "14px",
          background: "rgba(0,212,255,0.04)",
          border: "1px solid rgba(0,212,255,0.1)" }}>
          <Users style={{ width: 20, height: 20,
            color: "#00d4ff", flexShrink: 0 }} />
          <div>
            <p style={{ ...orbitron, fontSize: "11px",
              color: "#00d4ff", letterSpacing: "0.1em" }}>
              {invite?.workspace?.name}
            </p>
            <p style={{ fontSize: "11px",
              color: "rgba(148,163,184,0.75)", marginTop: "2px" }}>
              Rol asignado: {invite?.role}
            </p>
          </div>
        </div>

        <p style={{ fontSize: "13px",
          color: "rgba(148,163,184,0.7)", marginBottom: "6px" }}>
          Fuiste invitado a unirte a este workspace.
        </p>
        <p style={{ fontSize: "12px",
          color: "rgba(148,163,184,0.65)", marginBottom: "24px" }}>
          Enviado a: {invite?.email}
        </p>

        {/* Error recuperable */}
        {error && (
          <p style={{ fontSize: "12px", color: "#ff2d55",
            marginBottom: "16px", padding: "8px 12px",
            background: "rgba(255,45,85,0.05)",
            border: "1px solid rgba(255,45,85,0.15)" }}>
            {error}
          </p>
        )}

        {/* ── NO autenticado → mostrar opciones de login ── */}
        {status !== "authenticated" ? (
          <div style={{ display: "flex", flexDirection: "column",
            gap: "10px" }}>
            <button
              onClick={() => signIn("google",
                { callbackUrl: `/invite/${token}` })}
              style={{ width: "100%", padding: "13px",
                background: "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.3)",
                color: "white", cursor: "pointer",
                ...orbitron, fontSize: "11px",
                letterSpacing: "0.15em" }}>
              CONTINUAR CON GOOGLE
            </button>
            <button
              onClick={() => signIn("facebook",
                { callbackUrl: `/invite/${token}` })}
              style={{ width: "100%", padding: "11px",
                background: "transparent",
                border: "1px solid rgba(0,212,255,0.1)",
                color: "rgba(148,163,184,0.6)",
                cursor: "pointer", fontSize: "13px" }}>
              Continuar con Facebook
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center",
              gap: "8px", margin: "4px 0" }}>
              <span style={{ flex: 1, height: "1px",
                background: "rgba(0,212,255,0.1)" }} />
              <span style={{ fontSize: "10px",
                color: "rgba(148,163,184,0.65)",
                ...orbitron, letterSpacing: "0.1em" }}>O</span>
              <span style={{ flex: 1, height: "1px",
                background: "rgba(0,212,255,0.1)" }} />
            </div>

            {!showRegister ? (
              <button
                onClick={() => setShowRegister(true)}
                style={{ width: "100%", padding: "12px",
                  background: "transparent",
                  border: "1px solid rgba(0,212,255,0.1)",
                  color: "rgba(148,163,184,0.6)",
                  cursor: "pointer", fontSize: "13px" }}>
                Crear cuenta con email
              </button>
            ) : (
              <div style={{ display: "flex",
                flexDirection: "column", gap: "8px" }}>
                <input type="text" placeholder="Tu nombre"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  style={inputStyle} />
                <input type="email" value={invite?.email || ""}
                  disabled
                  style={{ ...inputStyle,
                    color: "rgba(148,163,184,0.75)",
                    borderColor: "rgba(0,212,255,0.1)" }} />
                <input type="password"
                  placeholder="Contraseña (mín. 8 caracteres)"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  style={inputStyle} />
                <input type="password"
                  placeholder="Confirmar contraseña"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleRegisterAndAccept()}
                  style={inputStyle} />
                {regError && (
                  <p style={{ fontSize: "11px",
                    color: "#ff2d55", margin: 0 }}>
                    {regError}
                  </p>
                )}
                <button
                  onClick={handleRegisterAndAccept}
                  disabled={regLoading}
                  style={{ width: "100%", padding: "12px",
                    background: "rgba(0,212,255,0.1)",
                    border: "1px solid rgba(0,212,255,0.3)",
                    color: regLoading
                      ? "rgba(148,163,184,0.7)" : "white",
                    cursor: regLoading
                      ? "not-allowed" : "pointer",
                    ...orbitron, fontSize: "11px",
                    letterSpacing: "0.15em" }}>
                  {regLoading
                    ? "PROCESANDO..."
                    : "CREAR CUENTA Y UNIRME →"}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Autenticado → botón aceptar ── */
          <button
            onClick={handleAccept}
            disabled={accepting}
            style={{ width: "100%", padding: "13px",
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.3)",
              color: accepting
                ? "rgba(148,163,184,0.7)" : "white",
              cursor: accepting ? "not-allowed" : "pointer",
              ...orbitron, fontSize: "11px",
              letterSpacing: "0.15em" }}>
            {accepting
              ? "PROCESANDO..."
              : "ACEPTAR INVITACIÓN →"}
          </button>
        )}
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center",
      gap: "12px", marginBottom: "32px" }}>
      <div style={{ width: 38, height: 38,
        display: "flex", alignItems: "center",
        justifyContent: "center", background: "#000",
        border: "1px solid rgba(0,212,255,0.4)",
        boxShadow: "0 0 12px rgba(0,212,255,0.2)" }}>
        <Zap style={{ width: 20, height: 20, color: "#00d4ff" }} />
      </div>
      <span style={{ fontFamily: "'Orbitron', sans-serif",
        fontSize: "18px", fontWeight: 700, color: "white",
        letterSpacing: "0.2em" }}>
        SODARE
      </span>
    </div>
  );
}

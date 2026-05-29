"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Settings, Users, Mail, Trash2, Copy,
  CheckCircle, Clock, AlertTriangle, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const router = useRouter();

  const inp: React.CSSProperties = {
    padding: "8px 12px",
    background: "rgba(0,212,255,0.03)",
    border: "1px solid rgba(0,212,255,0.1)",
    color: "#e2e8f0",
    fontSize: "13px",
    outline: "none",
    width: "100%",
  };

  const fetchData = useCallback(async (wsId: string) => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/workspace/${wsId}/members`),
        fetch(`/api/workspace/${wsId}/invite`),
      ]);
      const [membersData, invitesData] = await Promise.all([
        membersRes.json(),
        invitesRes.json(),
      ]);
      if (membersData.data) setMembers(membersData.data);
      if (invitesData.data) setInvites(invitesData.data);
    } catch (err) {
      console.error("[SETTINGS] Fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((data) => {
        if (data.data?.[0]) {
          const ws = data.data[0];
          setWorkspaceId(ws.id);
          setWorkspaceName(ws.name || "");
          fetchData(ws.id);
        }
        setLoading(false);
      });
  }, [fetchData]);

  async function handleInvite() {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      setError("Email inválido");
      return;
    }
    setSending(true);
    setError("");
    const res = await fetch(`/api/workspace/${workspaceId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al enviar invitación");
      setSending(false);
      return;
    }
    setLastInviteUrl(data.data.inviteUrl);
    setInviteEmail("");
    setSending(false);
    fetchData(workspaceId);
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(lastInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("¿Remover este miembro del workspace?")) return;
    await fetch(`/api/workspace/${workspaceId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    fetchData(workspaceId);
  }

  const roleBadgeColor: Record<string, string> = {
    OWNER: "var(--cyan)",
    ADMIN: "var(--amber)",
    MEMBER: "rgba(148,163,184,0.5)",
  };

  async function handleRoleChange(userId: string, newRole: string) {
    const res = await fetch(`/api/workspace/${workspaceId}/members/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Error al cambiar rol");
      return;
    }
    fetchData(workspaceId);
  }

  async function handleRenameWorkspace() {
    if (!workspaceName || workspaceName.trim().length < 2) {
      alert("El nombre debe tener al menos 2 caracteres");
      return;
    }
    const res = await fetch(`/api/workspace/${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: workspaceName.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Error al renombrar");
    }
  }

  async function handleDeleteWorkspace() {
    const confirm1 = prompt(
      "Escribe ELIMINAR para confirmar la eliminación del workspace"
    );
    if (confirm1 !== "ELIMINAR") return;
    const res = await fetch(`/api/workspace/${workspaceId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Error al eliminar");
      return;
    }
    router.push("/onboarding");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Gestión del workspace y equipo."
          icon={<Settings className="w-6 h-6" style={{ color: "#00d4ff" }} />} />
        <div style={{ textAlign: "center", padding: "48px",
          color: "rgba(148,163,184,0.3)", fontSize: "12px" }}>
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Gestión del workspace, equipo e invitaciones."
        icon={<Settings className="w-6 h-6" style={{ color: "#00d4ff" }} />}
      />

      {/* INVITAR MIEMBRO */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div className="section-header" style={{ marginBottom: "20px" }}>
          <span className="section-title" style={{ display: "flex",
            alignItems: "center", gap: "8px" }}>
            <Mail style={{ width: 14, height: 14, color: "#00d4ff" }} />
            Invitar al equipo
          </span>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <input
            type="email"
            placeholder="email@empresa.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            style={{ ...inp, flex: 1, minWidth: "200px" }}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            style={{ ...inp, width: "140px",
              appearance: "none", cursor: "pointer" }}
          >
            <option value="MEMBER">Miembro</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={sending}
            className="btn-primary"
            style={{ opacity: sending ? 0.6 : 1 }}
          >
            {sending ? "Enviando..." : "Invitar →"}
          </button>
        </div>

        {error && (
          <p style={{ fontSize: "12px", color: "var(--red)",
            marginTop: "8px" }}>{error}</p>
        )}

        {/* URL de invitación generada */}
        {lastInviteUrl && (
          <div style={{ marginTop: "16px", padding: "12px",
            background: "rgba(6,214,160,0.05)",
            border: "1px solid rgba(6,214,160,0.2)" }}>
            <p style={{ fontSize: "11px",
              color: "rgba(148,163,184,0.5)", marginBottom: "6px",
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: "0.1em" }}>
              ENLACE DE INVITACIÓN GENERADO
            </p>
            <div style={{ display: "flex", alignItems: "center",
              gap: "8px" }}>
              <code style={{ flex: 1, fontSize: "11px",
                color: "#06d6a0", wordBreak: "break-all",
                background: "rgba(6,214,160,0.05)", padding: "6px 8px" }}>
                {lastInviteUrl}
              </code>
              <button
                onClick={handleCopyUrl}
                style={{ padding: "6px 12px", background: "transparent",
                  border: "1px solid rgba(6,214,160,0.3)",
                  color: "#06d6a0", cursor: "pointer",
                  fontSize: "11px", whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: "4px" }}>
                {copied
                  ? <><CheckCircle style={{ width: 12, height: 12 }} /> Copiado</>
                  : <><Copy style={{ width: 12, height: 12 }} /> Copiar</>
                }
              </button>
            </div>
            <p style={{ fontSize: "11px",
              color: "rgba(148,163,184,0.3)", marginTop: "6px" }}>
              Comparte este enlace por WhatsApp, email o Slack. Expira en 7 días.
            </p>
          </div>
        )}
      </div>

      {/* INVITACIONES PENDIENTES */}
      {invites.length > 0 && (
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div className="section-header" style={{ marginBottom: "16px" }}>
            <span className="section-title" style={{ display: "flex",
              alignItems: "center", gap: "8px" }}>
              <Clock style={{ width: 14, height: 14,
                color: "var(--amber)" }} />
              Invitaciones pendientes
            </span>
            <span className="badge badge-amber">{invites.length}</span>
          </div>
          {invites.map((inv: any) => (
            <div key={inv.id} className="data-row">
              <div>
                <p style={{ fontSize: "13px", color: "#e2e8f0" }}>
                  {inv.email}
                </p>
                <p style={{ fontSize: "11px",
                  color: "rgba(148,163,184,0.4)" }}>
                  Rol: {inv.role} · Expira:{" "}
                  {new Date(inv.expires).toLocaleDateString("es-MX")}
                </p>
              </div>
              <span className="badge badge-amber">Pendiente</span>
            </div>
          ))}
        </div>
      )}

      {/* MIEMBROS ACTUALES */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div className="section-header" style={{ marginBottom: "16px" }}>
          <span className="section-title" style={{ display: "flex",
            alignItems: "center", gap: "8px" }}>
            <Users style={{ width: 14, height: 14,
              color: "var(--cyan)" }} />
            Equipo actual
          </span>
          <span className="badge badge-cyan">{members.length}</span>
        </div>

        {members.map((m: any) => (
          <div key={m.id} className="data-row">
            <div style={{ display: "flex", alignItems: "center",
              gap: "12px" }}>
              {m.user.image ? (
                <img src={m.user.image} alt={m.user.name || ""}
                  style={{ width: 32, height: 32, borderRadius: "50%",
                    border: "1px solid rgba(0,212,255,0.2)" }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: "50%",
                  background: "rgba(0,212,255,0.1)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: "11px", color: "#00d4ff" }}>
                  {(m.user.name || "U")[0].toUpperCase()}
                </div>
              )}
              <div>
                <p style={{ fontSize: "13px", color: "#e2e8f0",
                  fontWeight: 500 }}>
                  {m.user.name || "Sin nombre"}
                </p>
                <p style={{ fontSize: "11px",
                  color: "rgba(148,163,184,0.4)" }}>
                  {m.user.email}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center",
              gap: "8px" }}>
              <span style={{ fontSize: "10px", fontWeight: 600,
                color: roleBadgeColor[m.role] || "white",
                fontFamily: "'Orbitron', sans-serif",
                letterSpacing: "0.1em" }}>
                {m.role}
              </span>
              {m.role !== "OWNER" &&
                m.user.id !== session?.user?.id && (
                <button
                  onClick={() => handleRemoveMember(m.user.id)}
                  style={{ background: "none", border: "none",
                    cursor: "pointer", padding: "4px",
                    color: "rgba(255,45,85,0.5)",
                    transition: "color 0.2s" }}
                  title="Remover miembro">
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              )}
              {m.role !== "OWNER" &&
                m.user.id !== session?.user?.id && (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.user.id, e.target.value)}
                  style={{
                    background: "rgba(0,212,255,0.03)",
                    border: "1px solid rgba(0,212,255,0.1)",
                    color: "#e2e8f0", fontSize: "10px",
                    padding: "2px 6px", cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="OWNER">OWNER</option>
                </select>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ZONA PELIGROSA — WORKSPACE MANAGEMENT */}
      <div className="glass-panel" style={{ padding: "24px",
        borderColor: "rgba(255,45,85,0.15)" }}>
        <div className="section-header" style={{ marginBottom: "16px" }}>
          <span className="section-title" style={{ display: "flex",
            alignItems: "center", gap: "8px" }}>
            <Shield style={{ width: 14, height: 14,
              color: "var(--red)" }} />
            Workspace
          </span>
        </div>

        {/* Renombrar */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px",
          flexWrap: "wrap" }}>
          <input
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            style={{ ...inp, flex: 1, minWidth: "200px" }}
          />
          <button
            onClick={handleRenameWorkspace}
            className="btn-primary"
          >
            Renombrar
          </button>
        </div>

        {/* Eliminar */}
        <div style={{ padding: "12px",
          background: "rgba(255,45,85,0.03)",
          border: "1px solid rgba(255,45,85,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center",
            gap: "8px", marginBottom: "8px" }}>
            <AlertTriangle style={{ width: 14, height: 14,
              color: "#ff2d55" }} />
            <span style={{ fontSize: "11px", color: "#ff2d55",
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: "0.1em" }}>
              ZONA PELIGROSA
            </span>
          </div>
          <p style={{ fontSize: "12px",
            color: "rgba(148,163,184,0.5)", marginBottom: "12px" }}>
            Eliminar este workspace borrará todos los proyectos,
            miembros e invitaciones. Esta acción no se puede deshacer.
          </p>
          <button
            onClick={handleDeleteWorkspace}
            style={{ padding: "8px 16px",
              background: "rgba(255,45,85,0.1)",
              border: "1px solid rgba(255,45,85,0.3)",
              color: "#ff2d55", cursor: "pointer",
              fontSize: "11px",
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: "0.1em" }}>
            ELIMINAR WORKSPACE
          </button>
        </div>
      </div>
    </div>
  );
}

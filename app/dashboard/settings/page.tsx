"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Settings, Users, Mail, Trash2, Copy, CheckCircle, Clock, AlertTriangle,
  Shield, User, Plug, CreditCard, Globe, ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { IntegrationsPanel } from "@/components/publisher/IntegrationsPanel";

// ── Settings catalogue: groups (menus) → sections (submenus) ──
// Single source of truth — add a section here and render it in the switch below.
type SectionKey = "profile" | "preferences" | "general" | "team" | "integrations" | "plan" | "danger";

const SETTINGS_GROUPS: {
  group: string;
  items: { key: SectionKey; label: string; icon: React.ElementType; roles?: string[] }[];
}[] = [
  {
    group: "Cuenta",
    items: [
      { key: "profile", label: "Perfil", icon: User },
      { key: "preferences", label: "Preferencias", icon: Settings },
    ],
  },
  {
    group: "Workspace",
    items: [
      { key: "general", label: "General", icon: Globe },
      { key: "team", label: "Equipo y roles", icon: Users, roles: ["OWNER", "ADMIN"] },
      { key: "integrations", label: "Integraciones", icon: Plug },
      { key: "plan", label: "Plan", icon: CreditCard },
    ],
  },
  {
    group: "Seguridad",
    items: [{ key: "danger", label: "Zona peligrosa", icon: Shield, roles: ["OWNER"] }],
  },
];

const SECTION_KEY = "sodare:settings-section";
const PREFS_KEY = "sodare:prefs";
const DEFAULT_PREFS = {
  emailNotifications: true,
  slaAlerts: true,
  reduceMotion: false,
  compactTables: false,
};
type Prefs = typeof DEFAULT_PREFS;

const inp: React.CSSProperties = {
  padding: "8px 12px",
  background: "rgba(0,212,255,0.03)",
  border: "1px solid rgba(0,212,255,0.1)",
  color: "#e2e8f0",
  fontSize: "13px",
  outline: "none",
  width: "100%",
};

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
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [workspacePlan, setWorkspacePlan] = useState("free");
  const [userRole, setUserRole] = useState<string>("");
  const [activeSection, setActiveSection] = useState<SectionKey>("general");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const router = useRouter();

  // Restore section + preferences (client-only).
  useEffect(() => {
    try {
      const s = localStorage.getItem(SECTION_KEY) as SectionKey | null;
      if (s) setActiveSection(s);
      const p = localStorage.getItem(PREFS_KEY);
      if (p) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(p) });
    } catch { /* ignore */ }
  }, []);

  const selectSection = (key: SectionKey) => {
    setActiveSection(key);
    try { localStorage.setItem(SECTION_KEY, key); } catch { /* ignore */ }
  };

  const setPref = (key: keyof Prefs, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
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
      if (membersData.data) {
        setMembers(membersData.data);
        const me = membersData.data.find((m: any) => m.user.id === session?.user?.id);
        if (me) setUserRole(me.role);
      }
      if (invitesData.data) setInvites(invitesData.data);
    } catch (err) {
      console.error("[SETTINGS] Fetch error:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((data) => {
        if (data.data?.[0]) {
          const ws = data.data[0];
          setWorkspaceId(ws.id);
          setWorkspaceName(ws.name || "");
          setWorkspaceSlug(ws.slug || "");
          setWorkspacePlan(ws.plan || "free");
          fetchData(ws.id);
        }
        setLoading(false);
      });
  }, [fetchData]);

  async function handleInvite() {
    if (!inviteEmail || !inviteEmail.includes("@")) { setError("Email inválido"); return; }
    setSending(true);
    setError("");
    const res = await fetch(`/api/workspace/${workspaceId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Error al enviar invitación"); setSending(false); return; }
    setLastInviteUrl(data.data.inviteUrl || "");
    setEmailSent(data.data.emailSent || false);
    setInviteEmail("");
    setSending(false);
    fetchData(workspaceId);
  }

  async function handleCancelInvite(inviteId: string) {
    if (!confirm("¿Cancelar esta invitación?")) return;
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/invite/${inviteId}`, { method: "DELETE" });
      if (!res.ok) { const data = await res.json(); alert(data.error || "Error al cancelar invitación"); return; }
      fetchData(workspaceId);
    } catch { alert("Error de red al cancelar invitación"); }
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

  const roleBadgeColor: Record<string, string> = { OWNER: "var(--cyan)", ADMIN: "var(--amber)", MEMBER: "#64748b" };

  async function handleRoleChange(userId: string, newRole: string) {
    const res = await fetch(`/api/workspace/${workspaceId}/members/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Error al cambiar rol"); return; }
    fetchData(workspaceId);
  }

  async function handleRenameWorkspace() {
    if (!workspaceName || workspaceName.trim().length < 2) { alert("El nombre debe tener al menos 2 caracteres"); return; }
    const res = await fetch(`/api/workspace/${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: workspaceName.trim() }),
    });
    if (!res.ok) { const data = await res.json(); alert(data.error || "Error al renombrar"); }
    else alert("Workspace actualizado");
  }

  async function handleDeleteWorkspace() {
    const confirm1 = prompt("Escribe ELIMINAR para confirmar la eliminación del workspace");
    if (confirm1 !== "ELIMINAR") return;
    const res = await fetch(`/api/workspace/${workspaceId}`, { method: "DELETE" });
    if (!res.ok) { const data = await res.json(); alert(data.error || "Error al eliminar"); return; }
    router.push("/onboarding");
  }

  const isAdmin = userRole === "OWNER" || userRole === "ADMIN";

  // Build the visible nav (role-gated) and keep the active section valid.
  const visibleGroups = SETTINGS_GROUPS.map((g) => ({
    group: g.group,
    items: g.items.filter((it) => !it.roles || it.roles.includes(userRole)),
  })).filter((g) => g.items.length > 0);

  useEffect(() => {
    if (loading) return;
    const allKeys = visibleGroups.flatMap((g) => g.items.map((i) => i.key));
    if (!allKeys.includes(activeSection) && allKeys.length > 0) setActiveSection(allKeys[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userRole]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin" description="Configuración de tu cuenta y workspace."
          icon={<Settings className="w-6 h-6" style={{ color: "#00d4ff" }} />} />
        <div style={{ textAlign: "center", padding: "48px", color: "rgba(148,163,184,0.65)", fontSize: "12px" }}>
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="Configuración de tu cuenta, equipo y workspace."
        icon={<Settings className="w-6 h-6" style={{ color: "#00d4ff" }} />}
      />

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* ── Left nav: groups (menus) + sections (submenus) ── */}
        <nav style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {visibleGroups.map((g) => (
            <div key={g.group}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
                color: "rgba(148,163,184,0.55)", padding: "0 10px 6px",
              }}>
                {g.group}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {g.items.map((it) => {
                  const active = activeSection === it.key;
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.key}
                      onClick={() => selectSection(it.key)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        padding: "9px 12px", borderRadius: 8,
                        background: active ? "rgba(0,212,255,0.08)" : "transparent",
                        border: active ? "1px solid rgba(0,212,255,0.18)" : "1px solid transparent",
                        color: active ? "#e2e8f0" : "#94a3b8",
                        fontSize: 13, fontWeight: active ? 600 : 400,
                        cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
                      }}
                    >
                      <Icon style={{ width: 15, height: 15, color: active ? "#00d4ff" : "#64748b", flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{it.label}</span>
                      {active && <ChevronRight style={{ width: 13, height: 13, color: "#00d4ff", opacity: 0.6 }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Right content ── */}
        <div style={{ flex: 1, minWidth: 320, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* PERFIL */}
          {activeSection === "profile" && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <div className="section-header" style={{ marginBottom: 20 }}>
                <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <User style={{ width: 14, height: 14, color: "#00d4ff" }} /> Perfil
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {session?.user?.image ? (
                  <img src={session.user.image} alt="" style={{ width: 56, height: 56, borderRadius: "50%", border: "1px solid rgba(0,212,255,0.2)" }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,212,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron', sans-serif", fontSize: 18, color: "#00d4ff" }}>
                    {(session?.user?.name || "U")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{session?.user?.name || "Sin nombre"}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{session?.user?.email}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Rol en este workspace: <strong style={{ color: roleBadgeColor[userRole] || "#e2e8f0" }}>{userRole || "—"}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* PREFERENCIAS */}
          {activeSection === "preferences" && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <div className="section-header" style={{ marginBottom: 8 }}>
                <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Settings style={{ width: 14, height: 14, color: "#00d4ff" }} /> Preferencias
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>Estas preferencias se guardan en este navegador.</p>
              <PrefToggle label="Notificaciones por email" desc="Recibir avisos de actividad y menciones por correo." checked={prefs.emailNotifications} onChange={(v) => setPref("emailNotifications", v)} />
              <PrefToggle label="Alertas de SLA" desc="Avisos cuando una tarea se acerca a su fecha límite." checked={prefs.slaAlerts} onChange={(v) => setPref("slaAlerts", v)} />
              <PrefToggle label="Reducir movimiento" desc="Minimiza animaciones del fondo y transiciones." checked={prefs.reduceMotion} onChange={(v) => setPref("reduceMotion", v)} />
              <PrefToggle label="Tablas compactas" desc="Filas más densas en las tablas de datos." checked={prefs.compactTables} onChange={(v) => setPref("compactTables", v)} last />
            </div>
          )}

          {/* GENERAL (workspace) */}
          {activeSection === "general" && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <div className="section-header" style={{ marginBottom: 20 }}>
                <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Globe style={{ width: 14, height: 14, color: "#00d4ff" }} /> General
                </span>
              </div>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>Nombre del workspace</label>
              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <input type="text" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} disabled={!isAdmin} style={{ ...inp, flex: 1, minWidth: 200, opacity: isAdmin ? 1 : 0.6 }} />
                {isAdmin && <button onClick={handleRenameWorkspace} className="btn-primary">Guardar</button>}
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Slug</div>
                  <div style={{ fontSize: 13, color: "#e2e8f0", fontFamily: "monospace" }}>{workspaceSlug || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Plan</div>
                  <div style={{ fontSize: 13, color: "#e2e8f0", textTransform: "capitalize" }}>{workspacePlan}</div>
                </div>
              </div>
            </div>
          )}

          {/* EQUIPO Y ROLES */}
          {activeSection === "team" && isAdmin && (
            <>
              <div className="glass-panel" style={{ padding: 24 }}>
                <div className="section-header" style={{ marginBottom: 20 }}>
                  <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Mail style={{ width: 14, height: 14, color: "#00d4ff" }} /> Invitar al equipo
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <input type="email" placeholder="email@empresa.com" value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    style={{ ...inp, flex: 1, minWidth: 200 }} />
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={{ ...inp, width: 140, appearance: "none", cursor: "pointer" }}>
                    <option value="MEMBER">Miembro</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button onClick={handleInvite} disabled={sending} className="btn-primary" style={{ opacity: sending ? 0.6 : 1 }}>
                    {sending ? "Enviando..." : "Invitar →"}
                  </button>
                </div>
                {error && <p style={{ fontSize: 12, color: "var(--red)", marginTop: 8 }}>{error}</p>}
                {emailSent && (
                  <div style={{ marginTop: 16, padding: 12, background: "rgba(6,214,160,0.05)", border: "1px solid rgba(6,214,160,0.2)" }}>
                    <p style={{ fontSize: 13, color: "#06d6a0", display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle style={{ width: 16, height: 16 }} /> Invitación enviada por email. Expira en 7 días.
                    </p>
                  </div>
                )}
                {!emailSent && lastInviteUrl && (
                  <div style={{ marginTop: 16, padding: 12, background: "rgba(6,214,160,0.05)", border: "1px solid rgba(6,214,160,0.2)" }}>
                    <p style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em" }}>ENLACE DE INVITACIÓN GENERADO</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <code style={{ flex: 1, fontSize: 11, color: "#06d6a0", wordBreak: "break-all", background: "rgba(6,214,160,0.05)", padding: "6px 8px" }}>{lastInviteUrl}</code>
                      <button onClick={handleCopyUrl} style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(6,214,160,0.3)", color: "#06d6a0", cursor: "pointer", fontSize: 11, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                        {copied ? <><CheckCircle style={{ width: 12, height: 12 }} /> Copiado</> : <><Copy style={{ width: 12, height: 12 }} /> Copiar</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {invites.length > 0 && (
                <div className="glass-panel" style={{ padding: 24 }}>
                  <div className="section-header" style={{ marginBottom: 16 }}>
                    <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Clock style={{ width: 14, height: 14, color: "var(--amber)" }} /> Invitaciones pendientes
                    </span>
                    <span className="badge badge-amber">{invites.length}</span>
                  </div>
                  {invites.map((inv: any) => (
                    <div key={inv.id} className="data-row">
                      <div>
                        <p style={{ fontSize: 13, color: "#e2e8f0" }}>{inv.email}</p>
                        <p style={{ fontSize: 11, color: "#64748b" }}>Rol: {inv.role} · Expira: {new Date(inv.expires).toLocaleDateString("es-MX")}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="badge badge-amber">Pendiente</span>
                        <button onClick={() => handleCancelInvite(inv.id)} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, color: "#ef4444", fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>Cancelar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="glass-panel" style={{ padding: 24 }}>
                <div className="section-header" style={{ marginBottom: 16 }}>
                  <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Users style={{ width: 14, height: 14, color: "var(--cyan)" }} /> Equipo actual
                  </span>
                  <span className="badge badge-cyan">{members.length}</span>
                </div>
                {members.map((m: any) => (
                  <div key={m.id} className="data-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {m.user.image ? (
                        <img src={m.user.image} alt={m.user.name || ""} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(0,212,255,0.2)" }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,212,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "#00d4ff" }}>
                          {(m.user.name || "U")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>{m.user.name || "Sin nombre"}</p>
                        <p style={{ fontSize: 11, color: "#64748b" }}>{m.user.email}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: roleBadgeColor[m.role] || "white", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em" }}>{m.role}</span>
                      {m.role !== "OWNER" && m.user.id !== session?.user?.id && (
                        <>
                          <button onClick={() => handleRemoveMember(m.user.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "rgba(255,45,85,0.5)" }} title="Remover miembro">
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                          <select value={m.role} onChange={(e) => handleRoleChange(m.user.id, e.target.value)} style={{ background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)", color: "#e2e8f0", fontSize: 10, padding: "2px 6px", cursor: "pointer", outline: "none" }}>
                            <option value="MEMBER">MEMBER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="OWNER">OWNER</option>
                          </select>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* INTEGRACIONES */}
          {activeSection === "integrations" && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <div className="section-header" style={{ marginBottom: 16 }}>
                <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Plug style={{ width: 14, height: 14, color: "#00d4ff" }} /> Integraciones
                </span>
              </div>
              <IntegrationsPanel />
            </div>
          )}

          {/* PLAN */}
          {activeSection === "plan" && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <div className="section-header" style={{ marginBottom: 20 }}>
                <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CreditCard style={{ width: 14, height: 14, color: "#00d4ff" }} /> Plan
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 8, background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>Plan actual</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", textTransform: "capitalize" }}>{workspacePlan}</div>
                </div>
                {workspacePlan === "free" && isAdmin && (
                  <button className="btn-primary" disabled title="Próximamente" style={{ opacity: 0.6, cursor: "not-allowed" }}>Mejorar plan (pronto)</button>
                )}
              </div>
              <p style={{ fontSize: 11, color: "#64748b", marginTop: 12 }}>Free · Pro · Agency. La gestión de planes y facturación llegará pronto.</p>
            </div>
          )}

          {/* ZONA PELIGROSA */}
          {activeSection === "danger" && userRole === "OWNER" && (
            <div className="glass-panel" style={{ padding: 24, borderColor: "rgba(255,45,85,0.15)" }}>
              <div className="section-header" style={{ marginBottom: 16 }}>
                <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield style={{ width: 14, height: 14, color: "var(--red)" }} /> Zona peligrosa
                </span>
              </div>
              <div style={{ padding: 12, background: "rgba(255,45,85,0.03)", border: "1px solid rgba(255,45,85,0.15)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <AlertTriangle style={{ width: 14, height: 14, color: "#ff2d55" }} />
                  <span style={{ fontSize: 11, color: "#ff2d55", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em" }}>ELIMINAR WORKSPACE</span>
                </div>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>Borra todos los proyectos, miembros e invitaciones. Esta acción no se puede deshacer.</p>
                <button onClick={handleDeleteWorkspace} style={{ padding: "8px 16px", background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)", color: "#ff2d55", cursor: "pointer", fontSize: 11, fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em" }}>
                  ELIMINAR WORKSPACE
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Preference toggle row ── */
function PrefToggle({ label, desc, checked, onChange, last }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      padding: "12px 0", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
    }}>
      <div>
        <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{desc}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        style={{
          width: 40, height: 22, borderRadius: 11, flexShrink: 0, position: "relative",
          background: checked ? "var(--cyan)" : "rgba(255,255,255,0.1)",
          border: "none", cursor: "pointer", transition: "background 0.2s",
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}

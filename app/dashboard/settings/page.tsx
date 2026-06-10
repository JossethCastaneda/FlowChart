"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Settings, Users, Mail, Trash2, Copy, CheckCircle, Clock, AlertTriangle,
  Shield, User, Plug, CreditCard, Globe, ChevronRight, Lock, Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { IntegrationsPanel } from "@/components/publisher/IntegrationsPanel";
import { AreasManager } from "@/components/settings/AreasManager";
import { PermissionsManager } from "@/components/settings/PermissionsManager";

// ── Settings catalogue: groups (menus) → sections (submenus) ──
// Single source of truth — add a section here and render it in the switch below.
type SectionKey = "profile" | "preferences" | "general" | "team" | "areas" | "permisos" | "integrations" | "plan" | "danger";

const SETTINGS_GROUPS: {
  group: string;
  items: { key: SectionKey; label: string; icon: React.ElementType; roles?: string[]; desc?: string }[];
}[] = [
  {
    group: "Cuenta",
    items: [
      { key: "profile", label: "Perfil", icon: User, desc: "Tu información personal" },
      { key: "preferences", label: "Preferencias", icon: Settings, desc: "Notificaciones y UI" },
    ],
  },
  {
    group: "Workspace",
    items: [
      { key: "general", label: "General", icon: Globe, desc: "Nombre y configuración" },
      { key: "team", label: "Equipo y roles", icon: Users, roles: ["OWNER", "ADMIN"], desc: "Miembros e invitaciones" },
      { key: "areas", label: "Áreas y flujos", icon: Layers, desc: "Departamentos y SLA" },
      { key: "permisos", label: "Permisos", icon: Shield, roles: ["OWNER", "ADMIN"], desc: "Control de acceso por área" },
      { key: "integrations", label: "Integraciones", icon: Plug, desc: "Conexiones externas" },
      { key: "plan", label: "Plan", icon: CreditCard, desc: "Suscripción y facturación" },
    ],
  },
  {
    group: "Seguridad",
    items: [{ key: "danger", label: "Zona peligrosa", icon: Shield, roles: ["OWNER"], desc: "Eliminar workspace" }],
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
  const [profileData, setProfileData] = useState<{ id: string, name: string, email: string, image: string, providers: string[] } | null>(null);
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
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
      
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          setProfileData(data.data);
          setProfileName(data.data.profile.name || "");
        }
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

  async function handleSaveProfile() {
    if (!profileName.trim()) {
      alert("El nombre no puede estar vacío");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al actualizar perfil");
      } else {
        alert("Perfil actualizado correctamente. Los cambios se reflejarán completamente al recargar.");
      }
    } catch (err) {
      alert("Error de red al actualizar perfil");
    }
    setSavingProfile(false);
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

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {/* ── Left nav: groups (menus) + sections (submenus) ── */}
        <nav className="w-full lg:w-56 shrink-0 flex flex-row lg:flex-col gap-2 lg:gap-6 sticky top-0 z-10 lg:z-auto bg-[var(--background)] lg:bg-transparent pb-3 pt-2 lg:p-0 border-b border-[var(--border)] lg:border-none overflow-x-auto scrollbar-hide">
          {visibleGroups.map((g, gi) => (
            <div key={g.group} className="flex flex-row lg:flex-col items-center lg:items-stretch gap-2">
              <div className="hidden lg:block">
                {gi > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 10px 8px" }} />}
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase",
                  color: "rgba(148,163,184,0.45)", padding: "4px 12px 8px",
                  borderLeft: "2px solid rgba(0,212,255,0.15)", marginLeft: 4,
                }}>
                  {g.group}
                </div>
              </div>
              <div className="flex flex-row lg:flex-col gap-2">
                {g.items.map((it) => {
                  const active = activeSection === it.key;
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.key}
                      onClick={() => selectSection(it.key)}
                      className={`flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg border transition-all text-sm lg:text-[13px] whitespace-nowrap lg:whitespace-normal
                        ${active 
                          ? "bg-[rgba(0,212,255,0.08)] border-[rgba(0,212,255,0.18)] text-slate-200 font-semibold" 
                          : "bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-300"}`}
                      style={{ textAlign: "left" }}
                    >
                      <Icon className={`w-4 h-4 lg:w-[15px] lg:h-[15px] shrink-0 ${active ? "text-[#00d4ff]" : "text-slate-500"}`} />
                      <div className="flex-1">
                        <span>{it.label}</span>
                        {(it as any).desc && <div className="hidden lg:block text-[10px] text-slate-500 font-normal mt-0.5">{(it as any).desc}</div>}
                      </div>
                      {active && <ChevronRight className="hidden lg:block w-3 h-3 text-[#00d4ff] opacity-60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Right content ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 w-full">

          {/* PERFIL */}
          {activeSection === "profile" && (
            <div className="flex flex-col gap-6">
              <div className="glass-panel p-4 md:p-6">
                <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 md:mb-5">
                  <span className="section-title flex items-center gap-2">
                    <User className="w-4 h-4 text-[#00d4ff]" /> Perfil
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-6">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="" className="w-14 h-14 rounded-full border border-[rgba(0,212,255,0.2)]" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[rgba(0,212,255,0.1)] flex items-center justify-center font-display text-lg text-[#00d4ff]">
                      {(session?.user?.name || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-[15px] font-semibold text-slate-200">{session?.user?.name || "Sin nombre"}</div>
                    <div className="text-xs text-slate-500">{session?.user?.email}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Rol en este workspace: <strong style={{ color: roleBadgeColor[userRole] || "#e2e8f0" }}>{userRole || "—"}</strong></div>
                  </div>
                </div>

                <label className="text-[11px] text-slate-500 block mb-1.5">Nombre de visualización</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="flex-1 w-full" style={inp} placeholder="Tu nombre" />
                  <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary w-full sm:w-auto" style={{ opacity: savingProfile ? 0.6 : 1 }}>
                    {savingProfile ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>

              {/* CUENTAS VINCULADAS */}
              {profileData && (
                <div className="glass-panel p-4 md:p-6">
                  <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 md:mb-5">
                    <span className="section-title flex items-center gap-2">
                      <Plug className="w-4 h-4 text-[#00d4ff]" /> Cuentas vinculadas para inicio de sesión
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">Vincular tus cuentas te permitirá iniciar sesión rápidamente con cualquiera de ellas.</p>
                  
                  <div className="flex flex-col gap-3">
                    {/* Email */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-[13px] text-slate-200 font-medium">Correo Electrónico</p>
                          <p className="text-[11px] text-slate-500">{session?.user?.email}</p>
                        </div>
                      </div>
                      {profileData.providers.includes("email") ? (
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Conectado</span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-400/10 px-2 py-1 rounded">Sin contraseña</span>
                      )}
                    </div>

                    {/* Google */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        <div>
                          <p className="text-[13px] text-slate-200 font-medium">Google</p>
                          <p className="text-[11px] text-slate-500">Inicia sesión con Google</p>
                        </div>
                      </div>
                      {profileData.providers.includes("google") ? (
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Conectado</span>
                      ) : (
                        <button onClick={() => signIn("google")} className="btn-primary text-xs !py-1.5 !px-3">Vincular</button>
                      )}
                    </div>

                    {/* Facebook */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        <div>
                          <p className="text-[13px] text-slate-200 font-medium">Facebook</p>
                          <p className="text-[11px] text-slate-500">Inicia sesión con Facebook</p>
                        </div>
                      </div>
                      {profileData.providers.includes("facebook") ? (
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Conectado</span>
                      ) : (
                        <button onClick={() => signIn("facebook")} className="btn-primary text-xs !py-1.5 !px-3">Vincular</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PREFERENCIAS */}
          {activeSection === "preferences" && (
            <div className="glass-panel p-4 md:p-6">
              <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-2">
                <span className="section-title flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#00d4ff]" /> Preferencias
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Estas preferencias se guardan en este navegador.</p>
              <PrefToggle label="Notificaciones por email" desc="Recibir avisos de actividad y menciones por correo." checked={prefs.emailNotifications} onChange={(v) => setPref("emailNotifications", v)} />
              <PrefToggle label="Alertas de SLA" desc="Avisos cuando una tarea se acerca a su fecha límite." checked={prefs.slaAlerts} onChange={(v) => setPref("slaAlerts", v)} />
              <PrefToggle label="Reducir movimiento" desc="Minimiza animaciones del fondo y transiciones." checked={prefs.reduceMotion} onChange={(v) => setPref("reduceMotion", v)} />
              <PrefToggle label="Tablas compactas" desc="Filas más densas en las tablas de datos." checked={prefs.compactTables} onChange={(v) => setPref("compactTables", v)} last />
            </div>
          )}

          {/* GENERAL (workspace) */}
          {activeSection === "general" && (
            <div className="glass-panel p-4 md:p-6">
              <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 md:mb-5">
                <span className="section-title flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#00d4ff]" /> General
                </span>
              </div>
              <label className="text-[11px] text-slate-500 block mb-1.5">Nombre del workspace</label>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input type="text" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} disabled={!isAdmin} className="flex-1 w-full" style={{ ...inp, opacity: isAdmin ? 1 : 0.6 }} />
                {isAdmin && <button onClick={handleRenameWorkspace} className="btn-primary w-full sm:w-auto">Guardar</button>}
              </div>
              <div className="flex flex-col sm:flex-row gap-6">
                <div>
                  <div className="text-[11px] text-slate-500">Slug</div>
                  <div className="text-[13px] text-slate-200 font-mono mt-1 bg-black/20 px-3 py-1.5 rounded">{workspaceSlug || "—"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Plan</div>
                  <div className="text-[13px] text-slate-200 capitalize mt-1 bg-black/20 px-3 py-1.5 rounded">{workspacePlan}</div>
                </div>
              </div>
            </div>
          )}

          {/* EQUIPO Y ROLES */}
          {activeSection === "team" && isAdmin && (
            <>
              <div className="glass-panel p-4 md:p-6">
                <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 md:mb-5">
                  <span className="section-title flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#00d4ff]" /> Invitar al equipo
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input type="email" placeholder="email@empresa.com" value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    className="flex-1 w-full" style={inp} />
                  <div className="flex gap-3 w-full sm:w-auto">
                    <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-1/2 sm:w-[140px] appearance-none cursor-pointer" style={inp}>
                      <option value="MEMBER">Miembro</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button onClick={handleInvite} disabled={sending} className="btn-primary flex-1 sm:flex-none" style={{ opacity: sending ? 0.6 : 1 }}>
                      {sending ? "Enviando..." : "Invitar →"}
                    </button>
                  </div>
                </div>
                {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                {emailSent && (
                  <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded">
                    <p className="text-[13px] text-emerald-400 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Invitación enviada por email. Expira en 7 días.
                    </p>
                  </div>
                )}
                {!emailSent && lastInviteUrl && (
                  <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded overflow-hidden">
                    <p className="text-[11px] text-slate-500 mb-1.5 font-display tracking-widest">ENLACE DE INVITACIÓN GENERADO</p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <code className="w-full sm:flex-1 text-[11px] text-emerald-400 break-all bg-emerald-500/5 px-2 py-1.5 rounded">{lastInviteUrl}</code>
                      <button onClick={handleCopyUrl} className="px-3 py-1.5 bg-transparent border border-emerald-500/30 text-emerald-400 rounded cursor-pointer text-[11px] whitespace-nowrap flex items-center gap-1 w-full sm:w-auto justify-center">
                        {copied ? <><CheckCircle className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {invites.length > 0 && (
                <div className="glass-panel p-4 md:p-6">
                  <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 flex justify-between items-center">
                    <span className="section-title flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" /> Invitaciones pendientes
                    </span>
                    <span className="badge badge-amber">{invites.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {invites.map((inv: any) => (
                      <div key={inv.id} className="data-row !flex-col sm:!flex-row !items-start sm:!items-center gap-3 sm:gap-0 !px-3 !py-3 rounded-lg bg-white/5 border border-white/5">
                        <div>
                          <p className="text-[13px] text-slate-200 truncate max-w-[200px] sm:max-w-none">{inv.email}</p>
                          <p className="text-[11px] text-slate-500">Rol: {inv.role} · Expira: {new Date(inv.expires).toLocaleDateString("es-MX")}</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                          <span className="badge badge-amber">Pendiente</span>
                          <button onClick={() => handleCancelInvite(inv.id)} className="bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-[11px] px-2.5 py-1 cursor-pointer whitespace-nowrap">Cancelar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="glass-panel p-4 md:p-6">
                <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 flex justify-between items-center">
                  <span className="section-title flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#00d4ff]" /> Equipo actual
                  </span>
                  <span className="badge badge-cyan">{members.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {members.map((m: any) => (
                    <div key={m.id} className="data-row !flex-col sm:!flex-row !items-start sm:!items-center gap-3 sm:gap-0 !px-3 !py-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                        {m.user.image ? (
                          <img src={m.user.image} alt={m.user.name || ""} className="w-8 h-8 rounded-full border border-[rgba(0,212,255,0.2)] shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[rgba(0,212,255,0.1)] flex items-center justify-center font-display text-[11px] text-[#00d4ff] shrink-0">
                            {(m.user.name || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[13px] text-slate-200 font-medium truncate">{m.user.name || "Sin nombre"}</p>
                          <p className="text-[11px] text-slate-500 truncate">{m.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                        <span className="text-[10px] font-semibold text-white font-display tracking-widest" style={{ color: roleBadgeColor[m.role] || "white" }}>{m.role}</span>
                        {m.role !== "OWNER" && m.user.id !== session?.user?.id && (
                          <div className="flex items-center gap-2">
                            <select value={m.role} onChange={(e) => handleRoleChange(m.user.id, e.target.value)} className="bg-[rgba(0,212,255,0.03)] border border-[rgba(0,212,255,0.1)] text-slate-200 text-[10px] px-1.5 py-1 cursor-pointer outline-none rounded">
                              <option value="MEMBER">MEMBER</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="OWNER">OWNER</option>
                            </select>
                            <button onClick={() => handleRemoveMember(m.user.id)} className="bg-transparent border-none cursor-pointer p-1 text-red-500/50 hover:text-red-500 transition-colors" title="Remover miembro">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ÁREAS Y FLUJOS */}
          {activeSection === "areas" && (
            <div className="flex flex-col gap-6">
              {isAdmin && (
                <div className="glass-panel p-4 md:p-6">
                  <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 md:mb-5">
                    <span className="section-title flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#00d4ff]" /> Invitar al equipo
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">Invita a miembros a tu workspace para luego asignarlos a tus áreas y flujos.</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="email" placeholder="email@empresa.com" value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                      className="flex-1 w-full" style={inp} />
                    <div className="flex gap-3 w-full sm:w-auto">
                      <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-1/2 sm:w-[140px] appearance-none cursor-pointer" style={inp}>
                        <option value="MEMBER">Miembro</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button onClick={handleInvite} disabled={sending} className="btn-primary flex-1 sm:flex-none" style={{ opacity: sending ? 0.6 : 1 }}>
                        {sending ? "Enviando..." : "Invitar →"}
                      </button>
                    </div>
                  </div>
                  {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                  {emailSent && (
                    <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded">
                      <p className="text-[13px] text-emerald-400 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Invitación enviada por email. Expira en 7 días.
                      </p>
                    </div>
                  )}
                  {!emailSent && lastInviteUrl && (
                    <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded overflow-hidden">
                      <p className="text-[11px] text-slate-500 mb-1.5 font-display tracking-widest">ENLACE DE INVITACIÓN GENERADO</p>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <code className="w-full sm:flex-1 text-[11px] text-emerald-400 break-all bg-emerald-500/5 px-2 py-1.5 rounded">{lastInviteUrl}</code>
                        <button onClick={handleCopyUrl} className="px-3 py-1.5 bg-transparent border border-emerald-500/30 text-emerald-400 rounded cursor-pointer text-[11px] whitespace-nowrap flex items-center gap-1 w-full sm:w-auto justify-center">
                          {copied ? <><CheckCircle className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="glass-panel p-4 md:p-6 flex flex-col gap-4">
                <div className="section-header !px-0 !pt-0 !border-none !bg-transparent">
                  <span className="section-title flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#00d4ff]" /> Áreas y flujos
                  </span>
                </div>
                <AreasManager members={members.map((m: any) => ({ id: m.user.id, name: m.user.name || "Sin nombre", activityStatus: m.activityStatus }))} canEdit={isAdmin} />
              </div>
            </div>
          )}

          {/* PERMISOS */}
          {activeSection === "permisos" && (
            <div className="glass-panel p-4 md:p-6 flex flex-col gap-4">
              <div className="section-header !px-0 !pt-0 !border-none !bg-transparent">
                <span className="section-title flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#00d4ff]" /> Permisos por área
                </span>
              </div>
              <PermissionsManager />
            </div>
          )}

          {activeSection === "integrations" && (
            <div className="glass-panel p-4 md:p-6 flex flex-col gap-4">
              <div className="section-header !px-0 !pt-0 !border-none !bg-transparent">
                <span className="section-title flex items-center gap-2">
                  <Plug className="w-4 h-4 text-[#00d4ff]" /> Integraciones
                </span>
              </div>
              <IntegrationsPanel />
            </div>
          )}

          {/* PLAN */}
          {activeSection === "plan" && (
            <div className="glass-panel p-4 md:p-6">
              <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 md:mb-5">
                <span className="section-title flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#00d4ff]" /> Plan
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.12)] gap-4 sm:gap-0">
                <div>
                  <div className="text-[11px] text-slate-500">Plan actual</div>
                  <div className="text-lg font-bold text-slate-200 capitalize">{workspacePlan}</div>
                </div>
                {workspacePlan === "free" && isAdmin && (
                  <button className="btn-primary w-full sm:w-auto opacity-60 cursor-not-allowed" disabled title="Próximamente">Mejorar plan (pronto)</button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-3">Free · Pro · Agency. La gestión de planes y facturación llegará pronto.</p>
            </div>
          )}

          {/* ZONA PELIGROSA */}
          {activeSection === "danger" && userRole === "OWNER" && (
            <div className="glass-panel p-4 md:p-6 border-[rgba(255,45,85,0.15)]">
              <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4">
                <span className="section-title flex items-center gap-2 text-red-500">
                  <Shield className="w-4 h-4 text-red-500" /> Zona peligrosa
                </span>
              </div>
              <div className="p-3 bg-red-500/5 border border-red-500/15 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-[11px] text-red-500 font-display tracking-widest">ELIMINAR WORKSPACE</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">Borra todos los proyectos, miembros e invitaciones. Esta acción no se puede deshacer.</p>
                <button onClick={handleDeleteWorkspace} className="w-full sm:w-auto px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 cursor-pointer text-[11px] font-display tracking-widest rounded hover:bg-red-500/20 transition-colors">
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

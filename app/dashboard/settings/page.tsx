"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Settings, Users, Mail, Trash2, Copy, CheckCircle, Clock, AlertTriangle,
  Shield, User, Plug, CreditCard, Globe, ChevronRight, Lock, Layers, Eye, Pencil,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { IntegrationsView } from "@/components/integrations/IntegrationsView";
import { AreasManager } from "@/components/settings/AreasManager";
import { PermissionsManager } from "@/components/settings/PermissionsManager";
import { MemberPermissionsModal, type MemberPermissions } from "@/components/settings/MemberPermissionsModal";
import { ClientPortalsManager } from "@/components/settings/ClientPortalsManager";
import { PlanUsageMeter } from "@/components/settings/PlanUsageMeter";
import { BrandingManager } from "@/components/settings/BrandingManager";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

// ── Settings catalogue: groups (menus) → sections (submenus) ──
// Single source of truth — add a section here and render it in the switch below.
type SectionKey = "profile" | "preferences" | "workspace" | "clients" | "integrations" | "plan" | "danger";

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
      { key: "workspace", label: "Workspace", icon: Globe, desc: "Equipo, áreas y permisos" },
      { key: "clients", label: "Portal de Clientes", icon: Users, desc: "Accesos públicos" },
    ],
  },
  {
    group: "Admin",
    items: [
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
  background: "var(--cyan-dim)",
  border: "1px solid rgba(59,130,246,0.1)",
  color: "var(--foreground)",
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
  const [editingPermsFor, setEditingPermsFor] = useState<{ id: string; name: string; perms: MemberPermissions | null } | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [workspacePlan, setWorkspacePlan] = useState("free");
  const [userRole, setUserRole] = useState<string>("");
  const [activeSection, setActiveSection] = useState<SectionKey>("workspace");
  const [workspaceTab, setWorkspaceTab] = useState<"general" | "team" | "areas" | "permisos">("general");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [profileData, setProfileData] = useState<{ id: string; name: string; email: string; image: string; whatsappPhone?: string | null; providers: string[] } | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileWaPhone, setProfileWaPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
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
        if (data.data && data.data.length > 0) {
          const ws = data.data[0];
          setWorkspaceId(ws.id);
          setWorkspaceName(ws.name || "");
          setWorkspaceSlug(ws.slug || "");
          setWorkspacePlan(ws.plan || "free");
          fetchData(ws.id);
        } else {
          // Si no tiene workspaces (por ejemplo, fue eliminado o removido), forzamos a onboarding
          router.push("/onboarding");
        }
        setLoading(false);
      });
      
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          setProfileData(data.data);
          setProfileName(data.data.profile.name || "");
          setProfileWaPhone(data.data.profile.whatsappPhone || "");
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

  const roleBadgeColor: Record<string, string> = { OWNER: "var(--cyan)", ADMIN: "var(--amber)", MEMBER: "var(--text-muted)" };

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

  const handleSavePerms = async (userId: string, perms: MemberPermissions | null) => {
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/members/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, permissions: perms }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.user.id === userId ? { ...m, permissions: perms } : m))
        );
        setEditingPermsFor(null);
      } else {
        const d = await res.json();
        alert(d.error || "No se pudo actualizar los permisos");
      }
    } catch (err) {
      console.error(err);
      alert("Error al actualizar permisos");
    }
  };

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
    // Validate WhatsApp phone: digits only, 7-15 chars, or empty
    const waPhone = profileWaPhone.replace(/\D/g, "");
    if (profileWaPhone && (waPhone.length < 7 || waPhone.length > 15)) {
      alert("Número de WhatsApp inválido. Usa solo dígitos sin +, espacios ni guiones (ej. 5215512345678)");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          whatsappPhone: waPhone || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al actualizar perfil");
      } else {
        alert("Perfil actualizado correctamente.");
      }
    } catch (err) {
      alert("Error de red al actualizar perfil");
    }
    setSavingProfile(false);
  }

  async function handleChangePassword() {
    setPasswordMsg(null);
    if (!currentPassword) { setPasswordMsg({ ok: false, text: "Ingresa tu contraseña actual" }); return; }
    if (newPassword.length < 8) { setPasswordMsg({ ok: false, text: "La nueva contraseña debe tener al menos 8 caracteres" }); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg({ ok: false, text: "Las contraseñas no coinciden" }); return; }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMsg({ ok: false, text: data.error || "Error al cambiar contraseña" });
      } else {
        setPasswordMsg({ ok: true, text: "Contraseña actualizada correctamente" });
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      }
    } catch {
      setPasswordMsg({ ok: false, text: "Error de red. Intenta de nuevo." });
    }
    setChangingPassword(false);
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
          icon={<Settings className="w-6 h-6" style={{ color: "var(--cyan)" }} />} />
        
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start animate-pulse">
          <div className="w-full lg:w-56 shrink-0 flex flex-col gap-6">
            <div>
              <div className="h-2 w-16 bg-[var(--surface-hover)] rounded mb-4 ml-4"></div>
              <div className="h-10 w-full bg-[var(--surface-hover)]/50 rounded-lg mb-2"></div>
              <div className="h-10 w-full bg-[var(--surface-hover)]/50 rounded-lg mb-2"></div>
            </div>
            <div>
              <div className="h-2 w-20 bg-[var(--surface-hover)] rounded mb-4 ml-4"></div>
              <div className="h-10 w-full bg-[var(--surface-hover)]/50 rounded-lg mb-2"></div>
            </div>
          </div>
          <div className="flex-1 w-full glass-panel p-6">
            <div className="h-5 w-32 bg-[var(--surface-hover)] rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-10 w-full bg-[var(--surface-hover)]/40 rounded"></div>
              <div className="h-10 w-full bg-[var(--surface-hover)]/40 rounded"></div>
              <div className="h-10 w-full bg-[var(--surface-hover)]/40 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 88px)", overflow: "hidden" }}>
      <div style={{ flexShrink: 0, paddingBottom: 12 }}>
        <PageHeader
          title="Admin"
          description="Configuración de tu cuenta, equipo y workspace."
          icon={<Settings className="w-6 h-6" style={{ color: "var(--cyan)" }} />}
        />
      </div>

      <div style={{ display: "flex", flex: 1, gap: 16, overflow: "hidden", minHeight: 0 }}>
        {/* ── Left nav: groups (menus) + sections (submenus) ── */}
        <nav style={{ width: 216, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", overflowX: "hidden", padding: "2px 0 16px", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.05) transparent" }}>
          {visibleGroups.map((g, gi) => (
            <div key={g.group} style={{ display: "flex", flexDirection: "column" }}>
              <div>
                {gi > 0 && <div style={{ height: 1, background: "var(--surface-hover)", margin: "4px 10px 8px" }} />}
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase",
                  color: "var(--text-secondary)", padding: "4px 12px 8px",
                  borderLeft: "2px solid rgba(59,130,246,0.15)", marginLeft: 4,
                }}>
                  {g.group}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {g.items.map((it) => {
                  const active = activeSection === it.key;
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.key}
                      onClick={() => selectSection(it.key)}
                      className={`flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg border transition-all text-sm lg:text-[13px] whitespace-nowrap lg:whitespace-normal
                        ${active 
                          ? "bg-[rgba(59,130,246,0.08)] border-[rgba(59,130,246,0.18)] text-[var(--text-secondary)] font-semibold" 
                          : "bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"}`}
                      style={{ textAlign: "left" }}
                    >
                      <Icon className={`w-4 h-4 lg:w-[15px] lg:h-[15px] shrink-0 ${active ? "text-[var(--cyan)]" : "text-[var(--text-muted)]"}`} />
                      <div className="flex-1">
                        <span>{it.label}</span>
                        {(it as any).desc && <div className="hidden lg:block text-[10px] text-[var(--text-muted)] font-normal mt-0.5">{(it as any).desc}</div>}
                      </div>
                      {active && <ChevronRight className="hidden lg:block w-3 h-3 text-[var(--cyan)] opacity-60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Right content ── */}
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto", overflowX: "hidden", padding: "2px 4px 32px", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>
          <div className="flex flex-col gap-6">

          {/* PERFIL */}
          {activeSection === "profile" && (
            <div className="flex flex-col gap-6">
              <div className="glass-panel p-4 md:p-6">
                <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 md:mb-5">
                  <span className="section-title flex items-center gap-2">
                    <User className="w-4 h-4 text-[var(--cyan)]" /> Perfil
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-6">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="" className="w-14 h-14 rounded-full border border-[rgba(59,130,246,0.2)]" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[rgba(59,130,246,0.1)] flex items-center justify-center font-display text-lg text-[var(--cyan)]">
                      {(session?.user?.name || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-[15px] font-semibold text-[var(--text-secondary)]">{session?.user?.name || "Sin nombre"}</div>
                    <div className="text-xs text-[var(--text-muted)]">{session?.user?.email}</div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-1">Rol en este workspace: <strong style={{ color: roleBadgeColor[userRole] || "var(--foreground)" }}>{userRole || "—"}</strong></div>
                  </div>
                </div>

                <label className="text-[11px] text-[var(--text-muted)] block mb-1.5">Nombre de visualización</label>
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                  <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="flex-1 w-full" style={inp} placeholder="Tu nombre" />
                </div>

                {/* WhatsApp for notifications */}
                <label className="text-[11px] text-[var(--text-muted)] block mb-1.5 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp personal (para notificaciones de tareas)
                </label>
                <div className="flex flex-col sm:flex-row gap-3 mb-1">
                  <input
                    type="tel"
                    value={profileWaPhone}
                    onChange={(e) => setProfileWaPhone(e.target.value)}
                    className="flex-1 w-full"
                    style={inp}
                    placeholder="ej. 5215512345678 (sin +, espacios ni guiones)"
                  />
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] mb-5">Si configuras tu número, Sodare te enviará notificaciones por WhatsApp cuando te asignen tareas o cambien su estado.</p>

                <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary" style={{ opacity: savingProfile ? 0.6 : 1 }}>
                  {savingProfile ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>

              {/* CUENTAS VINCULADAS */}
              {profileData && (
                <div className="glass-panel p-4 md:p-6">
                  <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 md:mb-5">
                    <span className="section-title flex items-center gap-2">
                      <Plug className="w-4 h-4 text-[var(--cyan)]" /> Cuentas vinculadas para inicio de sesión
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-4">Vincular tus cuentas te permitirá iniciar sesión rápidamente con cualquiera de ellas.</p>
                  
                  <div className="flex flex-col gap-3">
                    {/* Email */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--hairline)]">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-[var(--text-secondary)]" />
                        <div>
                          <p className="text-[13px] text-[var(--text-secondary)] font-medium">Correo Electrónico</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{session?.user?.email}</p>
                        </div>
                      </div>
                      {profileData.providers.includes("email") ? (
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Conectado</span>
                      ) : (
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] bg-slate-400/10 px-2 py-1 rounded">Sin contraseña</span>
                      )}
                    </div>

                    {/* Google */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--hairline)]">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        <div>
                          <p className="text-[13px] text-[var(--text-secondary)] font-medium">Google</p>
                          <p className="text-[11px] text-[var(--text-muted)]">Inicia sesión con Google</p>
                        </div>
                      </div>
                      {profileData.providers.includes("google") ? (
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Conectado</span>
                      ) : (
                        <button onClick={() => signIn("google")} className="btn-primary text-xs !py-1.5 !px-3">Vincular</button>
                      )}
                    </div>

                    {/* Facebook */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--hairline)]">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        <div>
                          <p className="text-[13px] text-[var(--text-secondary)] font-medium">Facebook</p>
                          <p className="text-[11px] text-[var(--text-muted)]">Inicia sesión con Facebook</p>
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

              {/* CAMBIO DE CONTRASEÑA */}
              {profileData && profileData.providers.includes("email") && (
                <div className="glass-panel p-4 md:p-6">
                  <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 md:mb-5">
                    <span className="section-title flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[var(--cyan)]" /> Cambiar contraseña
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 max-w-md">
                    <div>
                      <label className="text-[11px] text-[var(--text-muted)] block mb-1.5">Contraseña actual</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        style={inp}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text-muted)] block mb-1.5">Nueva contraseña</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={inp}
                        placeholder="Mínimo 8 caracteres"
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[var(--text-muted)] block mb-1.5">Confirmar nueva contraseña</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={inp}
                        placeholder="Repite la nueva contraseña"
                        autoComplete="new-password"
                      />
                    </div>
                    {passwordMsg && (
                      <p className={`text-xs px-3 py-2 rounded ${passwordMsg.ok ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>
                        {passwordMsg.text}
                      </p>
                    )}
                    <button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      className="btn-primary w-full sm:w-auto self-start"
                      style={{ opacity: changingPassword ? 0.6 : 1 }}
                    >
                      {changingPassword ? "Actualizando..." : "Cambiar contraseña"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PORTAL DE CLIENTES */}
          {activeSection === "clients" && (
            <ClientPortalsManager workspaceId={workspaceId} />
          )}

          {/* PREFERENCIAS */}
          {activeSection === "preferences" && (
            <div className="glass-panel p-4 md:p-6">
              <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-2">
                <span className="section-title flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[var(--cyan)]" /> Preferencias
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-4">Estas preferencias se guardan en este navegador.</p>
              
              <div className="mb-6 pb-6 border-b border-[var(--hairline)]">
                <label className="text-[11px] text-[var(--text-secondary)] font-bold uppercase tracking-widest block mb-3">Tema de la Interfaz</label>
                <ThemeSwitcher />
              </div>

              <PrefToggle label="Notificaciones por email" desc="Recibir avisos de actividad y menciones por correo." checked={prefs.emailNotifications} onChange={(v) => setPref("emailNotifications", v)} />
              <PrefToggle label="Alertas de SLA" desc="Avisos cuando una tarea se acerca a su fecha límite." checked={prefs.slaAlerts} onChange={(v) => setPref("slaAlerts", v)} />
              <PrefToggle label="Reducir movimiento" desc="Minimiza animaciones del fondo y transiciones." checked={prefs.reduceMotion} onChange={(v) => setPref("reduceMotion", v)} />
              <PrefToggle label="Tablas compactas" desc="Filas más densas en las tablas de datos." checked={prefs.compactTables} onChange={(v) => setPref("compactTables", v)} last />
            </div>
          )}

          {/* WORKSPACE - unified module with 4 internal tabs */}
          {activeSection === "workspace" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* ── Tab bar ── */}
              <div style={{ display: "flex", gap: 0, borderRadius: 10, background: "var(--row-hover)", border: "1px solid var(--border)", padding: 4 }}>
                {([
                  { id: "general" as const, label: "General", icon: Globe },
                  { id: "team" as const, label: "Equipo y roles", icon: Users },
                  { id: "areas" as const, label: "Áreas y flujos", icon: Layers },
                  { id: "permisos" as const, label: "Permisos", icon: Shield },
                ] as const).map((tab) => {
                  const active = workspaceTab === tab.id;
                  const TabIcon = tab.icon;
                  return (
                    <button key={tab.id} onClick={() => setWorkspaceTab(tab.id)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "7px 10px", borderRadius: 7, border: "none", cursor: "pointer",
                        background: active ? "rgba(59,130,246,0.1)" : "transparent",
                        color: active ? "var(--cyan)" : "var(--text-secondary)",
                        fontSize: 12, fontWeight: active ? 700 : 400, fontFamily: "inherit",
                        transition: "all 0.15s",
                        boxShadow: active ? "inset 0 0 0 1px rgba(59,130,246,0.2)" : "none",
                      }}
                    >
                      <TabIcon style={{ width: 13, height: 13 }} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ── Tab content ── */}

              {/* General */}
              {workspaceTab === "general" && (
                <>
                <div className="glass-panel p-4 md:p-6">
                  <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 md:mb-5">
                    <span className="section-title flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[var(--cyan)]" /> General
                    </span>
                  </div>
                  <label className="text-[11px] text-[var(--text-muted)] block mb-1.5">Nombre del workspace</label>
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <input type="text" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} disabled={!isAdmin} className="flex-1 w-full" style={{ ...inp, opacity: isAdmin ? 1 : 0.6 }} />
                    {isAdmin && <button onClick={handleRenameWorkspace} className="btn-primary w-full sm:w-auto">Guardar</button>}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div>
                      <div className="text-[11px] text-[var(--text-muted)]">Slug</div>
                      <div className="text-[13px] text-[var(--text-secondary)] font-mono mt-1 bg-[var(--surface-hover)] px-3 py-1.5 rounded">{workspaceSlug || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[var(--text-muted)]">Plan</div>
                      <div className="text-[13px] text-[var(--text-secondary)] capitalize mt-1 bg-[var(--surface-hover)] px-3 py-1.5 rounded">{workspacePlan}</div>
                    </div>
                  </div>
                </div>
                {isAdmin && <BrandingManager />}
                </>
              )}

              {/* Equipo y roles */}
              {workspaceTab === "team" && isAdmin && (
                <>
                  <div className="glass-panel p-4 md:p-6">
                    <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 md:mb-5">
                      <span className="section-title flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[var(--cyan)]" /> Invitar al equipo
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
                        <p className="text-[11px] text-[var(--text-muted)] mb-1.5 font-display tracking-widest">ENLACE DE INVITACIÓN GENERADO</p>
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
                          <div key={inv.id} className="data-row !flex-col sm:!flex-row !items-start sm:!items-center gap-3 sm:gap-0 !px-3 !py-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--hairline)]">
                            <div>
                              <p className="text-[13px] text-[var(--text-secondary)] truncate max-w-[200px] sm:max-w-none">{inv.email}</p>
                              <p className="text-[11px] text-[var(--text-muted)]">Rol: {inv.role} · Expira: {new Date(inv.expires).toLocaleDateString("es-MX")}</p>
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
                        <Users className="w-4 h-4 text-[var(--cyan)]" /> Equipo actual
                      </span>
                      <span className="badge badge-cyan">{members.length}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {members.map((m: any) => (
                        <div key={m.id} className="data-row !flex-col sm:!flex-row !items-start sm:!items-center gap-3 sm:gap-0 !px-3 !py-3 rounded-lg bg-[var(--surface-hover)] border border-[var(--hairline)]">
                          <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                            {m.user.image ? (
                              <img src={m.user.image} alt="" className="w-8 h-8 rounded-full border border-[var(--border)]" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-[rgba(59,130,246,0.1)] flex items-center justify-center text-[var(--cyan)] text-xs font-semibold">
                                {(m.user.name || "?")[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[13px] text-[var(--text-secondary)] truncate">{m.user.name || "Sin nombre"}</p>
                              <p className="text-[11px] text-[var(--text-muted)] truncate">{m.user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                            <span style={{ color: roleBadgeColor[m.role] || "var(--text-muted)", fontSize: 11, fontWeight: 600 }}>
                              {m.role}
                            </span>
                            {userRole === "OWNER" && m.role !== "OWNER" && (
                              <select value={m.role} onChange={(e) => handleRoleChange(m.user.id, e.target.value)}
                                style={{ ...inp, width: "auto", padding: "4px 8px", fontSize: 11 }}>
                                <option value="MEMBER">Miembro</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                            )}
                            {isAdmin && m.role !== "OWNER" && (
                              <button onClick={() => setEditingPermsFor({ id: m.user.id, name: m.user.name || "", perms: m.permissions ?? null })}
                                title="Permisos granulares" className="p-1.5 rounded hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAdmin && m.userId !== session?.user?.id && (
                              <button onClick={() => handleRemoveMember(m.userId)} className="p-1.5 rounded hover:bg-red-500/10 text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {workspaceTab === "team" && !isAdmin && (
                <div className="glass-panel p-6 text-center text-[var(--text-muted)] text-sm">Solo admins y owners pueden ver el equipo.</div>
              )}

              {/* Áreas y flujos */}
              {workspaceTab === "areas" && (
                <div className="flex flex-col gap-6">
                  <AreasManager members={members.map(m => ({ id: m.userId, name: m.user?.name || "?" }))} canEdit={isAdmin} />
                </div>
              )}

              {/* Permisos */}
              {workspaceTab === "permisos" && (
                <div className="glass-panel p-4 md:p-6 flex flex-col gap-4">
                  <div className="section-header !px-0 !pt-0 !border-none !bg-transparent">
                    <span className="section-title flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[var(--cyan)]" /> Permisos por área
                    </span>
                  </div>
                  <PermissionsManager />
                </div>
              )}
            </div>
          )}

          {activeSection === "integrations" && (
            <div className="glass-panel p-4 md:p-6 flex flex-col gap-4">
              <div className="section-header !px-0 !pt-0 !border-none !bg-transparent">
                <span className="section-title flex items-center gap-2">
                  <Plug className="w-4 h-4 text-[var(--cyan)]" /> Integraciones
                </span>
              </div>
              <IntegrationsView />
            </div>
          )}

          {/* PLAN */}
          {activeSection === "plan" && (
            <div className="glass-panel p-4 md:p-6">
              <div className="section-header !px-0 !pt-0 !border-none !bg-transparent mb-4 md:mb-5">
                <span className="section-title flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[var(--cyan)]" /> Plan y Uso
                </span>
              </div>

              <PlanUsageMeter
                onUpgrade={() => {
                  window.open("mailto:soporte@sodare.com?subject=Quiero%20mejorar%20mi%20plan", "_blank");
                }}
              />

              <p className="text-[11px] text-[var(--text-muted)] mt-4">
                Para cambiar de plan o gestionar la facturación, contacta a
                {" "}<a href="mailto:soporte@sodare.com" className="text-[var(--cyan)] hover:underline">soporte@sodare.com</a>.
              </p>
            </div>
          )}

          {/* ZONA PELIGROSA */}
          {activeSection === "danger" && userRole === "OWNER" && (
            <div className="glass-panel p-4 md:p-6 border-[rgba(229,72,77,0.15)]">
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
                <p className="text-xs text-[var(--text-muted)] mb-4">Borra todos los proyectos, miembros e invitaciones. Esta acción no se puede deshacer.</p>
                <button onClick={handleDeleteWorkspace} className="w-full sm:w-auto px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 cursor-pointer text-[11px] font-display tracking-widest rounded hover:bg-red-500/20 transition-colors">
                  ELIMINAR WORKSPACE
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
        </div>

      {editingPermsFor && (
        <MemberPermissionsModal
          memberId={editingPermsFor.id}
          memberName={editingPermsFor.name}
          initialPerms={editingPermsFor.perms}
          onClose={() => setEditingPermsFor(null)}
          onSave={handleSavePerms}
        />
      )}
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
        <div style={{ fontSize: 13, color: "var(--foreground)", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{desc}</div>
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
          width: 18, height: 18, borderRadius: "50%", background: "var(--surface)",
          transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}

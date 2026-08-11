"use client";

import { useState } from "react";
import { Mail, Clock, Users, Trash2, Copy, CheckCircle, SlidersHorizontal, ChevronDown, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiSend } from "@/lib/api-client";
import {
  useWorkspace,
  useWorkspaceMembers,
  useWorkspaceInvites,
  useWorkspaceSettings,
  settingsKeys,
  type WorkspaceMemberRow,
} from "@/hooks/use-settings-data";
import { MemberPermissionsModal, type MemberPermissions } from "@/components/settings/MemberPermissionsModal";
import { showToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/ConfirmModal";
import {
  SettingsStack,
  SettingsCard,
  SettingsRestricted,
  SettingsEmpty,
  SettingsSkeleton,
  settingsItemVariants,
  inputClass,
} from "@/components/settings/ui";

const ROLE_META: Record<string, { label: string; color: string }> = {
  OWNER: { label: "Propietario", color: "#ef4444" },
  ADMIN: { label: "Admin", color: "#3b82f6" },
  MEMBER: { label: "Miembro", color: "#10b981" },
};

interface InviteResult {
  inviteUrl: string | null;
  emailSent: boolean;
  email: string;
}

export function TeamSettings() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { workspaceId, isAdmin, isOwner, isLoading: loadingWorkspace } = useWorkspace();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteAreaId, setInviteAreaId] = useState("");
  const [inviteAreaRole, setInviteAreaRole] = useState("members");
  const [lastInvite, setLastInvite] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingPermsFor, setEditingPermsFor] = useState<{
    id: string;
    name: string;
    perms: MemberPermissions | null;
  } | null>(null);

  const { data: members = [], isLoading: loadingMembers } = useWorkspaceMembers(workspaceId, isAdmin);
  const { data: invites = [] } = useWorkspaceInvites(workspaceId, isAdmin);
  const { data: settings } = useWorkspaceSettings();
  const areas = Array.isArray(settings?.areas) ? settings.areas : [];

  const refreshMembers = () =>
    queryClient.invalidateQueries({ queryKey: settingsKeys.members(workspaceId) });
  const refreshInvites = () =>
    queryClient.invalidateQueries({ queryKey: settingsKeys.invites(workspaceId) });

  const inviteMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        email: inviteEmail.trim(),
        role: inviteRole,
      };
      if (inviteRole === "MEMBER" && inviteAreaId) {
        payload.areaId = inviteAreaId;
        payload.areaRole = inviteAreaRole;
      }
      return apiSend<InviteResult>(`/api/workspace/${workspaceId}/invite`, "POST", payload);
    },
    onSuccess: (data) => {
      setInviteEmail("");
      setInviteAreaId("");
      setInviteAreaRole("members");
      setLastInvite(data);
      setCopied(false);
      refreshInvites();
      showToast(
        "success",
        data.emailSent
          ? `Invitación enviada a ${data.email}.`
          : "Invitación creada. Comparte el enlace manualmente.",
      );
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      apiSend(`/api/workspace/${workspaceId}/invite/${inviteId}`, "DELETE"),
    onSuccess: () => {
      refreshInvites();
      showToast("success", "Invitación cancelada.");
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      apiSend(`/api/workspace/${workspaceId}/members`, "DELETE", { userId }),
    onSuccess: () => {
      refreshMembers();
      showToast("success", "Miembro removido del workspace.");
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: string }) =>
      apiSend(`/api/workspace/${workspaceId}/members/role`, "PATCH", { userId, role: newRole }),
    onSuccess: () => {
      refreshMembers();
      showToast("success", "Rol actualizado.");
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  const changePermsMutation = useMutation({
    mutationFn: ({ userId, permissions }: { userId: string; permissions: MemberPermissions | null }) =>
      apiSend(`/api/workspace/${workspaceId}/members/permissions`, "PATCH", { userId, permissions }),
    onSuccess: () => {
      setEditingPermsFor(null);
      refreshMembers();
      showToast("success", "Permisos actualizados.");
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  function handleInvite() {
    const email = inviteEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("error", "Escribe un correo válido.");
      return;
    }
    inviteMutation.mutate();
  }

  async function handleCopyUrl() {
    if (!lastInvite?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(lastInvite.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("error", "No se pudo copiar el enlace.");
    }
  }

  async function handleRemoveMember(member: WorkspaceMemberRow) {
    const ok = await showConfirm({
      title: "Remover del workspace",
      message: `${member.user.name || member.user.email} perderá el acceso a todos los proyectos, tareas y clientes de este workspace. Sus tareas asignadas quedarán sin responsable.`,
      confirmLabel: "Remover",
      danger: true,
    });
    if (ok) removeMemberMutation.mutate(member.userId);
  }

  async function handleCancelInvite(inviteId: string, email: string) {
    const ok = await showConfirm({
      title: "Cancelar invitación",
      message: `El enlace enviado a ${email} dejará de funcionar.`,
      confirmLabel: "Cancelar invitación",
      danger: true,
    });
    if (ok) cancelInviteMutation.mutate(inviteId);
  }

  if (loadingWorkspace) return <SettingsSkeleton cards={2} />;

  if (!isAdmin) {
    return (
      <SettingsRestricted message="Sólo los administradores del workspace pueden ver y gestionar el equipo." />
    );
  }

  return (
    <SettingsStack>
      {/* ── Invitar ── */}
      <SettingsCard
        title="Invitar al equipo"
        description="Los invitados reciben un correo con un enlace válido durante 7 días. Ocupan un asiento de tu plan al aceptar."
        icon={<Mail className="w-5 h-5 text-[var(--fc-accent)]" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-5 max-w-3xl">
          {/* Email */}
          <div className="md:col-span-7">
            <label className="block text-[11px] font-semibold text-[var(--fc-text-muted)] uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-[var(--fc-text-muted)]" />
              </div>
              <input
                type="email"
                placeholder="ejemplo@empresa.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                aria-label="Correo de la persona a invitar"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
          
          {/* Rol */}
          <div className="md:col-span-5">
            <label className="block text-[11px] font-semibold text-[var(--fc-text-muted)] uppercase tracking-wider mb-2">
              Rol Principal
            </label>
            <div className="relative">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                aria-label="Rol de la invitación"
                className={`${inputClass} appearance-none pr-8 cursor-pointer`}
              >
                <option value="MEMBER">Miembro</option>
                <option value="ADMIN">Admin</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fc-text-muted)] pointer-events-none" />
            </div>
          </div>

          {/* Area Asignada (Solo si es Miembro) */}
          {inviteRole === "MEMBER" && (
            <>
              <div className="md:col-span-7">
                <label className="block text-[11px] font-semibold text-[var(--fc-text-muted)] uppercase tracking-wider mb-2">
                  Área Asignada (Opcional)
                </label>
                <div className="relative">
                  <select
                    value={inviteAreaId}
                    onChange={(e) => setInviteAreaId(e.target.value)}
                    className={`${inputClass} appearance-none pr-8 cursor-pointer`}
                  >
                    <option value="">Selecciona un área</option>
                    {areas.map((area: any) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fc-text-muted)] pointer-events-none" />
                </div>
              </div>
              <div className="md:col-span-5">
                <label className="block text-[11px] font-semibold text-[var(--fc-text-muted)] uppercase tracking-wider mb-2">
                  Permiso en Área
                </label>
                <div className="relative">
                  <select
                    value={inviteAreaRole}
                    onChange={(e) => setInviteAreaRole(e.target.value)}
                    disabled={!inviteAreaId}
                    className={`${inputClass} appearance-none pr-8 cursor-pointer disabled:opacity-50`}
                  >
                    <option value="members">Miembro</option>
                    <option value="leaders">Líder</option>
                    <option value="external">Externo</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fc-text-muted)] pointer-events-none" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-3xl pt-2 border-t border-[var(--hairline)]">
          <p className="text-[11px] text-[var(--fc-text-muted)] leading-relaxed max-w-md">
            <strong className="text-[var(--fc-text-secondary)]">Miembro</strong> trabaja en los módulos que su
            área habilite. <strong className="text-[var(--fc-text-secondary)]">Admin</strong> además gestiona
            equipo, integraciones y plan.
          </p>
          <button
            onClick={handleInvite}
            disabled={inviteMutation.isPending}
            className="btn-primary flex items-center justify-center gap-2 px-5 py-2 whitespace-nowrap shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] transition-shadow"
            style={{ opacity: inviteMutation.isPending ? 0.6 : 1 }}
          >
            {inviteMutation.isPending ? (
              "Enviando..."
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar Invitación
              </>
            )}
          </button>
        </div>

        {lastInvite?.emailSent && (
          <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl max-w-2xl">
            <p className="text-[13px] text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" /> Invitación enviada a {lastInvite.email}. Expira en 7 días.
            </p>
          </div>
        )}

        {lastInvite && !lastInvite.emailSent && lastInvite.inviteUrl && (
          <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl max-w-2xl">
            <p className="text-[11px] text-[var(--fc-warning)] mb-2 font-semibold tracking-widest uppercase">
              No pudimos enviar el correo — comparte este enlace
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <code className="w-full sm:flex-1 text-xs text-[var(--fc-text-secondary)] break-all bg-black/20 p-2.5 rounded-lg border border-[var(--hairline)]">
                {lastInvite.inviteUrl}
              </code>
              <button
                onClick={handleCopyUrl}
                className="btn-secondary flex items-center gap-2 justify-center whitespace-nowrap"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        )}
      </SettingsCard>

      {/* ── Invitaciones pendientes ── */}
      {invites.length > 0 && (
        <SettingsCard
          title="Invitaciones pendientes"
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          aside={<span className="badge badge-amber">{invites.length}</span>}
        >
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {invites.map((invite) => (
                <motion.div
                  key={invite.id}
                  variants={settingsItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--surface-hover)] border border-white/5"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--fc-text)] font-medium truncate">{invite.email}</p>
                    <p className="text-xs text-[var(--fc-text-muted)] mt-1">
                      {ROLE_META[invite.role]?.label ?? invite.role} · Expira el{" "}
                      {new Date(invite.expires).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelInvite(invite.id, invite.email)}
                    className="bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs px-3 py-1.5 hover:bg-red-500/20 transition-colors shrink-0 self-start sm:self-auto"
                  >
                    Cancelar
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </SettingsCard>
      )}

      {/* ── Miembros ── */}
      <SettingsCard
        title="Miembros"
        description="El botón de permisos ajusta el acceso a módulos de una persona por encima de lo que define su área."
        icon={<Users className="w-5 h-5 text-[var(--fc-accent)]" />}
        aside={<span className="badge badge-cyan">{members.length}</span>}
      >
        {loadingMembers ? (
          <SettingsSkeleton cards={1} />
        ) : members.length === 0 ? (
          <SettingsEmpty
            icon={<Users className="w-8 h-8" />}
            title="Aún no hay miembros."
            description="Invita a alguien con el formulario de arriba."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {members.map((member) => {
                const meta = ROLE_META[member.role] ?? ROLE_META.MEMBER;
                const isSelf = member.userId === (session?.user as { id?: string })?.id;
                const hasCustomPerms = !!member.permissions;

                return (
                  <motion.div
                    key={member.id}
                    variants={settingsItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--surface-hover)] border border-white/5"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {member.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- avatar externo (OAuth/Blob)
                        <img
                          src={member.user.image}
                          alt=""
                          className="w-10 h-10 rounded-full border border-blue-500/20 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[var(--fc-surface)] border border-blue-500/20 flex items-center justify-center text-[var(--fc-accent)] text-sm font-semibold shrink-0">
                          {(member.user.name || member.user.email || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--fc-text)] truncate">
                          {member.user.name || "Sin nombre"}
                          {isSelf && (
                            <span className="text-[10px] text-[var(--fc-text-muted)] font-normal ml-1.5">(tú)</span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--fc-text-muted)] truncate mt-0.5">{member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {isOwner && member.role !== "OWNER" ? (
                        <select
                          value={member.role}
                          aria-label={`Rol de ${member.user.name || member.user.email}`}
                          onChange={(e) =>
                            changeRoleMutation.mutate({ userId: member.userId, newRole: e.target.value })
                          }
                          className={`${inputClass} !w-auto !py-1.5 !px-2 !text-[11px] cursor-pointer`}
                        >
                          <option value="MEMBER">Miembro</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      ) : (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-white/5"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      )}

                      {member.role !== "OWNER" && (
                        <button
                          onClick={() =>
                            setEditingPermsFor({
                              id: member.userId,
                              name: member.user.name || member.user.email || "",
                              perms: (member.permissions as MemberPermissions | null) ?? null,
                            })
                          }
                          title="Permisos por módulo"
                          aria-label={`Permisos de ${member.user.name || member.user.email}`}
                          className={`relative p-2 rounded-lg border transition-colors ${
                            hasCustomPerms
                              ? "bg-[var(--fc-accent)]/10 border-[var(--fc-accent)]/30 text-[var(--fc-accent)]"
                              : "bg-[var(--fc-surface)] border-[var(--hairline)] text-[var(--fc-text-secondary)] hover:bg-[var(--surface-hover)]"
                          }`}
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                      )}

                      {!isSelf && member.role !== "OWNER" && (
                        <button
                          onClick={() => handleRemoveMember(member)}
                          title="Remover del workspace"
                          aria-label={`Remover a ${member.user.name || member.user.email}`}
                          className="p-2 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </SettingsCard>

      <AnimatePresence>
        {editingPermsFor && (
          <MemberPermissionsModal
            memberId={editingPermsFor.id}
            memberName={editingPermsFor.name}
            initialPerms={editingPermsFor.perms}
            onClose={() => setEditingPermsFor(null)}
            onSave={async (memberId, perms) => {
              await changePermsMutation.mutateAsync({ userId: memberId, permissions: perms });
            }}
          />
        )}
      </AnimatePresence>
    </SettingsStack>
  );
}

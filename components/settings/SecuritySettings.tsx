"use client";

import { useState } from "react";
import { Shield, Lock, AlertTriangle, LogOut, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { apiSend } from "@/lib/api-client";
import { useProfile, useWorkspace } from "@/hooks/use-settings-data";
import { showToast } from "@/components/ui/Toast";
import { showConfirm, showPrompt } from "@/components/ui/ConfirmModal";
import {
  SettingsStack,
  SettingsCard,
  SettingsSkeleton,
  SettingsRow,
  Field,
} from "@/components/settings/ui";

/** Medidor simple: longitud + variedad de caracteres. */
function passwordScore(value: string) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return Math.min(score, 4);
}

const STRENGTH = [
  { label: "Muy débil", color: "var(--fc-danger)" },
  { label: "Débil", color: "var(--fc-danger)" },
  { label: "Aceptable", color: "var(--fc-warning)" },
  { label: "Fuerte", color: "var(--fc-success)" },
  { label: "Excelente", color: "var(--fc-success)" },
];

export function SecuritySettings() {
  const router = useRouter();
  const { workspace, workspaceId, isOwner, isLoading: loadingWorkspace } = useWorkspace();
  const { data: profileData, isLoading: loadingProfile } = useProfile();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const hasPassword = profileData?.providers?.includes("email") ?? false;
  const email = profileData?.profile?.email ?? "";
  const score = passwordScore(newPassword);

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      apiSend("/api/auth/change-password", "POST", { currentPassword, newPassword }),
    onSuccess: () => {
      setPasswordMsg({ ok: true, text: "Contraseña actualizada correctamente." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("success", "Contraseña actualizada.");
    },
    onError: (error: Error) => {
      setPasswordMsg({ ok: false, text: error.message });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => apiSend(`/api/workspace/${workspaceId}/leave`, "POST"),
    onSuccess: () => {
      showToast("success", "Saliste del workspace.");
      router.push("/onboarding");
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => apiSend(`/api/workspace/${workspaceId}`, "DELETE"),
    onSuccess: () => {
      showToast("success", "Workspace eliminado.");
      router.push("/onboarding");
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (confirmEmail: string) =>
      apiSend("/api/user/account", "DELETE", { confirmEmail }),
    onSuccess: async () => {
      showToast("success", "Cuenta eliminada.");
      await signOut({ callbackUrl: "/" });
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  function handleChangePassword() {
    setPasswordMsg(null);
    if (!currentPassword) {
      setPasswordMsg({ ok: false, text: "Ingresa tu contraseña actual." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ ok: false, text: "La nueva contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordMsg({ ok: false, text: "La nueva contraseña debe ser distinta de la actual." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: "Las contraseñas no coinciden." });
      return;
    }
    changePasswordMutation.mutate();
  }

  async function handleLeaveWorkspace() {
    const ok = await showConfirm({
      title: `Salir de ${workspace?.name ?? "el workspace"}`,
      message:
        "Perderás el acceso a sus proyectos, tareas y clientes. Un administrador tendrá que volver a invitarte.",
      confirmLabel: "Salir del workspace",
      danger: true,
    });
    if (ok) leaveMutation.mutate();
  }

  async function handleDeleteWorkspace() {
    const typed = await showPrompt({
      title: `Eliminar ${workspace?.name ?? "workspace"}`,
      message:
        "Se borrarán permanentemente proyectos, tareas, clientes, integraciones y reportes. Escribe ELIMINAR para confirmar.",
      placeholder: "ELIMINAR",
    });
    if (typed === null) return;
    if (typed.trim().toUpperCase() !== "ELIMINAR") {
      showToast("error", "Confirmación incorrecta. No se eliminó nada.");
      return;
    }
    deleteWorkspaceMutation.mutate();
  }

  async function handleDeleteAccount() {
    const typed = await showPrompt({
      title: "Eliminar mi cuenta",
      message: `Esta acción es permanente. Escribe tu correo (${email}) para confirmar.`,
      placeholder: email,
    });
    if (typed === null) return;
    deleteAccountMutation.mutate(typed.trim());
  }

  if (loadingWorkspace || loadingProfile) return <SettingsSkeleton cards={2} />;

  return (
    <SettingsStack>
      {/* ── Contraseña ── */}
      <SettingsCard
        title="Contraseña"
        description={
          hasPassword
            ? "Usa una contraseña larga y única. Al cambiarla, tus otras sesiones seguirán activas."
            : "Tu cuenta inicia sesión con un proveedor externo, así que no tiene contraseña que cambiar."
        }
        icon={<Lock className="w-5 h-5 text-[var(--fc-accent)]" />}
      >
        {hasPassword ? (
          <div className="flex flex-col gap-4 w-full">
            <Field
              label="Contraseña actual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            <div>
              <Field
                label="Nueva contraseña"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{
                          background: i < score ? STRENGTH[score].color : "var(--surface-hover)",
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: STRENGTH[score].color }}>
                    Seguridad: {STRENGTH[score].label}
                  </p>
                </div>
              )}
            </div>

            <Field
              label="Confirmar nueva contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              error={
                confirmPassword && confirmPassword !== newPassword
                  ? "Las contraseñas no coinciden."
                  : null
              }
            />

            {passwordMsg && (
              <div
                className={`p-3 rounded-lg text-[13px] ${
                  passwordMsg.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}
                role="status"
              >
                {passwordMsg.text}
              </div>
            )}

            <div className="pt-1">
              <button
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
                className="btn-primary"
                style={{ opacity: changePasswordMutation.isPending ? 0.6 : 1 }}
              >
                {changePasswordMutation.isPending ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--fc-surface-raised)] border border-[var(--fc-border-subtle)] w-full">
            <KeyRound className="w-4 h-4 text-[var(--fc-text-muted)] mt-0.5 shrink-0" />
            <p className="text-[13px] text-[var(--fc-text-secondary)] leading-relaxed">
              Entras con Google o Facebook. Administra la seguridad de tu cuenta (contraseña,
              verificación en dos pasos) desde ese proveedor.
            </p>
          </div>
        )}
      </SettingsCard>

      {/* ── Sesión y pertenencia ── */}
      <SettingsCard
        title="Sesión y pertenencia"
        description="Cierra la sesión en este dispositivo o abandona el workspace actual."
        icon={<Shield className="w-5 h-5 text-[var(--fc-accent)]" />}
      >
        <div className="w-full">
          <SettingsRow
            label="Cerrar sesión"
            description="Termina la sesión en este navegador."
          >
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="btn-secondary flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
            </button>
          </SettingsRow>

          <SettingsRow
            label={`Salir de ${workspace?.name ?? "este workspace"}`}
            description={
              isOwner
                ? "Como propietario, primero debes ascender a otro miembro a propietario."
                : "Perderás el acceso a sus proyectos y tareas. Podrán volver a invitarte."
            }
            last
          >
            <button
              onClick={handleLeaveWorkspace}
              disabled={leaveMutation.isPending || !workspaceId}
              className="btn-secondary"
              style={{ borderColor: "rgba(226,68,92,0.25)", color: "var(--fc-danger)" }}
            >
              {leaveMutation.isPending ? "Saliendo..." : "Salir del workspace"}
            </button>
          </SettingsRow>
        </div>
      </SettingsCard>

      {/* ── Zona peligrosa ── */}
      <SettingsCard
        title="Zona peligrosa"
        description="Acciones permanentes. No hay papelera ni deshacer."
        icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        tone="danger"
      >
        <div className="space-y-3 w-full">
          {isOwner && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--fc-surface)] border border-[var(--fc-danger-wash)] rounded-xl transition-colors hover:border-[var(--fc-danger)]">
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[var(--fc-danger)] shrink-0" />
                  <span className="text-[14px] font-medium text-[var(--fc-text)] leading-tight">
                    Eliminar workspace
                  </span>
                </div>
                <p className="text-[12px] text-[var(--fc-text-muted)] leading-tight">
                  Borra <strong>{workspace?.name}</strong> con todos sus proyectos, tareas, clientes, integraciones y reportes.
                </p>
              </div>
              <button
                onClick={handleDeleteWorkspace}
                disabled={deleteWorkspaceMutation.isPending}
                className="text-[11px] font-bold text-red-500 bg-[color-mix(in_srgb,red_12%,transparent)] px-4 py-2 rounded-[8px] shrink-0 transition-opacity hover:opacity-80 uppercase tracking-wide disabled:opacity-50"
              >
                {deleteWorkspaceMutation.isPending ? "Eliminando..." : "Eliminar workspace"}
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--fc-surface)] border border-[var(--fc-danger-wash)] rounded-xl transition-colors hover:border-[var(--fc-danger)]">
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-[14px] font-medium text-[var(--fc-text)] leading-tight">
                  Eliminar mi cuenta
                </span>
              </div>
              <p className="text-[12px] text-[var(--fc-text-muted)] leading-tight">
                Borra tu usuario, preferencias y accesos de forma permanente.
              </p>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteAccountMutation.isPending}
              className="text-[11px] font-bold text-red-500 bg-[color-mix(in_srgb,red_12%,transparent)] px-4 py-2 rounded-[8px] shrink-0 transition-opacity hover:opacity-80 uppercase tracking-wide disabled:opacity-50"
            >
              {deleteAccountMutation.isPending ? "Eliminando..." : "Eliminar mi cuenta"}
            </button>
          </div>
        </div>
      </SettingsCard>
    </SettingsStack>
  );
}

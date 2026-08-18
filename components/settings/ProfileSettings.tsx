"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { User, Mail, Plug, Camera, Trash2, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiSend } from "@/lib/api-client";
import { useProfile, useWorkspace, settingsKeys } from "@/hooks/use-settings-data";
import { showToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/ConfirmModal";
import { openSocialLogin, fetchAuthProviders, type AuthProviders, type SocialProvider } from "@/lib/social-login";
import {
  SettingsStack,
  SettingsCard,
  SettingsSkeleton,
  Field,
} from "@/components/settings/ui";

const ROLE_LABELS: Record<string, { label: string; color: string; hint: string }> = {
  OWNER: { label: "Propietario", color: "#ef4444", hint: "Control total, incluida la facturación y el borrado del workspace." },
  ADMIN: { label: "Administrador", color: "#3b82f6", hint: "Gestiona equipo, áreas, integraciones y plan." },
  MEMBER: { label: "Miembro", color: "#10b981", hint: "Trabaja en los módulos que su área tenga habilitados." },
};

export function ProfileSettings() {
  const { data: session, update: updateSession } = useSession();
  const queryClient = useQueryClient();
  const { workspace, role } = useWorkspace();
  const { data: profileData, isLoading } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = profileData?.profile;
  const providers = profileData?.providers ?? [];

  // Mismo flujo que la pantalla de login: popup, no redirección de página
  // completa. Vincular desde Ajustes no debe sacar al usuario de la pantalla
  // ni perder lo que tuviera a medio editar.
  const [available, setAvailable] = useState<AuthProviders | null>(null);
  const [linking, setLinking] = useState<SocialProvider | null>(null);

  useEffect(() => {
    let active = true;
    fetchAuthProviders().then((p) => { if (active) setAvailable(p); });
    return () => { active = false; };
  }, []);

  const linkProvider = (provider: SocialProvider) => {
    if (available && !available[provider]) {
      showToast("error", `${provider === "facebook" ? "Facebook" : "Google"} no está disponible en este entorno.`);
      return;
    }
    setLinking(provider);
    openSocialLogin(provider, {
      onSuccess: () => {
        showToast("success", "Cuenta vinculada.");
        queryClient.invalidateQueries({ queryKey: settingsKeys.profile });
        updateSession();
      },
      onClose: () => setLinking(null),
    });
  };
  const roleInfo = ROLE_LABELS[role ?? "MEMBER"] ?? ROLE_LABELS.MEMBER;

  const [profileName, setProfileName] = useState("");
  const [profileWaPhone, setProfileWaPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  // Sincroniza el formulario con lo que devuelve el servidor. Se hace en render
  // (patrón "ajustar estado al cambiar una prop") y no en un efecto, para no
  // pintar un fotograma con el formulario vacío antes de rellenarlo.
  const [syncedProfile, setSyncedProfile] = useState<typeof profile>(undefined);
  if (profile && profile !== syncedProfile) {
    setSyncedProfile(profile);
    setProfileName(profile.name || "");
    setProfileWaPhone(profile.whatsappPhone || "");
  }

  const dirty =
    !!profile &&
    (profileName !== (profile.name || "") || profileWaPhone !== (profile.whatsappPhone || ""));

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name: string; whatsappPhone: string | null }) =>
      apiSend("/api/user/profile", "PATCH", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: settingsKeys.profile });
      await updateSession?.();
      showToast("success", "Perfil actualizado.");
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiFetch("/api/user/avatar", { method: "POST", body: formData });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: settingsKeys.profile });
      await updateSession?.();
      showToast("success", "Foto de perfil actualizada.");
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  const removeAvatarMutation = useMutation({
    mutationFn: () => apiSend("/api/user/avatar", "DELETE"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: settingsKeys.profile });
      await updateSession?.();
      showToast("success", "Foto eliminada.");
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  function handleSaveProfile() {
    const nextErrors: { name?: string; phone?: string } = {};
    const trimmed = profileName.trim();
    if (trimmed.length < 2) nextErrors.name = "El nombre debe tener al menos 2 caracteres.";

    const waPhone = profileWaPhone.replace(/\D/g, "");
    if (profileWaPhone && (waPhone.length < 7 || waPhone.length > 15)) {
      nextErrors.phone = "Usa sólo dígitos con lada de país, sin +, espacios ni guiones.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    updateProfileMutation.mutate({ name: trimmed, whatsappPhone: waPhone || null });
  }

  async function handleRemoveAvatar() {
    const ok = await showConfirm({
      title: "Quitar foto de perfil",
      message: "Volverás al avatar con tus iniciales.",
      confirmLabel: "Quitar",
      danger: true,
    });
    if (ok) removeAvatarMutation.mutate();
  }

  function handleFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      showToast("error", "La imagen excede 4MB.");
      return;
    }
    avatarMutation.mutate(file);
  }

  if (isLoading) return <SettingsSkeleton cards={2} />;

  const avatarUrl = profile?.image || session?.user?.image;
  const initial = (profile?.name || session?.user?.name || "U")[0].toUpperCase();
  const uploading = avatarMutation.isPending || removeAvatarMutation.isPending;

  return (
    <SettingsStack>
      <SettingsCard
        title="Perfil"
        description="Cómo te ven tus compañeros dentro de FlowChart."
        icon={<User className="w-5 h-5 text-[var(--fc-accent)]" />}
      >
        {/* Identidad + avatar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 mb-8 pb-8 border-b border-[var(--fc-border-subtle)]">
          <div className="relative group shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar externo (OAuth/Blob) sin loader configurado
              <img
                src={avatarUrl}
                alt=""
                className="w-20 h-20 rounded-full border border-[var(--fc-border-strong)] object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[var(--fc-surface)] border border-[var(--fc-border-strong)] flex items-center justify-center font-display text-3xl text-[var(--fc-accent)]">
                {initial}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Cambiar foto de perfil"
              className="absolute inset-0 rounded-full bg-[var(--fc-surface-overlay)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center text-[var(--fc-text)] disabled:cursor-not-allowed"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFilePicked}
              className="hidden"
            />
          </div>

          <div className="min-w-0">
            <div className="text-base font-semibold text-[var(--fc-text)]">
              {profile?.name || "Sin nombre"}
            </div>
            <div className="text-sm text-[var(--fc-text-muted)] truncate">{profile?.email}</div>

            <div className="text-xs text-[var(--fc-text-secondary)] mt-2 flex items-center gap-1.5 flex-wrap">
              <span>{workspace?.name ? `En ${workspace.name}:` : "Rol:"}</span>
              <span
                className="px-2 py-0.5 rounded-full bg-[var(--fc-surface-raised)] font-semibold text-[10px] uppercase tracking-wider text-[var(--fc-text-secondary)]"
                style={{ color: roleInfo.color }}
              >
                {roleInfo.label}
              </span>
            </div>
            <p className="text-[11px] text-[var(--fc-text-muted)] mt-1.5 max-w-md leading-relaxed">
              {roleInfo.hint}
            </p>

            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-[11px] font-medium text-[var(--fc-accent)] hover:underline disabled:opacity-50"
              >
                Cambiar foto
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                  className="text-[11px] font-medium text-[var(--fc-text-muted)] hover:text-[var(--fc-danger)] flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" /> Quitar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Datos editables */}
        <div className="w-full space-y-5">
          <Field
            label="Nombre de visualización"
            value={profileName}
            onChange={(e) => {
              setProfileName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Tu nombre"
            error={errors.name}
            hint="Aparece en tareas, comentarios y aprobaciones."
          />

          <Field
            label={
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp personal
              </>
            }
            type="tel"
            value={profileWaPhone}
            onChange={(e) => {
              setProfileWaPhone(e.target.value);
              setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            placeholder="5215512345678"
            error={errors.phone}
            hint="FlowChart te avisa por WhatsApp cuando te asignan tareas o vence un SLA. Déjalo vacío para desactivarlo."
          />

          <div className="pt-1 flex items-center gap-3">
            <button
              onClick={handleSaveProfile}
              disabled={updateProfileMutation.isPending || !dirty}
              className="btn-primary"
              style={{ opacity: updateProfileMutation.isPending || !dirty ? 0.5 : 1 }}
            >
              {updateProfileMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
            {dirty && (
              <span className="text-[11px] text-[var(--fc-warning)]">Cambios sin guardar</span>
            )}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Cuentas vinculadas"
        description="Vincula proveedores para iniciar sesión más rápido. Tu correo siempre identifica la cuenta."
        icon={<Plug className="w-5 h-5 text-[var(--fc-accent)]" />}
      >
        <div className="flex flex-col gap-3 w-full">
          <ProviderRow
            name="Correo y contraseña"
            detail={profile?.email || "—"}
            connected={providers.includes("email")}
            disconnectedLabel="Sin contraseña"
            icon={
              <div className="p-2 bg-[var(--fc-surface-overlay)] rounded-lg">
                <Mail className="w-5 h-5 text-[var(--fc-text-secondary)]" />
              </div>
            }
          />

          <ProviderRow
            name="Google"
            detail="Inicia sesión con Google"
            connected={providers.includes("google")}
            onConnect={() => linkProvider("google")}
            icon={
              <div className="p-2 bg-[var(--fc-surface-overlay)] rounded-lg">
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
            }
          />

          <ProviderRow
            name="Facebook"
            detail="Inicia sesión con Facebook"
            connected={providers.includes("facebook")}
            onConnect={() => linkProvider("facebook")}
            icon={
              <div className="p-2 bg-[var(--fc-surface-overlay)] rounded-lg">
                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
            }
          />
        </div>
      </SettingsCard>
    </SettingsStack>
  );
}

function ProviderRow({
  name,
  detail,
  connected,
  icon,
  onConnect,
  disconnectedLabel = "Vincular",
}: {
  name: string;
  detail: string;
  connected: boolean;
  icon: React.ReactNode;
  onConnect?: () => void;
  disconnectedLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[var(--fc-surface)] border border-[var(--fc-border-strong)] transition-colors hover:border-[var(--fc-accent)]/50">
      <div className="flex items-center gap-4 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-[14px] text-[var(--fc-text)] font-medium leading-tight">{name}</p>
          <p className="text-[12px] text-[var(--fc-text-muted)] mt-1 truncate leading-tight">{detail}</p>
        </div>
      </div>

      {connected ? (
        <span className="text-[11px] font-bold text-[#0E7A80] bg-[color-mix(in_srgb,#0E7A80_12%,transparent)] px-3 py-1.5 rounded-[6px] shrink-0">
          Conectado
        </span>
      ) : onConnect ? (
        <button onClick={onConnect} className="text-[11px] font-bold text-[#0E7A80] bg-[color-mix(in_srgb,#0E7A80_12%,transparent)] px-3 py-1.5 rounded-[6px] shrink-0 transition-opacity hover:opacity-80 uppercase tracking-wide">
          Vincular
        </button>
      ) : (
        <span className="text-[11px] font-bold text-[var(--fc-text-secondary)] bg-[var(--fc-surface-hover)] px-3 py-1.5 rounded-[6px] shrink-0">
          {disconnectedLabel}
        </span>
      )}
    </div>
  );
}

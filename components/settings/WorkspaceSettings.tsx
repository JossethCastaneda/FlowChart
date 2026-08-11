"use client";

import { useState } from "react";
import { Globe, Clock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiSend } from "@/lib/api-client";
import {
  useWorkspace,
  useWorkspaceSettings,
  useSaveWorkspaceSettings,
  settingsKeys,
  type WorkspaceSummary,
} from "@/hooks/use-settings-data";
import {
  TIMEZONES,
  LOCALES,
  CURRENCIES,
  DEFAULT_WORKSPACE_GENERAL,
  type WorkspaceGeneral,
} from "@/lib/workspace-general";
import { BrandingManager } from "@/components/settings/BrandingManager";
import { showToast } from "@/components/ui/Toast";
import {
  SettingsStack,
  SettingsCard,
  SettingsSkeleton,
  SettingsRow,
  Toggle,
  Field,
  ReadOnlyStat,
  SaveBar,
  inputClass,
} from "@/components/settings/ui";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WorkspaceSettings() {
  const queryClient = useQueryClient();
  const { workspace, workspaceId, isAdmin, isLoading: loadingWorkspace } = useWorkspace();
  const { data: settings, isLoading: loadingSettings } = useWorkspaceSettings();
  const saveSettings = useSaveWorkspaceSettings();

  const [workspaceName, setWorkspaceName] = useState("");
  const [general, setGeneral] = useState<WorkspaceGeneral>(DEFAULT_WORKSPACE_GENERAL);
  const [generalDirty, setGeneralDirty] = useState(false);
  const [generalSaved, setGeneralSaved] = useState(false);

  // Sincronización en render (no en efecto) para evitar un fotograma con los
  // campos vacíos antes de recibir los datos del servidor.
  const [syncedWorkspace, setSyncedWorkspace] = useState<WorkspaceSummary | null>(null);
  if (workspace && workspace !== syncedWorkspace) {
    setSyncedWorkspace(workspace);
    setWorkspaceName(workspace.name || "");
  }

  const serverGeneral = settings?.general;
  const [syncedGeneral, setSyncedGeneral] = useState<WorkspaceGeneral | undefined>(undefined);
  if (serverGeneral && serverGeneral !== syncedGeneral) {
    setSyncedGeneral(serverGeneral);
    setGeneral(serverGeneral);
    setGeneralDirty(false);
  }

  const renameMutation = useMutation({
    mutationFn: (name: string) => {
      if (!workspaceId) throw new Error("No se encontró el workspace activo.");
      return apiSend(`/api/workspace/${workspaceId}`, "PATCH", { name: name.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.workspaces });
      showToast("success", "Nombre del workspace actualizado.");
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  function patchGeneral(patch: Partial<WorkspaceGeneral>) {
    setGeneral((prev) => ({ ...prev, ...patch }));
    setGeneralDirty(true);
    setGeneralSaved(false);
  }

  function handleSaveGeneral() {
    if (general.workdayEnd <= general.workdayStart) {
      showToast("error", "La hora de fin de jornada debe ser posterior a la de inicio.");
      return;
    }
    saveSettings.mutate(
      { general },
      {
        onSuccess: () => {
          setGeneralDirty(false);
          setGeneralSaved(true);
          showToast("success", "Ajustes regionales guardados.");
        },
        onError: (error: Error) => showToast("error", error.message),
      },
    );
  }

  const nameDirty = !!workspace && workspaceName.trim() !== workspace.name;

  if (loadingWorkspace || loadingSettings) return <SettingsSkeleton cards={3} />;

  if (!workspace) {
    return (
      <SettingsCard title="Workspace" description="No pudimos cargar tu espacio de trabajo.">
        <p className="text-[13px] text-[var(--fc-text-secondary)]">
          Recarga la página. Si el problema continúa, vuelve a iniciar sesión.
        </p>
      </SettingsCard>
    );
  }

  return (
    <SettingsStack>
      {/* ── Identidad ── */}
      <SettingsCard
        title="General"
        description="Identidad de tu espacio de trabajo dentro de Sodare."
        icon={<Globe className="w-5 h-5 text-[var(--fc-accent)]" />}
      >
        <div className="max-w-xl space-y-6">
          <Field
            label="Nombre del workspace"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            disabled={!isAdmin}
            hint={
              isAdmin
                ? "Lo ven tu equipo y tus clientes en invitaciones y reportes."
                : "Sólo los administradores pueden cambiarlo."
            }
            trailing={
              isAdmin ? (
                <button
                  onClick={() => {
                    if (workspaceName.trim().length < 2) {
                      showToast("error", "El nombre debe tener al menos 2 caracteres.");
                      return;
                    }
                    renameMutation.mutate(workspaceName);
                  }}
                  disabled={renameMutation.isPending || !nameDirty}
                  className="btn-primary w-full sm:w-auto shrink-0"
                  style={{ opacity: renameMutation.isPending || !nameDirty ? 0.5 : 1 }}
                >
                  {renameMutation.isPending ? "Guardando..." : "Guardar"}
                </button>
              ) : undefined
            }
          />

          <div className="flex flex-col sm:flex-row gap-4">
            <ReadOnlyStat label="Identificador (slug)" value={workspace.slug || "—"} />
            <ReadOnlyStat label="Plan actual" value={workspace.plan || "free"} accent />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <ReadOnlyStat label="Miembros" value={String(workspace.memberCount ?? 0)} />
            <ReadOnlyStat label="Proyectos" value={String(workspace.projectCount ?? 0)} />
          </div>
        </div>
      </SettingsCard>

      {/* ── Región y horario ── */}
      <SettingsCard
        title="Región y horario"
        description="Determina cómo se calculan los SLA, cuándo salen los recordatorios y con qué formato se muestran fechas y montos."
        icon={<Clock className="w-5 h-5 text-[var(--fc-accent)]" />}
        footer={
          isAdmin ? (
            <SaveBar
              dirty={generalDirty}
              saving={saveSettings.isPending}
              saved={generalSaved}
              onSave={handleSaveGeneral}
              onDiscard={() => {
                if (settings?.general) setGeneral(settings.general);
                setGeneralDirty(false);
              }}
            />
          ) : undefined
        }
      >
        <div className="max-w-2xl">
          <SettingsRow
            label="Zona horaria"
            description="Base para vencimientos, recordatorios y reportes programados."
            htmlFor="ws-timezone"
          >
            <select
              id="ws-timezone"
              value={general.timezone}
              disabled={!isAdmin}
              onChange={(e) => patchGeneral({ timezone: e.target.value })}
              className={`${inputClass} sm:w-[260px] cursor-pointer`}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </SettingsRow>

          <SettingsRow
            label="Idioma y formato"
            description="Formato de fechas y números en la interfaz y los reportes."
            htmlFor="ws-locale"
          >
            <select
              id="ws-locale"
              value={general.locale}
              disabled={!isAdmin}
              onChange={(e) => patchGeneral({ locale: e.target.value })}
              className={`${inputClass} sm:w-[260px] cursor-pointer`}
            >
              {LOCALES.map((locale) => (
                <option key={locale.value} value={locale.value}>
                  {locale.label}
                </option>
              ))}
            </select>
          </SettingsRow>

          <SettingsRow
            label="Moneda"
            description="Se usa para presupuestos de campaña y reportes de inversión."
            htmlFor="ws-currency"
          >
            <select
              id="ws-currency"
              value={general.currency}
              disabled={!isAdmin}
              onChange={(e) => patchGeneral({ currency: e.target.value })}
              className={`${inputClass} sm:w-[260px] cursor-pointer`}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
          </SettingsRow>

          <SettingsRow
            label="La semana empieza en"
            description="Afecta calendarios, parrillas y el resumen semanal."
            htmlFor="ws-weekstart"
          >
            <select
              id="ws-weekstart"
              value={general.weekStartsOn}
              disabled={!isAdmin}
              onChange={(e) => patchGeneral({ weekStartsOn: Number(e.target.value) === 0 ? 0 : 1 })}
              className={`${inputClass} sm:w-[260px] cursor-pointer`}
            >
              <option value={1}>Lunes</option>
              <option value={0}>Domingo</option>
            </select>
          </SettingsRow>

          <SettingsRow
            label="Horario laboral"
            description="Franja en la que opera el equipo, en la zona horaria de arriba."
          >
            <div className="flex items-center gap-2">
              <select
                aria-label="Hora de inicio de jornada"
                value={general.workdayStart}
                disabled={!isAdmin}
                onChange={(e) => patchGeneral({ workdayStart: Number(e.target.value) })}
                className={`${inputClass} !w-[92px] cursor-pointer`}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>
                ))}
              </select>
              <span className="text-xs text-[var(--fc-text-muted)]">a</span>
              <select
                aria-label="Hora de fin de jornada"
                value={general.workdayEnd}
                disabled={!isAdmin}
                onChange={(e) => patchGeneral({ workdayEnd: Number(e.target.value) })}
                className={`${inputClass} !w-[92px] cursor-pointer`}
              >
                {HOURS.slice(1).concat(24).map((h) => (
                  <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>
                ))}
              </select>
            </div>
          </SettingsRow>

          <SettingsRow
            label="Contar SLA sólo en horario laboral"
            description="Si está activo, el reloj de las tareas se pausa por las noches y los fines de semana en vez de correr 24/7."
            last
          >
            <Toggle
              checked={general.slaBusinessHoursOnly}
              onChange={(value) => patchGeneral({ slaBusinessHoursOnly: value })}
              disabled={!isAdmin}
              label="Contar SLA sólo en horario laboral"
            />
          </SettingsRow>
        </div>
      </SettingsCard>

      {/* ── Marca ── */}
      {isAdmin && <BrandingManager />}
    </SettingsStack>
  );
}

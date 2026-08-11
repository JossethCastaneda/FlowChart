"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  Palette, Image as ImageIcon, Type, UploadCloud, Trash2, Loader2, Info, Check,
} from "lucide-react";
import { apiFetch, apiSend } from "@/lib/api-client";
import {
  useWorkspace,
  useWorkspaceSettings,
  useSaveWorkspaceSettings,
  settingsKeys,
} from "@/hooks/use-settings-data";
import type { WorkspaceBranding } from "@/lib/workflow-config";
import {
  buildAccentTokens,
  isValidHex,
  adjustForContrast,
  THEME_BACKGROUNDS,
} from "@/lib/accent-color";
import { showToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/ConfirmModal";
import {
  SettingsCard,
  SettingsRow,
  Toggle,
  Field,
  SaveBar,
  inputClass,
} from "@/components/settings/ui";

const DEFAULT_ACCENT = "#5b9bff";
const ACCEPTED = "image/png,image/svg+xml,image/webp,image/jpeg";

/** Paleta de arranque: matices distintos y ya legibles en los tres temas. */
const PRESETS = ["#5b9bff", "#7c6bd6", "#bc5fb2", "#e0607e", "#d98843", "#34b77c", "#45aec2", "#8b8df2"];

export function BrandingManager() {
  const queryClient = useQueryClient();
  const { workspace, isAdmin } = useWorkspace();
  const { data: settings, isLoading } = useWorkspaceSettings();
  const saveSettings = useSaveWorkspaceSettings();
  const { resolvedTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [branding, setBranding] = useState<WorkspaceBranding>({});
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Sincronización en render: evita pintar el formulario vacío un instante.
  const serverBranding = settings?.branding;
  const [syncedBranding, setSyncedBranding] = useState<WorkspaceBranding | undefined>(undefined);
  if (serverBranding && serverBranding !== syncedBranding) {
    setSyncedBranding(serverBranding);
    setBranding(serverBranding);
    setDirty(false);
  }

  const accentColor = branding.accentColor || DEFAULT_ACCENT;
  const displayName = branding.displayName || "";
  const logoUrl = branding.logoUrl || "";
  const applyInApp = branding.applyInApp !== false;

  const theme = resolvedTheme || "dark";
  const tokens = buildAccentTokens(accentColor, theme);
  // Si la tinta tuvo que moverse para ser legible, conviene decírselo al
  // usuario en vez de que note "un color distinto al que elegí".
  const inkWasAdjusted =
    isValidHex(accentColor) &&
    adjustForContrast(accentColor, THEME_BACKGROUNDS[theme] ?? THEME_BACKGROUNDS.dark, 4.5).toLowerCase() !==
      accentColor.toLowerCase();

  function patch(next: Partial<WorkspaceBranding>) {
    setBranding((prev) => ({ ...prev, ...next }));
    setDirty(true);
    setSaved(false);
  }

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiFetch<{ logoUrl: string }>("/api/workspace/branding/logo", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (data) => {
      setBranding((prev) => ({ ...prev, logoUrl: data.logoUrl }));
      setSyncedBranding(undefined); // fuerza resincronizar con el servidor
      queryClient.invalidateQueries({ queryKey: settingsKeys.workspaceSettings });
      showToast("success", "Logo actualizado.");
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  const removeLogo = useMutation({
    mutationFn: () => apiSend("/api/workspace/branding/logo", "DELETE"),
    onSuccess: () => {
      setBranding((prev) => ({ ...prev, logoUrl: "" }));
      setSyncedBranding(undefined);
      queryClient.invalidateQueries({ queryKey: settingsKeys.workspaceSettings });
      showToast("success", "Logo eliminado.");
    },
    onError: (error: Error) => showToast("error", error.message),
  });

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED.split(",").includes(file.type)) {
      showToast("error", "Formato no permitido. Usa PNG, SVG, WebP o JPG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("error", "El logo excede 2MB.");
      return;
    }
    uploadLogo.mutate(file);
  }

  async function handleRemoveLogo() {
    const ok = await showConfirm({
      title: "Quitar logo",
      message: "Tus clientes volverán a ver el monograma con las iniciales del workspace.",
      confirmLabel: "Quitar",
      danger: true,
    });
    if (ok) removeLogo.mutate();
  }

  function handleSave() {
    if (!isValidHex(accentColor)) {
      showToast("error", "El color debe estar en formato #RRGGBB.");
      return;
    }

    saveSettings.mutate(
      {
        branding: {
          displayName: displayName.trim() || undefined,
          logoUrl,
          accentColor,
          applyInApp,
        },
      },
      {
        onSuccess: () => {
          setDirty(false);
          setSaved(true);
          showToast("success", "Marca actualizada.");
        },
        onError: (error: Error) => showToast("error", error.message),
      },
    );
  }

  if (isLoading) {
    return <div className="animate-pulse h-72 bg-[var(--fc-surface)] rounded-2xl border border-[var(--surface-hover)]" />;
  }

  const previewName = displayName || workspace?.name || "Tu agencia";
  const busy = uploadLogo.isPending || removeLogo.isPending;

  return (
    <SettingsCard
      title="Marca (white label)"
      description="Sustituye el logo y el color de Sodare por los de tu marca."
      icon={<Palette className="w-5 h-5 text-[var(--fc-accent)]" />}
      aside={
        workspace && (
          // Alcance explícito: con varios workspaces hay que saber cuál se edita.
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--surface-hover)] border border-[var(--hairline)] text-[var(--fc-text-secondary)]">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
            {workspace.name}
          </span>
        )
      }
      footer={
        <SaveBar
          dirty={dirty}
          saving={saveSettings.isPending}
          saved={saved}
          onSave={handleSave}
          onDiscard={() => {
            setBranding(settings?.branding ?? {});
            setDirty(false);
          }}
          label="Guardar marca"
          disabled={!isAdmin}
        />
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-8">
        <div className="space-y-6 max-w-xl">
          {/* ── Logo ── */}
          <div>
            <label className="text-xs font-medium text-[var(--fc-text-secondary)] mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Logo
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (isAdmin) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (isAdmin) handleFile(e.dataTransfer.files?.[0]);
              }}
              className={`rounded-xl border border-dashed transition-colors p-4 ${
                dragging
                  ? "border-[var(--fc-accent)] bg-[var(--fc-accent-wash)]"
                  : "border-[var(--fc-border)] bg-[var(--surface-hover)]/40"
              }`}
            >
              {logoUrl ? (
                <div className="flex items-center gap-4">
                  <div className="h-14 w-28 rounded-lg bg-[var(--fc-surface)] border border-[var(--hairline)] flex items-center justify-center overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element -- logo subido por el cliente (Blob o data URL) */}
                    <img src={logoUrl} alt="Logo actual" className="max-h-10 max-w-24 object-contain" />
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex gap-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!isAdmin || busy}
                        className="text-[11px] font-medium text-[var(--fc-accent)] hover:underline disabled:opacity-50"
                      >
                        Reemplazar
                      </button>
                      <button
                        onClick={handleRemoveLogo}
                        disabled={!isAdmin || busy}
                        className="text-[11px] font-medium text-[var(--fc-text-muted)] hover:text-[var(--fc-danger)] flex items-center gap-1 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" /> Quitar
                      </button>
                    </div>
                    <span className="text-[10px] text-[var(--fc-text-muted)]">
                      Se muestra a 32px de alto en portales y correos.
                    </span>
                  </div>
                  {busy && <Loader2 className="w-4 h-4 animate-spin text-[var(--fc-accent)] ml-auto" />}
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isAdmin || busy}
                  className="w-full flex flex-col items-center gap-2 py-5 text-center disabled:cursor-not-allowed"
                >
                  {busy ? (
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--fc-accent)]" />
                  ) : (
                    <UploadCloud className="w-6 h-6 text-[var(--fc-text-muted)]" />
                  )}
                  <span className="text-[13px] text-[var(--fc-text-secondary)] font-medium">
                    Arrastra tu logo o haz clic para subirlo
                  </span>
                  <span className="text-[11px] text-[var(--fc-text-muted)]">
                    PNG, SVG, WebP o JPG · máximo 2MB · fondo transparente
                  </span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                handleFile(file);
              }}
              className="hidden"
            />
          </div>

          {/* ── Nombre comercial ── */}
          <Field
            label={
              <>
                <Type className="w-3.5 h-3.5" /> Nombre comercial
              </>
            }
            value={displayName}
            onChange={(e) => patch({ displayName: e.target.value })}
            placeholder={workspace?.name || "Tu agencia"}
            disabled={!isAdmin}
            hint="Reemplaza el nombre del workspace en lo que ve el cliente. Vacío = nombre real."
          />

          {/* ── Color ── */}
          <div>
            <label htmlFor="accent-hex" className="text-xs font-medium text-[var(--fc-text-secondary)] mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Color de acento
            </label>

            <div className="flex gap-2 items-center mb-3">
              <input
                type="color"
                aria-label="Selector de color de acento"
                value={isValidHex(accentColor) ? accentColor : DEFAULT_ACCENT}
                onChange={(e) => patch({ accentColor: e.target.value })}
                disabled={!isAdmin}
                className="w-11 h-11 p-1 bg-transparent border border-[var(--fc-border)] rounded-lg cursor-pointer disabled:cursor-not-allowed"
              />
              <input
                id="accent-hex"
                type="text"
                value={accentColor}
                onChange={(e) => patch({ accentColor: e.target.value })}
                disabled={!isAdmin}
                placeholder={DEFAULT_ACCENT}
                className={`${inputClass} !w-[140px] font-mono`}
              />
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => isAdmin && patch({ accentColor: color })}
                  disabled={!isAdmin}
                  aria-label={`Usar ${color}`}
                  aria-pressed={accentColor.toLowerCase() === color}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{
                    background: color,
                    border:
                      accentColor.toLowerCase() === color
                        ? "2px solid var(--fc-text)"
                        : "2px solid transparent",
                  }}
                >
                  {accentColor.toLowerCase() === color && (
                    <Check className="w-3.5 h-3.5" style={{ color: tokens["--accent-contrast"] }} />
                  )}
                </button>
              ))}
            </div>

            {inkWasAdjusted && (
              <p className="text-[11px] text-[var(--fc-text-muted)] mt-3 flex items-start gap-1.5 leading-relaxed">
                <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                Para textos e iconos usamos una versión{" "}
                <span
                  className="font-semibold px-1 rounded"
                  style={{ color: tokens["--accent-ink"] }}
                >
                  algo más legible
                </span>{" "}
                de tu color. Los rellenos (botones, barras) sí usan el tono exacto.
              </p>
            )}
          </div>

          {/* ── Alcance ── */}
          <div className="pt-2 border-t border-[var(--hairline)]">
            <SettingsRow
              label="Aplicar la marca dentro de la plataforma"
              description={
                applyInApp
                  ? "Tu equipo ve el panel con tu color. Al cambiar de workspace, la interfaz se retiñe con la marca de ese workspace."
                  : "Sólo los portales y correos que ve el cliente usan tu marca. El panel interno mantiene el azul de Sodare."
              }
              last
            >
              <Toggle
                checked={applyInApp}
                onChange={(value) => patch({ applyInApp: value })}
                disabled={!isAdmin}
                label="Aplicar la marca dentro de la plataforma"
              />
            </SettingsRow>
          </div>
        </div>

        {/* ── Previsualización ── */}
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--fc-text-muted)] mb-2">
              Lo que ve el cliente
            </p>
            <div className="rounded-xl border border-[var(--hairline)] bg-[var(--fc-surface)] overflow-hidden">
              <div className="h-1" style={{ background: tokens["--accent"] }} />
              <div className="p-4">
                <div className="flex items-center gap-2.5 mb-4">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- logo subido por el cliente
                    <img src={logoUrl} alt="" className="h-8 max-w-[110px] object-contain" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                      style={{ background: tokens["--accent"], color: tokens["--accent-contrast"] }}
                    >
                      {previewName[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-[var(--fc-text)] truncate">
                    {previewName}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="h-2 rounded bg-[var(--surface-hover)] w-full" />
                  <div className="h-2 rounded bg-[var(--surface-hover)] w-4/5" />
                </div>

                <button
                  type="button"
                  tabIndex={-1}
                  className="w-full py-2 rounded-lg text-[11px] font-bold pointer-events-none"
                  style={{ background: tokens["--accent"], color: tokens["--accent-contrast"] }}
                >
                  Aprobar contenido
                </button>
              </div>
            </div>
          </div>

          {applyInApp && (
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--fc-text-muted)] mb-2">
                Lo que ve tu equipo
              </p>
              <div className="rounded-xl border border-[var(--hairline)] bg-[var(--fc-surface)] overflow-hidden flex h-[124px]">
                {/* Barra lateral con el elemento activo teñido */}
                <div className="w-[38%] bg-[var(--fc-bg)] p-2 space-y-1.5 border-r border-[var(--hairline)]">
                  <div
                    className="h-4 rounded flex items-center px-1.5 gap-1"
                    style={{
                      background: tokens["--accent-dim"],
                      borderLeft: `2px solid ${tokens["--accent-ink"]}`,
                    }}
                  >
                    <span className="h-1 w-8 rounded-full" style={{ background: tokens["--accent-ink"] }} />
                  </div>
                  <div className="h-4 rounded flex items-center px-1.5">
                    <span className="h-1 w-6 rounded-full bg-[var(--fc-text-muted)] opacity-40" />
                  </div>
                  <div className="h-4 rounded flex items-center px-1.5">
                    <span className="h-1 w-7 rounded-full bg-[var(--fc-text-muted)] opacity-40" />
                  </div>
                </div>

                <div className="flex-1 p-2.5 space-y-2">
                  <div className="h-1.5 w-12 rounded-full" style={{ background: tokens["--accent-ink"] }} />
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-hover)]" />
                  <div className="h-1.5 w-3/4 rounded-full bg-[var(--surface-hover)]" />
                  <div className="flex gap-1.5 pt-1">
                    <span
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: tokens["--accent"], color: tokens["--accent-contrast"] }}
                    >
                      Acción
                    </span>
                    {/* Los estados conservan su color: no se tiñen */}
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[var(--fc-success)]/15 text-[var(--fc-success)]">
                      Listo
                    </span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[var(--fc-danger)]/15 text-[var(--fc-danger)]">
                      Vencido
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-[var(--fc-text-muted)] mt-2 leading-relaxed">
                Verde, ámbar y rojo no se tiñen nunca: comunican estado, no marca.
              </p>
            </div>
          )}
        </div>
      </div>
    </SettingsCard>
  );
}

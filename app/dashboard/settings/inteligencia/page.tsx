"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Check, Loader2, KeyRound, Zap, AlertTriangle } from "lucide-react";
import { apiFetch, apiSend } from "@/lib/api-client";
import { useWorkspace } from "@/hooks/use-settings-data";
import { showToast } from "@/components/ui/Toast";
import {
  SettingsStack,
  SettingsCard,
  SettingsSkeleton,
  SettingsEmpty,
} from "@/components/settings/ui";

interface CatalogModel {
  id: string;
  label: string;
  note: string;
  inputPerM: number;
  outputPerM: number;
  power: number;
  performance: string;
}

interface CatalogProvider {
  id: string;
  label: string;
  vendor: string;
  tagline: string;
  strengths: string[];
  recommendedModel: string;
  envVar: string;
  configured: boolean;
  models: CatalogModel[];
}

interface AiModelPayload {
  model: string;
  defaultModel: string;
  providers: CatalogProvider[];
}

const money = (value: number) =>
  value < 1 ? `$${value.toFixed(2)}` : `$${value.toFixed(2)}`;

/**
 * Selección del modelo de IA del workspace.
 *
 * La API y el catálogo existían desde hace tiempo, pero ninguna pantalla los
 * usaba: el modelo sólo podía cambiarse llamando al endpoint a mano.
 */
export default function InteligenciaPage() {
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: loadingWorkspace } = useWorkspace();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["workspaceAiModel"],
    queryFn: () => apiFetch<AiModelPayload>("/api/workspace/ai-model"),
  });

  const selectMutation = useMutation({
    mutationFn: (model: string) => apiSend("/api/workspace/ai-model", "PUT", { model }),
    onSuccess: (_result, model) => {
      queryClient.invalidateQueries({ queryKey: ["workspaceAiModel"] });
      showToast("success", `Modelo actualizado a ${model}.`);
    },
    onError: (err: Error) => showToast("error", err.message),
  });

  if (loadingWorkspace || isLoading) return <SettingsSkeleton cards={2} />;

  if (isError) {
    return (
      <SettingsCard title="Inteligencia" icon={<Sparkles className="w-5 h-5 text-[var(--cyan)]" />}>
        <SettingsEmpty
          icon={<AlertTriangle className="w-8 h-8" />}
          title="No pudimos cargar el catálogo de modelos."
          description={(error as Error)?.message}
        />
      </SettingsCard>
    );
  }

  const providers = data?.providers ?? [];
  const selected = data?.model;
  const anyConfigured = providers.some((p: any) => p.configured);

  return (
    <SettingsStack>
      <SettingsCard
        title="Modelo de inteligencia artificial"
        description="El modelo elegido alimenta a Aria (copiloto e insights), GridIA y cualquier módulo que use IA. Cambiarlo aplica de inmediato a todo el workspace."
        icon={<Sparkles className="w-5 h-5 text-[var(--cyan)]" />}
      >
        {!anyConfigured && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-[var(--amber)]/20 bg-[var(--amber)]/5 mb-5">
            <KeyRound className="w-4 h-4 text-[var(--amber)] mt-0.5 shrink-0" />
            <p className="text-[11px] text-[var(--amber)] leading-relaxed">
              Ningún proveedor tiene API key configurada en este entorno. Añade la variable de
              entorno correspondiente para poder activar un modelo.
            </p>
          </div>
        )}

        {!isAdmin && (
          <p className="text-[11px] text-[var(--text-muted)] mb-5">
            Sólo los administradores pueden cambiar el modelo. Este es el que usa tu workspace.
          </p>
        )}

        <div className="space-y-5">
          {providers.map((provider: any) => (
            <div
              key={provider.id}
              className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)]/40 overflow-hidden"
              style={{ opacity: provider.configured ? 1 : 0.6 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-[var(--hairline)]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[var(--foreground)]">{provider.label}</span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                      {provider.vendor}
                    </span>
                    {provider.configured ? (
                      <span className="badge badge-emerald">Disponible</span>
                    ) : (
                      <span className="badge badge-muted">Falta {provider.envVar}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">{provider.tagline}</p>
                </div>
              </div>

              <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {provider.models.map((model: any) => {
                  const isSelected = selected === model.id;
                  const disabled = !provider.configured || !isAdmin || selectMutation.isPending;

                  return (
                    <button
                      key={model.id}
                      onClick={() => !disabled && !isSelected && selectMutation.mutate(model.id)}
                      disabled={disabled || isSelected}
                      aria-pressed={isSelected}
                      className={`text-left p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? "border-[var(--cyan)]/50 bg-[var(--cyan)]/5"
                          : "border-[var(--hairline)] bg-[var(--surface)] hover:border-[var(--cyan)]/30"
                      } ${disabled && !isSelected ? "cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[13px] font-semibold text-[var(--foreground)]">
                          {model.label}
                        </span>
                        {isSelected ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--emerald)] shrink-0">
                            {selectMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            EN USO
                          </span>
                        ) : (
                          provider.recommendedModel === model.id && (
                            <span className="text-[10px] font-bold text-[var(--cyan)] shrink-0">
                              RECOMENDADO
                            </span>
                          )
                        )}
                      </div>

                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-2.5">
                        {model.performance}
                      </p>

                      <div className="flex items-center gap-3 flex-wrap text-[10px] text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1" title="Potencia relativa">
                          <Zap className="w-3 h-3 text-[var(--amber)]" />
                          {"▪".repeat(model.power)}
                          <span className="opacity-30">{"▪".repeat(5 - model.power)}</span>
                        </span>
                        <span className="tabular-nums" title="Costo por millón de tokens">
                          {money(model.inputPerM)} entrada · {money(model.outputPerM)} salida / 1M tokens
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>
    </SettingsStack>
  );
}

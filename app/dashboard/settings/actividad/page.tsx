"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  History, Loader2, UserPlus, UserMinus, Shield, Plug, Settings2, Trash2, FileText,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useWorkspace, settingsKeys } from "@/hooks/use-settings-data";
import {
  SettingsStack,
  SettingsCard,
  SettingsRestricted,
  SettingsEmpty,
  SettingsSkeleton,
  inputClass,
} from "@/components/settings/ui";

interface AuditEvent {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: unknown;
  actor: { id: string; name: string | null; email: string | null; image: string | null } | null;
  createdAt: string;
}

interface AuditPage {
  events: AuditEvent[];
  nextCursor: string | null;
}

/**
 * Etiquetas legibles por acción. Las claves son los `action` que escribe
 * lib/audit; lo que no esté aquí se muestra tal cual en vez de ocultarse.
 */
const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  member_invited: { label: "invitó a alguien al workspace", icon: UserPlus, color: "var(--cyan)" },
  member_removed: { label: "removió a un miembro", icon: UserMinus, color: "var(--red)" },
  member_left: { label: "abandonó el workspace", icon: UserMinus, color: "var(--amber)" },
  member_role_changed: { label: "cambió el rol de un miembro", icon: Shield, color: "var(--amber)" },
  member_permissions_changed: { label: "cambió permisos de un miembro", icon: Shield, color: "var(--amber)" },
  settings_updated: { label: "actualizó la configuración del workspace", icon: Settings2, color: "var(--cyan)" },
  workspace_updated: { label: "actualizó los datos del workspace", icon: Settings2, color: "var(--cyan)" },
  subscribe_webhooks: { label: "conectó una integración", icon: Plug, color: "var(--emerald)" },
  resubscribe_webhooks: { label: "reconectó los webhooks", icon: Plug, color: "var(--emerald)" },
  project_deleted: { label: "eliminó un proyecto", icon: Trash2, color: "var(--red)" },
};

/** Acciones del portal público: llegan como client_portal_<evento>. */
function portalLabel(action: string) {
  if (!action.startsWith("client_portal_")) return null;
  return `desde el portal de cliente: ${action.replace("client_portal_", "").replace(/_/g, " ")}`;
}

const FILTERS = [
  { value: "", label: "Todas las acciones" },
  { value: "member_invited", label: "Invitaciones" },
  { value: "member_removed", label: "Bajas de miembros" },
  { value: "member_left", label: "Abandonos" },
  { value: "member_role_changed", label: "Cambios de rol" },
  { value: "member_permissions_changed", label: "Cambios de permisos" },
  { value: "settings_updated", label: "Cambios de configuración" },
  { value: "subscribe_webhooks", label: "Integraciones conectadas" },
];

function formatWhen(iso: string) {
  const date = new Date(iso);
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "hace un momento";
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;
  if (diffMinutes < 60 * 24) return `hace ${Math.round(diffMinutes / 60)} h`;
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActividadPage() {
  const { workspaceId, isAdmin, isLoading } = useWorkspace();
  const [action, setAction] = useState("");

  const query = useInfiniteQuery({
    queryKey: [...settingsKeys.audit(workspaceId), action],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "30" });
      if (action) params.set("action", action);
      if (pageParam) params.set("cursor", pageParam);
      return apiFetch<AuditPage>(`/api/workspace/${workspaceId}/audit?${params}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!workspaceId && isAdmin,
  });

  if (isLoading) return <SettingsSkeleton cards={1} />;

  if (!isAdmin) {
    return (
      <SettingsRestricted message="Sólo los administradores del workspace pueden consultar el registro de actividad." />
    );
  }

  const events = query.data?.pages.flatMap((page) => page.events) ?? [];

  return (
    <SettingsStack>
      <SettingsCard
        title="Registro de actividad"
        description="Quién cambió qué y cuándo: roles, permisos, integraciones y ajustes del workspace."
        icon={<History className="w-5 h-5 text-[var(--cyan)]" />}
        aside={
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            aria-label="Filtrar por tipo de acción"
            className={`${inputClass} !w-auto !py-1.5 !text-[11px] cursor-pointer`}
          >
            {FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        }
      >
        {query.isLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
          </div>
        ) : query.isError ? (
          <SettingsEmpty
            icon={<History className="w-8 h-8" />}
            title="No pudimos cargar el registro."
            description={(query.error as Error)?.message}
            action={
              <button onClick={() => query.refetch()} className="btn-secondary">
                Reintentar
              </button>
            }
          />
        ) : events.length === 0 ? (
          <SettingsEmpty
            icon={<FileText className="w-8 h-8" />}
            title="Sin actividad registrada todavía."
            description="Aquí aparecerán los cambios administrativos del workspace en cuanto ocurran."
          />
        ) : (
          <>
            <ol className="relative flex flex-col">
              {events.map((event, index) => {
                const meta = ACTION_META[event.action];
                const Icon = meta?.icon ?? Settings2;
                const color = meta?.color ?? "var(--text-muted)";
                const last = index === events.length - 1;

                return (
                  <li key={event.id} className="flex gap-3.5 relative pb-5">
                    {/* Línea del hilo temporal */}
                    {!last && (
                      <span
                        aria-hidden="true"
                        className="absolute left-[15px] top-9 bottom-0 w-px bg-[var(--hairline)]"
                      />
                    )}

                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border relative z-10 bg-[var(--surface)]"
                      style={{ borderColor: `${color}40` }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>

                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                        <p className="text-[13px] text-[var(--foreground)]">
                          <span className="font-medium">
                            {event.actor?.name || event.actor?.email || "Sistema"}
                          </span>{" "}
                          <span className="text-[var(--text-secondary)]">
                            {meta?.label ?? portalLabel(event.action) ?? event.action.replace(/_/g, " ")}
                          </span>
                        </p>
                        <time
                          dateTime={event.createdAt}
                          title={new Date(event.createdAt).toLocaleString("es-MX")}
                          className="text-[11px] text-[var(--text-muted)] shrink-0 tabular-nums"
                        >
                          {formatWhen(event.createdAt)}
                        </time>
                      </div>

                      {event.resourceType && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {event.resourceType}
                          {event.resourceId ? ` · ${event.resourceId.slice(0, 12)}` : ""}
                        </p>
                      )}

                      {!!event.details && typeof event.details === "object" && (
                        <details className="mt-1.5">
                          <summary className="text-[10px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--cyan)] transition-colors list-none">
                            Ver detalle
                          </summary>
                          <pre className="mt-1.5 text-[10px] text-[var(--text-secondary)] bg-black/20 border border-[var(--hairline)] rounded-lg p-2.5 overflow-x-auto">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {query.hasNextPage && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                  className="btn-secondary flex items-center gap-2"
                >
                  {query.isFetchingNextPage && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Cargar más
                </button>
              </div>
            )}
          </>
        )}
      </SettingsCard>
    </SettingsStack>
  );
}

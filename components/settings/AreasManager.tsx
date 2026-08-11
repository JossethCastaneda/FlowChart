"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Trash2, X, Star, ChevronDown, Loader2, Users, Shield, Timer,
  Zap, Calendar, MessageCircle, Megaphone, BarChart3, Target,
  CheckSquare, Square, UserPlus, Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SUGGESTED_AREAS,
  DEFAULT_MEMBER_PERMS,
  DEFAULT_EXTERNAL_PERMS,
  DEFAULT_LEADER_PERMS,
  type Area,
  type AreaPermissions,
} from "@/lib/workflow-config";
import { useWorkspaceSettings, useSaveWorkspaceSettings } from "@/hooks/use-settings-data";
import { showToast } from "@/components/ui/Toast";
import { showConfirm } from "@/components/ui/ConfirmModal";
import {
  SettingsCard,
  SettingsRow,
  SettingsEmpty,
  SettingsStack,
  Toggle,
  SaveBar,
  inputClass,
} from "@/components/settings/ui";

interface Member {
  id: string;
  name: string;
  activityStatus?: string;
}

const STATUS_COLORS: Record<string, string> = {
  disponible: "var(--fc-success)",
  ocupado: "var(--fc-warning)",
  ausente: "var(--fc-danger)",
  offline: "var(--fc-text-muted)",
};

const COLORS = ["#0081FB", "#bc5fb2", "#34b77c", "#8b8df2", "#d98843", "#22d3ee", "#e2445c", "#e0a83c"];

const uid = () => Math.random().toString(36).slice(2, 9);

/** Módulos que un área puede habilitar. `canEdit*` se deriva del acceso. */
const PERM_KEYS: { key: keyof AreaPermissions; label: string; icon: React.ElementType }[] = [
  { key: "canAccessOps", label: "Ops (gestión)", icon: Zap },
  { key: "canAccessPublisher", label: "Publisher", icon: Calendar },
  { key: "canAccessInbox", label: "Inbox", icon: MessageCircle },
  { key: "canAccessAds", label: "Ads Manager", icon: Megaphone },
  { key: "canAccessAnalytics", label: "Analytics", icon: BarChart3 },
  { key: "canViewSensitiveAnalytics", label: "Datos personales sin enmascarar", icon: Shield },
  { key: "canAccessBriefing", label: "Briefing", icon: Target },
];

type PermScope = "leaders" | "members" | "external";
type AreaTab = "equipo" | "solicitudes" | "permisos";

const SCOPE_META: { id: PermScope; label: string; icon: React.ElementType; color: string; hint: string }[] = [
  { id: "leaders", label: "Líderes", icon: Star, color: "var(--fc-warning)", hint: "Revisan y aprueban el trabajo del área. Normalmente acceso total." },
  { id: "members", label: "Miembros", icon: Users, color: "var(--fc-accent)", hint: "Perfil operativo: sólo las herramientas que usan a diario." },
  { id: "external", label: "Externos", icon: UserPlus, color: "var(--fc-module-aria)", hint: "Clientes o colaboradores invitados. Empieza por lo mínimo." },
];

function defaultsFor(scope: PermScope): AreaPermissions {
  if (scope === "leaders") return DEFAULT_LEADER_PERMS;
  if (scope === "members") return DEFAULT_MEMBER_PERMS;
  return DEFAULT_EXTERNAL_PERMS;
}

function permsOf(area: Area) {
  return (
    area.permissions || {
      leaders: { ...DEFAULT_LEADER_PERMS },
      members: { ...DEFAULT_MEMBER_PERMS },
      external: { ...DEFAULT_EXTERNAL_PERMS },
    }
  );
}

/**
 * Áreas, SLA y permisos en una sola pantalla y con un solo estado.
 *
 * Antes esto vivía en dos componentes (AreasManager + PermissionsManager) que
 * se renderizaban juntos, cada uno con su copia de `areas` y su propio botón
 * de guardar: guardar en uno revertía lo editado en el otro. Ahora el área es
 * la unidad y sus permisos son una pestaña más dentro de ella.
 */
export function AreasManager({ members, canEdit }: { members: Member[]; canEdit: boolean }) {
  const { data: settings, isLoading } = useWorkspaceSettings();
  const saveSettings = useSaveWorkspaceSettings();

  const [areas, setAreas] = useState<Area[]>([]);
  const [requireLeadReview, setRequireLeadReview] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Record<string, AreaTab>>({});

  // Sincroniza desde el servidor sólo mientras no haya edición en curso, para
  // no descartar cambios del usuario si otra pantalla invalida la query. Se
  // hace en render (no en efecto) para no pintar la lista vacía un instante.
  const [syncedSettings, setSyncedSettings] = useState<typeof settings>(undefined);
  if (settings && settings !== syncedSettings && !dirty) {
    setSyncedSettings(settings);
    setAreas(settings.areas ?? []);
    setRequireLeadReview(settings.requireLeadReview !== false);
  }

  const mark = () => {
    setDirty(true);
    setSaved(false);
  };

  const nameOf = useCallback(
    (id: string) => members.find((m) => m.id === id)?.name || "—",
    [members],
  );

  const totals = useMemo(
    () => ({
      areas: areas.length,
      assigned: new Set(areas.flatMap((a) => a.memberIds)).size,
      leads: new Set(areas.flatMap((a) => a.leadIds)).size,
    }),
    [areas],
  );

  const unassigned = useMemo(() => {
    const assigned = new Set(areas.flatMap((a) => a.memberIds));
    return members.filter((m) => !assigned.has(m.id));
  }, [areas, members]);

  // ── Mutadores ─────────────────────────────────────────────────────────────

  const patchArea = (id: string, patch: Partial<Area>) => {
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    mark();
  };

  const addArea = () => {
    const newId = uid();
    setAreas((prev) => [
      ...prev,
      {
        id: newId,
        name: "Nueva área",
        color: COLORS[prev.length % COLORS.length],
        slaHours: 24,
        slaMode: "manual",
        leadIds: [],
        memberIds: [],
        requestTypes: [],
        requireLeadReview: true,
        permissions: {
          leaders: { ...DEFAULT_LEADER_PERMS },
          members: { ...DEFAULT_MEMBER_PERMS },
          external: { ...DEFAULT_EXTERNAL_PERMS },
        },
      },
    ]);
    setExpanded(newId);
    mark();
  };

  const removeArea = async (area: Area) => {
    const ok = await showConfirm({
      title: `Eliminar área "${area.name}"`,
      message:
        "Las tareas y solicitudes que apunten a esta área quedarán sin área asignada y perderán su SLA.",
      confirmLabel: "Eliminar área",
      danger: true,
    });
    if (!ok) return;
    setAreas((prev) => prev.filter((a) => a.id !== area.id));
    mark();
  };

  const seed = () => {
    const seeded = SUGGESTED_AREAS.map((a) => ({
      ...a,
      leadIds: [],
      memberIds: [],
      requestTypes: a.requestTypes.map((t) => ({ ...t })),
      requireLeadReview: true,
      slaMode: "manual",
      permissions: {
        leaders: { ...DEFAULT_LEADER_PERMS },
        members: { ...DEFAULT_MEMBER_PERMS },
        external: { ...DEFAULT_EXTERNAL_PERMS },
      },
    })) as Area[];
    setAreas(seeded);
    setExpanded(seeded[0]?.id ?? null);
    mark();
  };

  const toggleMember = (areaId: string, userId: string) => {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.id !== areaId) return a;
        const inArea = a.memberIds.includes(userId);
        return {
          ...a,
          memberIds: inArea ? a.memberIds.filter((m) => m !== userId) : [...a.memberIds, userId],
          leadIds: inArea ? a.leadIds.filter((l) => l !== userId) : a.leadIds,
        };
      }),
    );
    mark();
  };

  const toggleLead = (areaId: string, userId: string) => {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.id !== areaId) return a;
        const isLead = a.leadIds.includes(userId);
        return { ...a, leadIds: isLead ? a.leadIds.filter((l) => l !== userId) : [...a.leadIds, userId] };
      }),
    );
    mark();
  };

  const addType = (areaId: string) => {
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId
          ? { ...a, requestTypes: [...a.requestTypes, { id: uid(), name: "Nuevo tipo", slaHours: 24 }] }
          : a,
      ),
    );
    mark();
  };

  const patchType = (areaId: string, typeId: string, patch: Partial<{ name: string; slaHours: number }>) => {
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId
          ? { ...a, requestTypes: a.requestTypes.map((t) => (t.id === typeId ? { ...t, ...patch } : t)) }
          : a,
      ),
    );
    mark();
  };

  const removeType = (areaId: string, typeId: string) => {
    setAreas((prev) =>
      prev.map((a) =>
        a.id === areaId ? { ...a, requestTypes: a.requestTypes.filter((t) => t.id !== typeId) } : a,
      ),
    );
    mark();
  };

  const patchPerm = (areaId: string, scope: PermScope, key: keyof AreaPermissions, value: boolean) => {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.id !== areaId) return a;
        const perms = permsOf(a);
        // El permiso de edición sigue al de acceso: sin acceso no hay edición.
        const editKey = key.replace("canAccess", "canEdit") as keyof AreaPermissions;
        const hasEditTwin = key.startsWith("canAccess");
        return {
          ...a,
          permissions: {
            ...perms,
            [scope]: {
              ...perms[scope],
              [key]: value,
              ...(hasEditTwin && !value ? { [editKey]: false } : {}),
            },
          },
        };
      }),
    );
    mark();
  };

  const patchScope = (areaId: string, scope: PermScope, value: boolean) => {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.id !== areaId) return a;
        const perms = permsOf(a);
        const next = { ...perms[scope] };
        PERM_KEYS.forEach((p) => {
          (next as Record<string, boolean>)[p.key] = value;
          if (p.key.startsWith("canAccess")) {
            (next as Record<string, boolean>)[p.key.replace("canAccess", "canEdit")] = value;
          }
        });
        return { ...a, permissions: { ...perms, [scope]: next } };
      }),
    );
    mark();
  };

  // ── Guardado ──────────────────────────────────────────────────────────────

  const save = () => {
    const invalid = areas.find((a) => !a.name.trim());
    if (invalid) {
      showToast("error", "Todas las áreas necesitan un nombre.");
      setExpanded(invalid.id);
      return;
    }

    saveSettings.mutate(
      { areas, requireLeadReview },
      {
        onSuccess: () => {
          setDirty(false);
          setSaved(true);
          showToast("success", "Áreas y permisos guardados.");
        },
        onError: (error: Error) => showToast("error", error.message),
      },
    );
  };

  const discard = () => {
    setAreas(settings?.areas ?? []);
    setRequireLeadReview(settings?.requireLeadReview !== false);
    setDirty(false);
  };

  // Aviso del navegador si se intenta cerrar la pestaña con cambios pendientes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="w-5 h-5 text-[var(--fc-text-muted)] animate-spin" />
      </div>
    );
  }

  return (
    <SettingsStack>
      {/* ── Regla global ── */}
      <SettingsCard
        title="Áreas y flujos de trabajo"
        description="Un área agrupa a quién hace el trabajo, cuánto debe tardar (SLA) y a qué módulos accede. Ops, Publisher y Briefing leen esta configuración."
        icon={<Layers className="w-5 h-5 text-[var(--fc-accent)]" />}
        aside={
          areas.length > 0 ? (
            <div className="hidden sm:flex gap-2 text-[10px]">
              <span className="badge badge-cyan">{totals.areas} áreas</span>
              <span className="badge badge-muted">{totals.assigned} asignados</span>
            </div>
          ) : undefined
        }
      >
        <div className="max-w-2xl">
          <SettingsRow
            label="Revisión por líder obligatoria"
            description="Las tareas pasan por la aprobación de un líder antes de cerrarse. Puedes sobreescribirlo por área."
            last
          >
            <Toggle
              checked={requireLeadReview}
              onChange={(value) => {
                setRequireLeadReview(value);
                mark();
              }}
              disabled={!canEdit}
              label="Revisión por líder obligatoria"
            />
          </SettingsRow>
        </div>

        {unassigned.length > 0 && areas.length > 0 && (
          <div className="mt-4 p-3 rounded-xl border border-[var(--fc-warning)]/20 bg-[var(--fc-warning)]/5">
            <p className="text-[11px] text-[var(--fc-warning)] leading-relaxed">
              <strong>{unassigned.length}</strong>{" "}
              {unassigned.length === 1 ? "persona no está" : "personas no están"} en ningún área
              ({unassigned.slice(0, 4).map((m) => m.name).join(", ")}
              {unassigned.length > 4 ? "…" : ""}). Sin área, acceden a todo sin restricción.
            </p>
          </div>
        )}
      </SettingsCard>

      {/* ── Lista de áreas ── */}
      {areas.length === 0 ? (
        <SettingsCard>
          <SettingsEmpty
            icon={<Layers className="w-8 h-8" />}
            title="Aún no hay áreas configuradas."
            description="Empieza con la estructura habitual de una agencia y ajústala, o crea la tuya desde cero."
            action={
              canEdit ? (
                <>
                  <button onClick={seed} className="btn-primary">
                    Crear áreas sugeridas
                  </button>
                  <button onClick={addArea} className="btn-secondary">
                    Área en blanco
                  </button>
                </>
              ) : undefined
            }
          />
        </SettingsCard>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {areas.map((area) => {
              const isOpen = expanded === area.id;
              const tab = tabs[area.id] || "equipo";
              const perms = permsOf(area);

              return (
                <motion.div
                  key={area.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="rounded-xl overflow-hidden glass-panel"
                  style={{
                    border: `1px solid ${area.color}25`,
                    background: isOpen ? `${area.color}05` : undefined,
                  }}
                >
                  {/* Cabecera */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : area.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpanded(isOpen ? null : area.id);
                      }
                    }}
                    className="flex items-center gap-3 p-3.5 cursor-pointer select-none transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="shrink-0">
                      <ChevronDown className="w-4 h-4" style={{ color: area.color }} />
                    </motion.div>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: area.color }}
                    />
                    <span className="flex-1 text-[13px] font-semibold text-[var(--fc-text)] uppercase tracking-widest truncate">
                      {area.name || "Sin nombre"}
                    </span>

                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-[var(--fc-text-muted)] bg-[var(--fc-surface)] border border-[var(--hairline)] px-2 py-0.5 rounded-full whitespace-nowrap">
                        {area.memberIds.length} miembros
                      </span>
                      <span className="text-[10px] text-[var(--fc-text-muted)] bg-[var(--fc-surface)] border border-[var(--hairline)] px-2 py-0.5 rounded-full whitespace-nowrap">
                        {area.requestTypes.length} tipos
                      </span>
                      <span className="text-[10px] text-[var(--fc-text-muted)] font-medium whitespace-nowrap">
                        SLA {area.slaHours}h
                      </span>
                    </div>

                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeArea(area);
                        }}
                        title={`Eliminar ${area.name}`}
                        aria-label={`Eliminar área ${area.name}`}
                        className="p-1.5 rounded-md text-[var(--fc-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Cuerpo */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 border-t border-[var(--hairline)] bg-black/10 space-y-5">
                          {/* Identidad del área */}
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                              <label className="text-[10px] font-bold tracking-widest uppercase text-[var(--fc-text-muted)] mb-2 block">
                                Nombre
                              </label>
                              <input
                                value={area.name}
                                onChange={(e) => patchArea(area.id, { name: e.target.value })}
                                disabled={!canEdit}
                                aria-label="Nombre del área"
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold tracking-widest uppercase text-[var(--fc-text-muted)] mb-2 block">
                                SLA por defecto
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  value={area.slaHours}
                                  onChange={(e) =>
                                    patchArea(area.id, { slaHours: Number(e.target.value) || 1 })
                                  }
                                  disabled={!canEdit}
                                  aria-label="Horas de SLA del área"
                                  className={`${inputClass} !w-[90px]`}
                                />
                                <span className="text-xs text-[var(--fc-text-muted)]">horas</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold tracking-widest uppercase text-[var(--fc-text-muted)] mb-2 block">
                              Color
                            </label>
                            <div className="flex gap-1.5 flex-wrap">
                              {COLORS.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => canEdit && patchArea(area.id, { color: c })}
                                  disabled={!canEdit}
                                  aria-label={`Color ${c}`}
                                  aria-pressed={area.color === c}
                                  className="w-6 h-6 rounded-full transition-transform hover:scale-110 disabled:cursor-not-allowed"
                                  style={{
                                    background: c,
                                    border: area.color === c ? "2px solid var(--fc-text)" : "2px solid transparent",
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Pestañas */}
                          <div className="flex p-1 rounded-lg bg-[var(--surface-hover)] border border-[var(--fc-border)] w-full sm:w-fit">
                            {(
                              [
                                { id: "equipo", label: "Equipo", icon: Users },
                                { id: "solicitudes", label: "Tipos y SLA", icon: Timer },
                                { id: "permisos", label: "Permisos", icon: Shield },
                              ] as const
                            ).map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setTabs((prev) => ({ ...prev, [area.id]: t.id }))}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all relative"
                                style={{ color: tab === t.id ? "var(--fc-text)" : "var(--fc-text-muted)" }}
                              >
                                {tab === t.id && (
                                  <motion.div
                                    layoutId={`area-tab-${area.id}`}
                                    className="absolute inset-0 bg-[var(--fc-surface)] rounded-md border border-[var(--fc-border)] shadow-sm"
                                  />
                                )}
                                <t.icon className="w-3.5 h-3.5 relative z-10" />
                                <span className="relative z-10">{t.label}</span>
                              </button>
                            ))}
                          </div>

                          {/* Equipo */}
                          {tab === "equipo" && (
                            <div>
                              <p className="text-[11px] text-[var(--fc-text-muted)] mb-3 leading-relaxed">
                                Toca a una persona para sumarla al área. La estrella la marca como
                                líder: revisa y aprueba el trabajo del área.
                              </p>
                              {members.length === 0 ? (
                                <p className="text-[11px] text-[var(--fc-text-muted)]">
                                  Invita miembros al workspace para poder asignarlos.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {members.map((m) => {
                                    const inArea = area.memberIds.includes(m.id);
                                    const isLead = area.leadIds.includes(m.id);
                                    return (
                                      <div
                                        key={m.id}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors"
                                        style={{
                                          background: inArea ? `${area.color}15` : "var(--fc-surface)",
                                          border: `1px solid ${inArea ? `${area.color}45` : "var(--hairline)"}`,
                                          color: inArea ? "var(--fc-text)" : "var(--fc-text-muted)",
                                        }}
                                      >
                                        <button
                                          onClick={() => canEdit && toggleMember(area.id, m.id)}
                                          disabled={!canEdit}
                                          className="bg-transparent border-none cursor-pointer text-inherit flex items-center gap-1.5 p-0 disabled:cursor-not-allowed"
                                        >
                                          <span
                                            className="w-1.5 h-1.5 rounded-full shrink-0"
                                            style={{
                                              background:
                                                STATUS_COLORS[m.activityStatus || "offline"] ||
                                                "var(--fc-text-muted)",
                                            }}
                                            title={m.activityStatus || "offline"}
                                          />
                                          {m.name}
                                        </button>
                                        {inArea && (
                                          <button
                                            onClick={() => canEdit && toggleLead(area.id, m.id)}
                                            disabled={!canEdit}
                                            title={isLead ? "Quitar como líder" : "Marcar como líder"}
                                            aria-label={isLead ? `Quitar a ${m.name} como líder` : `Marcar a ${m.name} como líder`}
                                            className="bg-transparent border-none cursor-pointer p-0 flex ml-0.5 disabled:cursor-not-allowed"
                                          >
                                            <Star
                                              className="w-3 h-3"
                                              style={{
                                                color: isLead ? "var(--fc-warning)" : "var(--fc-border)",
                                                fill: isLead ? "var(--fc-warning)" : "none",
                                              }}
                                            />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {area.leadIds.length > 0 && (
                                <p className="text-[10px] text-[var(--fc-text-muted)] mt-2.5">
                                  Líderes: {area.leadIds.map(nameOf).join(", ")}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Tipos de solicitud */}
                          {tab === "solicitudes" && (
                            <div>
                              <p className="text-[11px] text-[var(--fc-text-muted)] mb-3 leading-relaxed">
                                Cada tipo de entregable puede tener su propio tiempo de respuesta. Si
                                una solicitud no indica tipo, se usa el SLA del área ({area.slaHours}h).
                              </p>
                              <div className="flex flex-col gap-2">
                                <AnimatePresence initial={false}>
                                  {area.requestTypes.map((t) => (
                                    <motion.div
                                      key={t.id}
                                      layout
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, scale: 0.96 }}
                                      className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-1.5 bg-[var(--fc-surface)] rounded-lg border border-[var(--hairline)]"
                                    >
                                      <input
                                        value={t.name}
                                        onChange={(e) => patchType(area.id, t.id, { name: e.target.value })}
                                        disabled={!canEdit}
                                        aria-label="Nombre del tipo de solicitud"
                                        className="flex-1 min-w-[120px] bg-transparent border-none text-[var(--fc-text-secondary)] text-xs px-2 outline-none focus:text-[var(--fc-text)]"
                                      />
                                      <label className="text-[10px] font-medium text-[var(--fc-text-muted)] flex items-center gap-1.5 shrink-0 px-2">
                                        SLA
                                        <input
                                          type="number"
                                          min={1}
                                          value={t.slaHours}
                                          onChange={(e) =>
                                            patchType(area.id, t.id, { slaHours: Number(e.target.value) || 1 })
                                          }
                                          disabled={!canEdit}
                                          aria-label={`Horas de SLA para ${t.name}`}
                                          className="w-[52px] bg-[var(--surface-hover)] border border-[var(--fc-border)] rounded text-[var(--fc-text-secondary)] text-xs px-1.5 py-0.5 outline-none focus:border-[var(--fc-accent)]"
                                        />
                                        h
                                      </label>
                                      {canEdit && (
                                        <button
                                          onClick={() => removeType(area.id, t.id)}
                                          aria-label={`Eliminar tipo ${t.name}`}
                                          className="text-[var(--fc-text-muted)] hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-md shrink-0 transition-colors"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                                {area.requestTypes.length === 0 && (
                                  <p className="text-[11px] text-[var(--fc-text-muted)] italic py-2">
                                    Sin tipos definidos: todo usa el SLA del área.
                                  </p>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={() => addType(area.id)}
                                    className="self-start inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--fc-accent)] hover:bg-[var(--fc-accent)]/10 p-1.5 rounded-md transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Agregar tipo de solicitud
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Permisos */}
                          {tab === "permisos" && (
                            <div className="space-y-5">
                              {SCOPE_META.map((scope) => {
                                const scopePerms = perms[scope.id] || defaultsFor(scope.id);
                                const activeCount = PERM_KEYS.filter((p) => scopePerms[p.key]).length;
                                const allActive = activeCount === PERM_KEYS.length;

                                return (
                                  <div
                                    key={scope.id}
                                    className="rounded-xl border border-[var(--hairline)] bg-[var(--fc-surface)]/40 overflow-hidden"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-b border-[var(--hairline)]">
                                      <div className="flex items-start gap-2.5 min-w-0">
                                        <scope.icon
                                          className="w-4 h-4 mt-0.5 shrink-0"
                                          style={{ color: scope.color }}
                                        />
                                        <div className="min-w-0">
                                          <div className="text-[13px] font-semibold text-[var(--fc-text)]">
                                            {scope.label}
                                            <span className="ml-2 text-[10px] font-normal text-[var(--fc-text-muted)]">
                                              {activeCount}/{PERM_KEYS.length} módulos
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-[var(--fc-text-muted)] mt-0.5 leading-relaxed">
                                            {scope.hint}
                                          </div>
                                        </div>
                                      </div>
                                      {canEdit && (
                                        <button
                                          onClick={() => patchScope(area.id, scope.id, !allActive)}
                                          className="btn-secondary !px-2.5 !py-1.5 !text-[11px] flex items-center gap-1.5 shrink-0 self-start"
                                        >
                                          {allActive ? (
                                            <>
                                              <Square className="w-3.5 h-3.5" /> Quitar todo
                                            </>
                                          ) : (
                                            <>
                                              <CheckSquare className="w-3.5 h-3.5" /> Activar todo
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
                                      {PERM_KEYS.map((p) => {
                                        const checked = scopePerms[p.key] ?? false;
                                        const Icon = p.icon;
                                        const sensitive = p.key === "canViewSensitiveAnalytics";
                                        return (
                                          <div
                                            key={p.key}
                                            className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[var(--fc-surface)] border border-[var(--hairline)]"
                                          >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <div
                                                className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                                                style={{
                                                  background: checked
                                                    ? sensitive
                                                      ? "rgba(226,68,92,0.12)"
                                                      : "rgba(59,130,246,0.1)"
                                                    : "rgba(255,255,255,0.05)",
                                                }}
                                              >
                                                <Icon
                                                  className="w-4 h-4"
                                                  style={{
                                                    color: checked
                                                      ? sensitive
                                                        ? "var(--fc-danger)"
                                                        : "var(--fc-accent)"
                                                      : "var(--fc-text-muted)",
                                                  }}
                                                />
                                              </div>
                                              <span
                                                className="text-xs truncate"
                                                style={{
                                                  color: checked
                                                    ? "var(--fc-text)"
                                                    : "var(--fc-text-secondary)",
                                                  fontWeight: checked ? 500 : 400,
                                                }}
                                              >
                                                {p.label}
                                              </span>
                                            </div>
                                            <Toggle
                                              size="sm"
                                              checked={checked}
                                              disabled={!canEdit}
                                              onChange={(value) =>
                                                patchPerm(area.id, scope.id, p.key, value)
                                              }
                                              label={`${p.label} para ${scope.label} en ${area.name}`}
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {canEdit && (
            <button
              onClick={addArea}
              className="btn-secondary flex items-center gap-1.5 self-start mt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar área
            </button>
          )}
        </div>
      )}

      {canEdit && (
        <SaveBar
          dirty={dirty}
          saving={saveSettings.isPending}
          saved={saved}
          onSave={save}
          onDiscard={discard}
        />
      )}
    </SettingsStack>
  );
}

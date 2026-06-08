"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, X, Star, Check, Loader2, ChevronDown, ChevronRight, Shield, Eye, EyeOff, Pencil } from "lucide-react";
import { SUGGESTED_AREAS, DEFAULT_MEMBER_PERMS, DEFAULT_EXTERNAL_PERMS, type Area, type RequestType } from "@/lib/workflow-config";

interface Member { id: string; name: string; activityStatus?: string }

const STATUS_COLORS: Record<string, string> = { disponible: "#00c875", ocupado: "#fdab3d", ausente: "#e2445c", offline: "#64748b" };

const COLORS = ["#0081FB", "#f472b6", "#06d6a0", "#7b61ff", "#fb923c", "#00d4ff", "#e2445c", "#fdab3d"];
const uid = () => Math.random().toString(36).slice(2, 9);

/* ── Permission defaults (imported from workflow-config) ── */
const DEFAULT_PERMS = DEFAULT_MEMBER_PERMS;
const EXTERNAL_PERMS = DEFAULT_EXTERNAL_PERMS;

const PERM_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  canViewTasks: { label: "Ver tareas", icon: Eye },
  canCreateTasks: { label: "Crear tareas", icon: Plus },
  canEditTasks: { label: "Editar tareas", icon: Pencil },
  canCloseTasks: { label: "Cerrar tareas", icon: Check },
  canViewAnalytics: { label: "Ver analytics", icon: Eye },
};

export function AreasManager({ members, canEdit }: { members: Member[]; canEdit: boolean }) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [requireLeadReview, setRequireLeadReview] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  // Collapsed state: all areas collapsed by default, track expanded ones
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/workspace/settings")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.areas)) setAreas(d.areas);
        setRequireLeadReview(d.requireLeadReview !== false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mark = () => { setDirty(true); setSavedAt(false); };

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        // Auto-collapse others if > 3 areas
        if (areas.length > 3) next.clear();
        next.add(id);
      }
      return next;
    });
  }, [areas.length]);

  const patchArea = (id: string, patch: Partial<Area>) => {
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a))); mark();
  };
  const addArea = () => {
    const newId = uid();
    setAreas((prev) => [...prev, {
      id: newId, name: "Nueva área", color: COLORS[prev.length % COLORS.length],
      slaHours: 24, slaMode: "manual", leadIds: [], memberIds: [], requestTypes: [],
      requireLeadReview: true,
      permissions: { members: { ...DEFAULT_PERMS }, external: { ...EXTERNAL_PERMS } },
    } as any]);
    setExpanded(new Set([newId]));
    mark();
  };
  const removeArea = (id: string) => { setAreas((prev) => prev.filter((a) => a.id !== id)); mark(); };
  const seed = () => {
    const seeded = SUGGESTED_AREAS.map((a) => ({
      ...a, leadIds: [], memberIds: [],
      requestTypes: a.requestTypes.map((t) => ({ ...t })),
      requireLeadReview: true, slaMode: "manual",
      permissions: { members: { ...DEFAULT_PERMS }, external: { ...EXTERNAL_PERMS } },
    }));
    setAreas(seeded as any);
    setExpanded(new Set([seeded[0]?.id]));
    mark();
  };

  const toggleMember = (areaId: string, userId: string) => {
    setAreas((prev) => prev.map((a) => {
      if (a.id !== areaId) return a;
      const inArea = a.memberIds.includes(userId);
      return {
        ...a,
        memberIds: inArea ? a.memberIds.filter((m) => m !== userId) : [...a.memberIds, userId],
        leadIds: inArea ? a.leadIds.filter((l) => l !== userId) : a.leadIds,
      };
    })); mark();
  };
  const toggleLead = (areaId: string, userId: string) => {
    setAreas((prev) => prev.map((a) => {
      if (a.id !== areaId) return a;
      const isL = a.leadIds.includes(userId);
      return { ...a, leadIds: isL ? a.leadIds.filter((l) => l !== userId) : [...a.leadIds, userId] };
    })); mark();
  };

  const addType = (areaId: string) => {
    setAreas((prev) => prev.map((a) => a.id === areaId ? { ...a, requestTypes: [...a.requestTypes, { id: uid(), name: "Nuevo tipo", slaHours: 24 }] } : a)); mark();
  };
  const patchType = (areaId: string, typeId: string, patch: Partial<RequestType>) => {
    setAreas((prev) => prev.map((a) => a.id === areaId ? { ...a, requestTypes: a.requestTypes.map((t) => t.id === typeId ? { ...t, ...patch } : t) } : a)); mark();
  };
  const removeType = (areaId: string, typeId: string) => {
    setAreas((prev) => prev.map((a) => a.id === areaId ? { ...a, requestTypes: a.requestTypes.filter((t) => t.id !== typeId) } : a)); mark();
  };
  const patchPerm = (areaId: string, scope: "members" | "external", key: string, val: boolean) => {
    setAreas((prev) => prev.map((a) => {
      if (a.id !== areaId) return a;
      const perms = (a as any).permissions || { members: { ...DEFAULT_PERMS }, external: { ...EXTERNAL_PERMS } };
      return { ...a, permissions: { ...perms, [scope]: { ...perms[scope], [key]: val } } };
    })); mark();
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/workspace/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areas, requireLeadReview }),
      });
      if (r.ok) { setDirty(false); setSavedAt(true); }
      else { const d = await r.json(); alert(d.error || "No se pudo guardar"); }
    } catch { alert("Error de red al guardar"); }
    setSaving(false);
  };

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name || "—";

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 30 }}><Loader2 style={{ width: 22, height: 22, color: "#64748b", animation: "spin 1s linear infinite" }} /></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12, color: "#64748b" }}>
        Define las áreas de tu equipo (Paid Media, Diseño, Comunicación…), sus líderes, miembros y el SLA de entrega.
        Otras secciones (solicitudes, ETA de tareas) usan esta configuración.
      </p>

      {/* Require lead review — global */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>Revisión por líder obligatoria</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Las tareas deben pasar por revisión de un líder antes de cerrarse.</div>
        </div>
        <button onClick={() => { if (canEdit) { setRequireLeadReview((v) => !v); mark(); } }} disabled={!canEdit} role="switch" aria-checked={requireLeadReview} aria-label="Revisión por líder obligatoria"
          style={{ width: 40, height: 22, borderRadius: 11, flexShrink: 0, position: "relative", background: requireLeadReview ? "var(--cyan)" : "rgba(255,255,255,0.1)", border: "none", cursor: canEdit ? "pointer" : "default" }}>
          <span style={{ position: "absolute", top: 2, left: requireLeadReview ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
        </button>
      </div>

      {areas.length === 0 && (
        <div style={{ textAlign: "center", padding: 28, border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 8 }}>
          <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>Aún no hay áreas configuradas.</p>
          {canEdit && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={seed} className="btn-primary">Crear áreas sugeridas</button>
              <button onClick={addArea} style={ghostBtn}>+ Área en blanco</button>
            </div>
          )}
        </div>
      )}

      {/* ── Scrollable area list ── */}
      <div style={{ maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
        {areas.map((area) => {
          const isOpen = expanded.has(area.id);
          const areaPerms = (area as any).permissions || { members: { ...DEFAULT_PERMS }, external: { ...EXTERNAL_PERMS } };
          return (
            <div key={area.id} style={{ borderRadius: 10, border: `1px solid ${area.color}33`, background: `${area.color}06`, overflow: "hidden", transition: "all 0.2s" }}>
              {/* ── Collapsed header (always visible) ── */}
              <div
                onClick={() => toggleExpand(area.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", userSelect: "none" }}
              >
                {isOpen
                  ? <ChevronDown style={{ width: 14, height: 14, color: area.color, flexShrink: 0, transition: "transform 0.2s" }} />
                  : <ChevronRight style={{ width: 14, height: 14, color: area.color, flexShrink: 0, transition: "transform 0.2s" }} />}
                <div style={{ display: "flex", gap: 3 }}>
                  {COLORS.map((c) => (
                    <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, border: area.color === c ? "2px solid #fff" : "2px solid transparent", display: "inline-block" }} />
                  ))}
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#e2e8f0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{area.name}</span>
                {/* Collapsed summary chips */}
                {!isOpen && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#64748b", background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 10 }}>{area.memberIds.length} miembros</span>
                    <span style={{ fontSize: 10, color: "#64748b", background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 10 }}>{area.requestTypes.length} tipos</span>
                    <span style={{ fontSize: 10, color: "#64748b" }}>SLA {area.slaHours}h</span>
                  </div>
                )}
                <label style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  SLA
                  <input type="number" min={1} value={area.slaHours} onChange={(e) => patchArea(area.id, { slaHours: Number(e.target.value) || 1 })} disabled={!canEdit}
                    style={{ width: 52, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#e2e8f0", fontSize: 12, padding: "3px 6px", outline: "none" }} /> h
                </label>
                {canEdit && <button onClick={(e) => { e.stopPropagation(); removeArea(area.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(239,68,68,0.6)" }} title="Eliminar área"><Trash2 style={{ width: 15, height: 15 }} /></button>}
              </div>

              {/* ── Expanded content ── */}
              {isOpen && (
                <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid rgba(255,255,255,0.05)", animation: "fadeIn 0.2s ease-out" }}>
                  {/* Name edit */}
                  <div style={{ paddingTop: 10 }}>
                    <input value={area.name} onChange={(e) => patchArea(area.id, { name: e.target.value })} disabled={!canEdit} aria-label="Nombre del área"
                      style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, outline: "none", color: "#e2e8f0", fontSize: 14, fontWeight: 600, padding: "8px 10px" }} />
                  </div>

                  {/* Members + leads */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b", marginBottom: 8 }}>Miembros y líderes (★)</div>
                    {members.length === 0 ? (
                      <p style={{ fontSize: 11, color: "#64748b" }}>Invita miembros al workspace para asignarlos.</p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {members.map((m) => {
                          const inArea = area.memberIds.includes(m.id);
                          const isL = area.leadIds.includes(m.id);
                          return (
                            <div key={m.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 14, fontSize: 12,
                              background: inArea ? `${area.color}18` : "rgba(255,255,255,0.03)",
                              border: `1px solid ${inArea ? `${area.color}45` : "rgba(255,255,255,0.08)"}`,
                              color: inArea ? "#e2e8f0" : "#94a3b8" }}>
                              <button onClick={() => canEdit && toggleMember(area.id, m.id)} disabled={!canEdit} style={{ background: "none", border: "none", cursor: canEdit ? "pointer" : "default", color: "inherit", fontFamily: "inherit", fontSize: 12, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLORS[m.activityStatus || "offline"] || "#64748b", flexShrink: 0 }} title={m.activityStatus || "offline"} />
                                {m.name}
                              </button>
                              {inArea && (
                                <button onClick={() => canEdit && toggleLead(area.id, m.id)} disabled={!canEdit} title={isL ? "Quitar como líder" : "Marcar como líder"}
                                  style={{ background: "none", border: "none", cursor: canEdit ? "pointer" : "default", padding: 0, display: "flex" }}>
                                  <Star style={{ width: 12, height: 12, color: isL ? "#fbbf24" : "rgba(148,163,184,0.4)", fill: isL ? "#fbbf24" : "none" }} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {area.leadIds.length > 0 && <p style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>Líderes: {area.leadIds.map(nameOf).join(", ")}</p>}
                  </div>

                  {/* Request types */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b", marginBottom: 8 }}>Tipos de solicitud</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {area.requestTypes.map((t) => (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input value={t.name} onChange={(e) => patchType(area.id, t.id, { name: e.target.value })} disabled={!canEdit} aria-label="Nombre del tipo de solicitud"
                            style={{ flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#e2e8f0", fontSize: 12, padding: "5px 8px", outline: "none" }} />
                          <label style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                            <input type="number" min={1} value={t.slaHours} onChange={(e) => patchType(area.id, t.id, { slaHours: Number(e.target.value) || 1 })} disabled={!canEdit}
                              style={{ width: 52, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#e2e8f0", fontSize: 12, padding: "3px 6px", outline: "none" }} /> h
                          </label>
                          {canEdit && <button onClick={() => removeType(area.id, t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(148,163,184,0.4)" }}><X style={{ width: 13, height: 13 }} /></button>}
                        </div>
                      ))}
                      {canEdit && <button onClick={() => addType(area.id)} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#00d4ff", background: "none", border: "none", cursor: "pointer", padding: 0 }}><Plus style={{ width: 12, height: 12 }} /> Tipo de solicitud</button>}
                    </div>
                  </div>

                  {/* ── Permissions (granular) ── */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <Shield style={{ width: 12, height: 12 }} /> Permisos
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {/* Members perms */}
                      <div style={{ padding: 10, borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>Miembros del área</div>
                        {Object.entries(PERM_LABELS).map(([key, { label }]) => {
                          const val = areaPerms.members?.[key] ?? DEFAULT_PERMS[key as keyof typeof DEFAULT_PERMS];
                          return (
                            <PermToggle key={key} label={label} checked={val} onChange={(v) => patchPerm(area.id, "members", key, v)} canEdit={canEdit} />
                          );
                        })}
                      </div>
                      {/* External perms */}
                      <div style={{ padding: 10, borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>Usuarios externos</div>
                        {Object.entries(PERM_LABELS).map(([key, { label }]) => {
                          const val = areaPerms.external?.[key] ?? EXTERNAL_PERMS[key as keyof typeof EXTERNAL_PERMS];
                          return (
                            <PermToggle key={key} label={label} checked={val} onChange={(v) => patchPerm(area.id, "external", key, v)} canEdit={canEdit} />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      {canEdit && areas.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button onClick={addArea} style={ghostBtn}><Plus style={{ width: 13, height: 13 }} /> Agregar área</button>
          <div style={{ flex: 1 }} />
          {savedAt && !dirty && <span style={{ fontSize: 11, color: "#06d6a0", display: "inline-flex", alignItems: "center", gap: 4 }}><Check style={{ width: 13, height: 13 }} /> Guardado</span>}
          <button onClick={save} disabled={!dirty || saving} className="btn-primary" style={{ opacity: !dirty || saving ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
            {saving ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : null}
            Guardar cambios
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Permission toggle ── */
function PermToggle({ label, checked, onChange, canEdit }: { label: string; checked: boolean; onChange: (v: boolean) => void; canEdit: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ fontSize: 11, color: checked ? "#e2e8f0" : "#64748b" }}>{label}</span>
      <button
        onClick={() => canEdit && onChange(!checked)}
        disabled={!canEdit}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        style={{ width: 28, height: 16, borderRadius: 8, position: "relative", background: checked ? "#00d4ff" : "rgba(255,255,255,0.1)", border: "none", cursor: canEdit ? "pointer" : "default", flexShrink: 0, transition: "background 0.2s" }}
      >
        <span style={{ position: "absolute", top: 2, left: checked ? 14 : 2, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
      </button>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#e2e8f0", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
};

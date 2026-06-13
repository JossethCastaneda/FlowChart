"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, X, Star, Check, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { SUGGESTED_AREAS, DEFAULT_MEMBER_PERMS, DEFAULT_EXTERNAL_PERMS, DEFAULT_LEADER_PERMS, type Area, type RequestType } from "@/lib/workflow-config";

interface Member { id: string; name: string; activityStatus?: string }

const STATUS_COLORS: Record<string, string> = { disponible: "#00c875", ocupado: "#fdab3d", ausente: "#e2445c", offline: "#64748b" };

const COLORS = ["#0081FB", "#f472b6", "#06d6a0", "#7b61ff", "#fb923c", "#00d4ff", "#e2445c", "#fdab3d"];
const uid = () => Math.random().toString(36).slice(2, 9);

/* ── Permission defaults ── */
const DEFAULT_PERMS = DEFAULT_MEMBER_PERMS;
const EXTERNAL_PERMS = DEFAULT_EXTERNAL_PERMS;

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
      permissions: { leaders: { ...DEFAULT_LEADER_PERMS }, members: { ...DEFAULT_PERMS }, external: { ...EXTERNAL_PERMS } },
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
      permissions: { leaders: { ...DEFAULT_LEADER_PERMS }, members: { ...DEFAULT_PERMS }, external: { ...EXTERNAL_PERMS } },
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 md:p-4 rounded-lg bg-white/5 border border-white/5">
        <div>
          <div className="text-[13px] text-slate-200 font-medium">Revisión por líder obligatoria</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Las tareas deben pasar por revisión de un líder antes de cerrarse.</div>
        </div>
        <button onClick={() => { if (canEdit) { setRequireLeadReview((v) => !v); mark(); } }} disabled={!canEdit} role="switch" aria-checked={requireLeadReview} aria-label="Revisión por líder obligatoria"
          className="w-10 h-5.5 rounded-full shrink-0 relative transition-colors duration-200"
          style={{ background: requireLeadReview ? "var(--cyan)" : "rgba(255,255,255,0.1)", cursor: canEdit ? "pointer" : "default" }}>
          <span className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all duration-200" style={{ left: requireLeadReview ? 20 : 2 }} />
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
      <div style={{ maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4, scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>
        {areas.map((area) => {
          const isOpen = expanded.has(area.id);
          return (
            <div key={area.id} style={{ borderRadius: 10, border: `1px solid ${area.color}33`, background: `${area.color}06`, overflow: "hidden", transition: "all 0.2s" }}>
              {/* ── Collapsed header (always visible) ── */}
              <div
                onClick={() => toggleExpand(area.id)}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-2.5 p-3 md:p-3.5 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-hidden">
                  {isOpen
                    ? <ChevronDown style={{ width: 14, height: 14, color: area.color, flexShrink: 0, transition: "transform 0.2s" }} />
                    : <ChevronRight style={{ width: 14, height: 14, color: area.color, flexShrink: 0, transition: "transform 0.2s" }} />}
                  <div className="hidden md:flex gap-0.5">
                    {COLORS.map((c) => (
                      <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, border: area.color === c ? "2px solid #fff" : "2px solid transparent", display: "inline-block" }} />
                    ))}
                  </div>
                  <span className="flex-1 text-[13px] font-semibold text-slate-200 uppercase tracking-widest truncate">{area.name}</span>
                </div>

                <div className="flex items-center gap-2 ml-6 sm:ml-0 w-full sm:w-auto overflow-x-auto scrollbar-hide pb-1 sm:pb-0 shrink-0">
                  {/* Collapsed summary chips */}
                  {!isOpen && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full whitespace-nowrap">{area.memberIds.length} miembros</span>
                      <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full whitespace-nowrap">{area.requestTypes.length} tipos</span>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">SLA {area.slaHours}h</span>
                    </div>
                  )}
                  {isOpen && (
                    <label className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      SLA
                      <input type="number" min={1} value={area.slaHours} onChange={(e) => patchArea(area.id, { slaHours: Number(e.target.value) || 1 })} disabled={!canEdit}
                        className="w-[52px] bg-black/20 border border-white/10 rounded text-slate-200 text-xs px-1.5 py-0.5 outline-none" /> h
                    </label>
                  )}
                  {canEdit && <button onClick={(e) => { e.stopPropagation(); removeArea(area.id); }} className="bg-transparent border-none cursor-pointer text-red-500/60 hover:text-red-500 ml-auto sm:ml-2" title="Eliminar área"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>

              {/* ── Expanded content (internal scroll) ── */}
              {isOpen && (
                <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid rgba(255,255,255,0.05)", animation: "fadeIn 0.2s ease-out", maxHeight: 340, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent" }}>
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
                        <div key={t.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 p-2 sm:p-0 bg-white/5 sm:bg-transparent rounded-md border border-white/5 sm:border-none">
                          <input value={t.name} onChange={(e) => patchType(area.id, t.id, { name: e.target.value })} disabled={!canEdit} aria-label="Nombre del tipo de solicitud"
                            className="flex-1 min-w-[120px] bg-black/20 border border-white/10 rounded text-slate-200 text-xs px-2 py-1.5 outline-none" />
                          <label className="text-[11px] text-slate-500 flex items-center gap-1.5 shrink-0">
                            SLA
                            <input type="number" min={1} value={t.slaHours} onChange={(e) => patchType(area.id, t.id, { slaHours: Number(e.target.value) || 1 })} disabled={!canEdit}
                              className="w-[52px] bg-black/20 border border-white/10 rounded text-slate-200 text-xs px-1.5 py-1 outline-none" /> h
                          </label>
                          {canEdit && <button onClick={() => removeType(area.id, t.id)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-red-500 shrink-0"><X className="w-4 h-4" /></button>}
                        </div>
                      ))}
                      {canEdit && <button onClick={() => addType(area.id)} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#00d4ff", background: "none", border: "none", cursor: "pointer", padding: 0 }}><Plus style={{ width: 12, height: 12 }} /> Tipo de solicitud</button>}
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


const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#e2e8f0", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
};

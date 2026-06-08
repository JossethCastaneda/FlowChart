"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Check, Loader2, Eye, Plus, Pencil, Lock } from "lucide-react";
import { DEFAULT_MEMBER_PERMS, DEFAULT_EXTERNAL_PERMS, type Area, type AreaPermissions } from "@/lib/workflow-config";

const PERM_KEYS: { key: keyof AreaPermissions; label: string; desc: string; icon: React.ElementType }[] = [
  { key: "canViewTasks", label: "Ver tareas", desc: "Visualizar tareas del área", icon: Eye },
  { key: "canCreateTasks", label: "Crear tareas", desc: "Crear nuevas tareas o solicitudes", icon: Plus },
  { key: "canEditTasks", label: "Editar tareas", desc: "Modificar estado, asignado, prioridad", icon: Pencil },
  { key: "canCloseTasks", label: "Cerrar tareas", desc: "Marcar tareas como completadas", icon: Check },
  { key: "canViewAnalytics", label: "Ver analytics", desc: "Acceder a métricas del área", icon: Eye },
];

export function PermissionsManager() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [requireLeadReview, setRequireLeadReview] = useState(true);

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

  const patchPerm = (areaId: string, scope: "members" | "external", key: keyof AreaPermissions, val: boolean) => {
    setAreas((prev) => prev.map((a) => {
      if (a.id !== areaId) return a;
      const perms = a.permissions || { members: { ...DEFAULT_MEMBER_PERMS }, external: { ...DEFAULT_EXTERNAL_PERMS } };
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

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>
      <Loader2 style={{ width: 22, height: 22, color: "#64748b", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (areas.length === 0) return (
    <div style={{ textAlign: "center", padding: 32 }}>
      <Shield style={{ width: 32, height: 32, color: "#64748b", margin: "0 auto 12px" }} />
      <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 4 }}>No hay áreas configuradas todavía.</p>
      <p style={{ fontSize: 11, color: "#64748b" }}>Ve a <strong>Áreas y flujos</strong> para crear áreas primero.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
        Controla qué pueden hacer los <strong>miembros</strong> de cada área y qué pueden hacer los <strong>usuarios externos</strong> (de otras áreas) con respecto a cada departamento.
      </p>

      {/* Info box: Leads + OWNER/ADMIN always have full access */}
      <div style={{
        padding: "10px 14px", borderRadius: 8,
        background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)",
        fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 8,
      }}>
        <Lock style={{ width: 13, height: 13, color: "#00d4ff", flexShrink: 0 }} />
        <span>Los <strong style={{ color: "#e2e8f0" }}>Líderes de área</strong>, <strong style={{ color: "#e2e8f0" }}>Owners</strong> y <strong style={{ color: "#e2e8f0" }}>Admins</strong> siempre tienen acceso completo, sin importar estos permisos.</span>
      </div>

      {/* Permissions table per area */}
      {areas.map((area) => {
        const perms = area.permissions || { members: { ...DEFAULT_MEMBER_PERMS }, external: { ...DEFAULT_EXTERNAL_PERMS } };
        return (
          <div key={area.id} style={{ borderRadius: 10, border: `1px solid ${area.color}25`, overflow: "hidden" }}>
            {/* Area header */}
            <div style={{
              padding: "10px 16px", background: `${area.color}0a`,
              borderBottom: `1px solid ${area.color}18`,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: area.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {area.name}
              </span>
              <span style={{ fontSize: 10, color: "#64748b" }}>
                {area.memberIds.length} miembros · {area.leadIds.length} líderes
              </span>
            </div>

            {/* Permissions grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              {/* Column headers */}
              <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em" }}>
                  👤 Miembros del área
                </div>
                <div style={{ fontSize: 10, color: "#4a5568", marginTop: 2 }}>Personas asignadas a esta área</div>
              </div>
              <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em" }}>
                  🌐 Usuarios externos
                </div>
                <div style={{ fontSize: 10, color: "#4a5568", marginTop: 2 }}>Personas de otras áreas</div>
              </div>

              {/* Permission rows — Members column */}
              <div style={{ borderRight: "1px solid rgba(255,255,255,0.05)", padding: "6px 12px" }}>
                {PERM_KEYS.map((p) => (
                  <PermRow key={p.key} perm={p} checked={perms.members[p.key]} onChange={(v) => patchPerm(area.id, "members", p.key, v)} />
                ))}
              </div>

              {/* Permission rows — External column */}
              <div style={{ padding: "6px 12px" }}>
                {PERM_KEYS.map((p) => (
                  <PermRow key={p.key} perm={p} checked={perms.external[p.key]} onChange={(v) => patchPerm(area.id, "external", p.key, v)} />
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
        {savedAt && !dirty && <span style={{ fontSize: 11, color: "#06d6a0", display: "inline-flex", alignItems: "center", gap: 4 }}><Check style={{ width: 13, height: 13 }} /> Guardado</span>}
        <button onClick={save} disabled={!dirty || saving} className="btn-primary" style={{ opacity: !dirty || saving ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
          {saving ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Shield style={{ width: 13, height: 13 }} />}
          Guardar permisos
        </button>
      </div>
    </div>
  );
}

/* ── Single permission row with toggle ── */
function PermRow({ perm, checked, onChange }: {
  perm: { key: string; label: string; desc: string; icon: React.ElementType };
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      padding: "7px 4px", borderBottom: "1px solid rgba(255,255,255,0.03)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
        <span style={{ fontSize: 12, color: checked ? "#e2e8f0" : "#4a5568", fontWeight: checked ? 500 : 400 }}>{perm.label}</span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        aria-label={perm.label}
        style={{
          width: 32, height: 18, borderRadius: 9, position: "relative",
          background: checked ? "#00d4ff" : "rgba(255,255,255,0.08)",
          border: "none", cursor: "pointer", flexShrink: 0, transition: "background 0.2s",
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: checked ? 16 : 2,
          width: 14, height: 14, borderRadius: "50%", background: "#fff",
          transition: "left 0.15s",
        }} />
      </button>
    </div>
  );
}

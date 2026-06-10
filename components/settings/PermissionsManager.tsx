"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Check, Loader2, Zap, Calendar, MessageCircle, Megaphone, BarChart3, Target, Lock } from "lucide-react";
import { DEFAULT_MEMBER_PERMS, DEFAULT_EXTERNAL_PERMS, type Area, type AreaPermissions } from "@/lib/workflow-config";

const PERM_KEYS: { key: keyof AreaPermissions; label: string; desc: string; icon: React.ElementType }[] = [
  { key: "canAccessOps", label: "Ops (Gestión)", desc: "Acceso al módulo de Tareas y SLA", icon: Zap },
  { key: "canAccessPublisher", label: "Publisher", desc: "Planificador de contenido", icon: Calendar },
  { key: "canAccessInbox", label: "Inbox", desc: "Gestor de mensajes y comentarios", icon: MessageCircle },
  { key: "canAccessAds", label: "Ads Manager", desc: "Gestión de pauta publicitaria", icon: Megaphone },
  { key: "canAccessAnalytics", label: "Analytics", desc: "Métricas y reportes", icon: BarChart3 },
  { key: "canAccessBriefing", label: "Briefing", desc: "Documentos estratégicos", icon: Target },
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
        Controla a qué <strong>módulos</strong> pueden acceder los <strong>miembros</strong> de cada área y los <strong>usuarios externos</strong>.
      </p>

      {/* Info box: Leads + OWNER/ADMIN always have full access */}
      <div className="p-3 rounded-lg bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.12)] text-[11px] text-slate-400 flex items-start sm:items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-[#00d4ff] shrink-0 mt-0.5 sm:mt-0" />
        <span>Los <strong className="text-slate-200">Líderes de área</strong>, <strong className="text-slate-200">Owners</strong> y <strong className="text-slate-200">Admins</strong> siempre tienen acceso completo, sin importar estos permisos.</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Members column */}
              <div className="flex flex-col border-b md:border-b-0 md:border-r border-white/5">
                <div className="p-3 bg-black/10 border-b border-white/5">
                  <div className="text-[11px] font-bold text-slate-400 tracking-widest">👤 Miembros del área</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Personas asignadas a esta área</div>
                </div>
                <div className="p-2 sm:p-3">
                  {PERM_KEYS.map((p) => (
                    <PermRow key={p.key} perm={p} checked={perms.members[p.key]} onChange={(v) => patchPerm(area.id, "members", p.key, v)} />
                  ))}
                </div>
              </div>

              {/* External column */}
              <div className="flex flex-col">
                <div className="p-3 bg-black/10 border-b border-white/5">
                  <div className="text-[11px] font-bold text-slate-400 tracking-widest">🌐 Usuarios externos</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Personas de otras áreas</div>
                </div>
                <div className="p-2 sm:p-3">
                  {PERM_KEYS.map((p) => (
                    <PermRow key={p.key} perm={p} checked={perms.external[p.key]} onChange={(v) => patchPerm(area.id, "external", p.key, v)} />
                  ))}
                </div>
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
    <div className="flex items-center justify-between gap-2 py-2 px-1 border-b border-white/5 last:border-none">
      <div className="flex flex-col flex-1 min-w-0">
        <span className={`text-[12px] ${checked ? "text-slate-200 font-medium" : "text-slate-500 font-normal"}`}>{perm.label}</span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        aria-label={perm.label}
        className="w-8 h-4.5 rounded-full relative shrink-0 transition-colors duration-200"
        style={{ background: checked ? "#00d4ff" : "rgba(255,255,255,0.08)" }}
      >
        <span className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all duration-150" style={{ left: checked ? 16 : 2 }} />
      </button>
    </div>
  );
}

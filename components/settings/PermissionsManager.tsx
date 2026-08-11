"use client";

import { useState, useEffect } from "react";
import { Shield, Check, Loader2, Zap, Calendar, MessageCircle, Megaphone, BarChart3, Target, ChevronDown, ChevronRight, CheckSquare, Square } from "lucide-react";
import { DEFAULT_MEMBER_PERMS, DEFAULT_LEADER_PERMS, DEFAULT_EXTERNAL_PERMS, type Area, type AreaPermissions } from "@/lib/workflow-config";

const PERM_KEYS: { key: keyof AreaPermissions; label: string; icon: React.ElementType }[] = [
  { key: "canAccessOps",       label: "Ops (Gestión)",  icon: Zap },
  { key: "canAccessPublisher", label: "Publisher",       icon: Calendar },
  { key: "canAccessInbox",     label: "Inbox",           icon: MessageCircle },
  { key: "canAccessAds",       label: "Ads Manager",     icon: Megaphone },
  { key: "canAccessAnalytics", label: "Analytics",       icon: BarChart3 },
  { key: "canViewSensitiveAnalytics", label: "PII sensible (Analytics)", icon: BarChart3 },
  { key: "canAccessBriefing",  label: "Briefing",        icon: Target },
];

type PermScope = "leaders" | "members" | "external";



export function PermissionsManager() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [requireLeadReview, setRequireLeadReview] = useState(true);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

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

  const defaultsFor = (scope: PermScope): AreaPermissions =>
    scope === "leaders" ? DEFAULT_LEADER_PERMS
    : scope === "members" ? DEFAULT_MEMBER_PERMS
    : DEFAULT_EXTERNAL_PERMS;

  const patchPerm = (areaId: string, scope: PermScope, key: keyof AreaPermissions, val: boolean) => {
    setAreas((prev) => prev.map((a) => {
      if (a.id !== areaId) return a;
      const perms = a.permissions || {
        leaders:  { ...DEFAULT_LEADER_PERMS },
        members:  { ...DEFAULT_MEMBER_PERMS },
        external: { ...DEFAULT_EXTERNAL_PERMS },
      };
      return { ...a, permissions: { ...perms, [scope]: { ...perms[scope], [key]: val } } };
    })); mark();
  };

  const patchScope = (areaId: string, scope: PermScope, val: boolean) => {
    setAreas((prev) => prev.map((a) => {
      if (a.id !== areaId) return a;
      const perms = a.permissions || {
        leaders:  { ...DEFAULT_LEADER_PERMS },
        members:  { ...DEFAULT_MEMBER_PERMS },
        external: { ...DEFAULT_EXTERNAL_PERMS },
      };
      const newScopePerms = { ...perms[scope] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      PERM_KEYS.forEach(p => { (newScopePerms as any)[p.key] = val; });
      return { ...a, permissions: { ...perms, [scope]: newScopePerms } };
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
      <Loader2 style={{ width: 22, height: 22, color: "var(--fc-text-muted)", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (areas.length === 0) return (
    <div style={{ textAlign: "center", padding: 32 }}>
      <Shield style={{ width: 32, height: 32, color: "var(--fc-text-muted)", margin: "0 auto 12px" }} />
      <p style={{ fontSize: 13, color: "var(--fc-text-secondary)", marginBottom: 4 }}>No hay áreas configuradas todavía.</p>
      <p style={{ fontSize: 11, color: "var(--fc-text-muted)" }}>Ve a <strong>Áreas y flujos</strong> para crear áreas primero.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ fontSize: 12, color: "var(--fc-text-muted)", margin: 0 }}>
        Controla a qué <strong>módulos</strong> pueden acceder los <strong>miembros</strong> de cada área.{" "}
        <span style={{ color: "var(--fc-text-secondary)" }}>Líderes, Owners y Admins siempre tienen acceso total a sus áreas.</span>
      </p>

      {/* Permissions table per area */}
      {areas.map((area) => {
        const perms = area.permissions || {
          leaders:  { ...DEFAULT_LEADER_PERMS },
          members:  { ...DEFAULT_MEMBER_PERMS },
          external: { ...DEFAULT_EXTERNAL_PERMS },
        };
        const isExpanded = expandedArea === area.id;
        
        // Helper check for default
        const isDefault = JSON.stringify(perms) === JSON.stringify({ leaders: DEFAULT_LEADER_PERMS, members: DEFAULT_MEMBER_PERMS, external: DEFAULT_EXTERNAL_PERMS });

        return (
          <div key={area.id} style={{ borderRadius: 12, border: `1px solid ${area.color}25`, overflow: "hidden", background: isExpanded ? "transparent" : "rgba(255,255,255,0.01)", transition: "all 0.2s ease-in-out" }}>
            {/* Area header (Accordion trigger) */}
            <div 
              onClick={() => setExpandedArea(isExpanded ? null : area.id)}
              style={{
                padding: "12px 16px", background: isExpanded ? `${area.color}10` : "transparent",
                borderBottom: isExpanded ? `1px solid ${area.color}18` : "none",
                display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                transition: "background 0.2s ease-in-out"
              }}>
              {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--fc-text-secondary)] shrink-0" /> : <ChevronRight className="w-4 h-4 text-[var(--fc-text-secondary)] shrink-0" />}
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: area.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fc-text)", textTransform: "uppercase", letterSpacing: "0.05em", flex: 1 }}>
                {area.name}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {isDefault && <span style={{ fontSize: 10, color: "var(--fc-text-secondary)", fontStyle: "italic", border: "1px solid var(--hairline)", padding: "2px 6px", borderRadius: 4 }}>Defaults</span>}
                <span style={{ fontSize: 10, color: "var(--fc-text-muted)" }}>
                  {area.memberIds.length} miembros · {area.leadIds.length} líderes
                </span>
              </div>
            </div>

            {/* Expandable Content (Members Only) */}
            {isExpanded && (() => {
              const scopeId = "members" as PermScope;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
              const scopePerms = (perms as any)[scopeId] as AreaPermissions | undefined;
              const effectivePerms = scopePerms || defaultsFor(scopeId);
              
              let activeCount = 0;
              PERM_KEYS.forEach(p => { if (effectivePerms[p.key]) activeCount++; });
              const allActive = activeCount === PERM_KEYS.length;
              const noneActive = activeCount === 0;

              return (
                <div style={{ padding: "16px", animation: "fadeIn 0.2s ease-out" }}>
                  {/* Header & Batch Actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, border: "1px solid var(--hairline)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fc-accent)", letterSpacing: "0.02em" }}>
                         Permisos de Integrantes
                      </div>
                      <div style={{ fontSize: 11, color: "var(--fc-text-secondary)", marginTop: 4 }}>
                        Aplica a todos los miembros asignados a esta área. Los líderes tienen acceso total por defecto.
                      </div>
                    </div>
                    {/* Batch Action Buttons */}
                    <div style={{ display: "flex", gap: 8 }}>
                       {!allActive && (
                         <button onClick={() => patchScope(area.id, scopeId, true)} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                           <CheckSquare className="w-3.5 h-3.5" /> Activar todos
                         </button>
                       )}
                       {!noneActive && (
                         <button onClick={() => patchScope(area.id, scopeId, false)} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                           <Square className="w-3.5 h-3.5" /> Desactivar todos
                         </button>
                       )}
                    </div>
                  </div>

                  {/* Permissions Grid (2 columns for better space usage) */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
                    {PERM_KEYS.map((p) => {
                      const checked = effectivePerms[p.key] ?? false;
                      const Icon = p.icon;
                      return (
                        <div key={p.key} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 12px", borderRadius: 8, background: "var(--fc-surface)",
                          border: "1px solid var(--hairline)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: checked ? "rgba(59,130,246, 0.1)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Icon className="w-4 h-4" style={{ color: checked ? "var(--fc-accent)" : "var(--fc-text-muted)" }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 12, color: checked ? "var(--fc-text)" : "var(--fc-text-secondary)", fontWeight: checked ? 500 : 400 }}>
                                {p.label}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => patchPerm(area.id, scopeId, p.key, !checked)}
                            role="switch"
                            aria-checked={checked}
                            style={{
                              width: 36, height: 20, borderRadius: 10, border: "none",
                              background: checked ? "var(--fc-accent)" : "rgba(255,255,255,0.1)",
                              cursor: "pointer", position: "relative", flexShrink: 0,
                              transition: "background 0.2s",
                            }}
                          >
                            <span style={{
                              position: "absolute", top: 2,
                              left: checked ? 18 : 2,
                              width: 16, height: 16, borderRadius: "50%", background: "var(--fc-surface)",
                              transition: "left 0.15s",
                            }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
        {savedAt && !dirty && (
          <span style={{ fontSize: 11, color: "var(--fc-success)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Check style={{ width: 13, height: 13 }} /> Guardado
          </span>
        )}
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="btn-primary"
          style={{ opacity: !dirty || saving ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {saving
            ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
            : <Shield style={{ width: 13, height: 13 }} />
          }
          Guardar permisos
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Shield, Check, Loader2, Zap, Calendar, MessageCircle, Megaphone, BarChart3, Target } from "lucide-react";
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

const SCOPES: { id: PermScope; emoji: string; label: string; sub: string; color: string }[] = [
  { id: "leaders",  emoji: "⭐", label: "Líderes",          sub: "Líderes del área",          color: "#f59e0b" },
  { id: "members",  emoji: "👤", label: "Miembros",          sub: "Asignados al área",          color: "#00d4ff" },
  { id: "external", emoji: "🌐", label: "Externos",          sub: "Personas de otras áreas",    color: "#64748b" },
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
        Controla a qué <strong>módulos</strong> pueden acceder los <strong>líderes</strong>, <strong>miembros</strong> de cada área y los <strong>usuarios externos</strong>.{" "}
        <span style={{ color: "#475569" }}>Solo Owners y Admins siempre tienen acceso completo.</span>
      </p>

      {/* Permissions table per area */}
      {areas.map((area) => {
        const perms = area.permissions || {
          leaders:  { ...DEFAULT_LEADER_PERMS },
          members:  { ...DEFAULT_MEMBER_PERMS },
          external: { ...DEFAULT_EXTERNAL_PERMS },
        };
        return (
          <div key={area.id} style={{ borderRadius: 12, border: `1px solid ${area.color}25`, overflow: "hidden" }}>
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

            {/* 3-column permissions grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
              {SCOPES.map((scope, si) => {
                const scopePerms = (perms as any)[scope.id] as AreaPermissions | undefined;
                const effectivePerms = scopePerms || defaultsFor(scope.id);
                return (
                  <div key={scope.id} style={{
                    display: "flex", flexDirection: "column",
                    borderRight: si < SCOPES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}>
                    {/* Column header */}
                    <div style={{ padding: "10px 12px", background: "rgba(0,0,0,0.12)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: scope.color, letterSpacing: "0.04em" }}>
                        {scope.emoji} {scope.label}
                      </div>
                      <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>{scope.sub}</div>
                    </div>
                    {/* Permission rows */}
                    <div style={{ padding: "4px 8px" }}>
                      {PERM_KEYS.map((p) => {
                        const checked = effectivePerms[p.key] ?? false;
                        return (
                          <div key={p.key} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            gap: 6, padding: "6px 4px",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                            className="last:border-none"
                          >
                            <span style={{ fontSize: 11, color: checked ? "#e2e8f0" : "#475569", fontWeight: checked ? 500 : 400, flex: 1 }}>
                              {p.label}
                            </span>
                            <button
                              onClick={() => patchPerm(area.id, scope.id, p.key, !checked)}
                              role="switch"
                              aria-checked={checked}
                              aria-label={`${scope.label} - ${p.label}`}
                              style={{
                                width: 30, height: 16, borderRadius: 8, border: "none",
                                background: checked ? scope.color : "rgba(255,255,255,0.08)",
                                cursor: "pointer", position: "relative", flexShrink: 0,
                                transition: "background 0.2s",
                              }}
                            >
                              <span style={{
                                position: "absolute", top: 2,
                                left: checked ? 14 : 2,
                                width: 12, height: 12, borderRadius: "50%", background: "#fff",
                                transition: "left 0.15s",
                              }} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
        {savedAt && !dirty && (
          <span style={{ fontSize: 11, color: "#06d6a0", display: "inline-flex", alignItems: "center", gap: 4 }}>
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

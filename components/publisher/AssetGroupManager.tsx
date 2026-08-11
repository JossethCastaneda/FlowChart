"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Check, AlertCircle, Save, Loader2, X } from "lucide-react";

/* ── Social Icons ──────────────────────────── */
const Facebook = ({ style }: { style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16, ...style }}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const Instagram = ({ style }: { style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16, ...style }}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

export function AssetGroupManager() {
  const [groups, setGroups] = useState<any[]>([]);
  const [allTargets, setAllTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/asset-groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.data || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  const fetchTargets = useCallback(async () => {
    try {
      const resMeta = await fetch("/api/meta/pages?module=publisher_facebook");
      const dataMeta = await resMeta.json();
      const pages = dataMeta.data || [];

      const resStatus = await fetch("/api/connect/status");
      const dataStatus = await resStatus.json();
      const igAccounts = dataStatus.modules?.publisher_instagram?.instagramAccounts || [];

      const targets: any[] = [];
      const seenIg = new Set<string>();

      for (const page of pages) {
        targets.push({
          key: `fb_${page.id}`,
          platform: "facebook",
          pageId: page.id,
          pageName: page.name,
          pagePicture: page.picture,
        });
        if (page.instagram) {
          seenIg.add(page.instagram.id);
          targets.push({
            key: `ig_${page.instagram.id}`,
            platform: "instagram",
            pageId: page.id,
            pageName: page.name,
            igId: page.instagram.id,
            igUsername: page.instagram.username,
            igPicture: page.instagram.picture,
          });
        }
      }

      for (const acc of igAccounts) {
        if (!acc?.id || seenIg.has(acc.id)) continue;
        if (acc.capabilities?.publish === false) continue;
        seenIg.add(acc.id);
        targets.push({
          key: `ig_${acc.id}`,
          platform: "instagram",
          pageId: acc.pageId || "",
          pageName: acc.name || acc.username || "Instagram",
          igId: acc.id,
          igUsername: acc.username || undefined,
          igPicture: acc.picture || undefined,
        });
      }
      setAllTargets(targets);
    } catch {}
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchTargets();
  }, [fetchGroups, fetchTargets]);

  const toggleAsset = (target: any) => {
    const extId = target.platform === "facebook" ? target.pageId : target.igId;
    const exists = selectedAssets.find(a => a.provider === target.platform && a.externalId === extId);
    
    if (exists) {
      setSelectedAssets(prev => prev.filter(a => !(a.provider === target.platform && a.externalId === extId)));
    } else {
      setSelectedAssets(prev => [...prev, { provider: target.platform, externalId: extId }]);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return setError("El nombre es obligatorio");
    if (selectedAssets.length === 0) return setError("Selecciona al menos un canal");

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/asset-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, assets: selectedAssets })
      });
      if (res.ok) {
        setIsCreating(false);
        setNewName("");
        setSelectedAssets([]);
        fetchGroups();
      } else {
        const data = await res.json();
        setError(data.error || "Error al crear grupo");
      }
    } catch {
      setError("Error de red");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este grupo?")) return;
    try {
      await fetch(`/api/workspace/asset-groups/${id}`, { method: "DELETE" });
      setGroups(prev => prev.filter(g => g.id !== id));
    } catch {}
  };

  return (
    <div style={{ background: "var(--panel-bg)", border: "1px solid var(--glass-border)", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--fc-text)", margin: 0 }}>Grupos de Activos</h3>
        <button onClick={() => setIsCreating(true)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
          background: "var(--fc-accent)", color: "var(--fc-bg)", borderRadius: 20,
          border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600
        }}>
          <Plus style={{ width: 14, height: 14 }} /> Crear Grupo
        </button>
      </div>

      {isCreating && (
        <div style={{ background: "var(--surface-hover)", padding: 16, borderRadius: 8, marginBottom: 16, border: "1px solid var(--fc-accent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fc-accent)" }}>Nuevo Grupo</span>
            <button onClick={() => setIsCreating(false)} style={{ background: "none", border: "none", color: "var(--fc-text-muted)", cursor: "pointer" }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Nombre del grupo (ej. Marca X)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--hairline)", background: "var(--fc-bg)", color: "var(--fc-text)", marginBottom: 12 }}
          />

          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--fc-text-secondary)", marginBottom: 8 }}>Selecciona canales:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 150, overflowY: "auto", marginBottom: 16 }}>
            {allTargets.map(t => {
              const extId = t.platform === "facebook" ? t.pageId : t.igId;
              const isSelected = selectedAssets.some(a => a.provider === t.platform && a.externalId === extId);
              const picture = t.platform === "facebook" ? t.pagePicture : t.igPicture;
              
              return (
                <button key={t.key} onClick={() => toggleAsset(t)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                  background: isSelected ? (t.platform === "facebook" ? "rgba(24,119,242,0.1)" : "rgba(225,48,108,0.1)") : "transparent",
                  border: isSelected ? (t.platform === "facebook" ? "1px solid #1877f2" : "1px solid #e1306c") : "1px solid var(--hairline)",
                  borderRadius: 6, cursor: "pointer", color: "var(--fc-text)", textAlign: "left"
                }}>
                  <div style={{ position: "relative", width: 28, height: 28 }}>
                    {picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={picture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {t.platform === 'facebook' ? <Facebook style={{ width: 14, height: 14, color: "#1877f2" }} /> : <Instagram style={{ width: 14, height: 14, color: "#e1306c" }} />}
                      </div>
                    )}
                    <div style={{
                      position: "absolute", bottom: -2, right: -2, 
                      background: "var(--fc-bg)", borderRadius: "50%", padding: 2, display: "flex"
                    }}>
                      {t.platform === 'facebook' ? <Facebook style={{ width: 10, height: 10, color: "#1877f2" }} /> : <Instagram style={{ width: 10, height: 10, color: "#e1306c" }} />}
                    </div>
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                    {t.pageName} <span style={{ color: "var(--fc-text-muted)", fontWeight: 400 }}>{t.igUsername ? `(@${t.igUsername})` : ''}</span>
                  </div>
                  {isSelected && <Check style={{ width: 16, height: 16, color: t.platform === "facebook" ? "#1877f2" : "#e1306c" }} />}
                </button>
              );
            })}
          </div>

          {error && <div style={{ fontSize: 12, color: "var(--fc-danger)", marginBottom: 12 }}>{error}</div>}

          <button onClick={handleCreate} disabled={saving} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "8px 16px", background: "var(--fc-accent)", color: "var(--fc-bg)",
            borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600
          }}>
            {saving ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 14, height: 14 }} />}
            Guardar Grupo
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 20 }}><Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite", color: "var(--fc-accent)", margin: "0 auto" }} /></div>
      ) : groups.length === 0 && !isCreating ? (
        <div style={{ textAlign: "center", padding: 20, color: "var(--fc-text-muted)", fontSize: 13 }}>
          No hay grupos creados
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {groups.map(g => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface-hover)", borderRadius: 8, border: "1px solid var(--hairline)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fc-text)" }}>{g.name}</div>
                <div style={{ fontSize: 11, color: "var(--fc-text-muted)", marginTop: 2 }}>{g.assets?.length || 0} canales</div>
              </div>
              <button onClick={() => handleDelete(g.id)} style={{ background: "none", border: "none", color: "var(--fc-danger)", cursor: "pointer" }}>
                <Trash2 style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

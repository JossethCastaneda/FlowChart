"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash2, Check, Save, Loader2, X, Search, Send } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/ui/BrandIcons";
import { Tag } from "@/components/ui/Tag";
import type { PublishTarget } from "./Composer";

type GroupType = "publish" | "respond";

interface AssetGroupAsset {
  provider: "facebook" | "instagram";
  externalId: string;
}

interface AssetGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  type: GroupType;
  assets: AssetGroupAsset[];
  lastPublishedAt: string | null;
  createdAt: string;
}

const TYPE_FILTERS: { key: "all" | GroupType; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "publish", label: "Publican" },
  { key: "respond", label: "Responden" },
];

const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" });

function PlatformMark({ platform, size = 14 }: { platform: string; size?: number }) {
  const style = { width: size, height: size };
  if (platform === "facebook") return <FacebookIcon style={style} />;
  if (platform === "instagram") return <InstagramIcon style={style} />;
  return null;
}

export function AssetGroupManager({ onPublishToGroup }: { onPublishToGroup?: (targets: PublishTarget[]) => void }) {
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [allTargets, setAllTargets] = useState<PublishTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<GroupType>("publish");
  const [selectedAssets, setSelectedAssets] = useState<AssetGroupAsset[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | GroupType>("all");

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

      const targets: PublishTarget[] = [];
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
            pagePicture: page.picture,
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
          pagePicture: acc.picture || "",
          igId: acc.id,
          igUsername: acc.username || undefined,
          igPicture: acc.picture || undefined,
        });
      }
      setAllTargets(targets);
    } catch {}
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGroups();
    fetchTargets();
  }, [fetchGroups, fetchTargets]);

  const toggleAsset = (target: PublishTarget) => {
    const extId = target.platform === "facebook" ? target.pageId : (target.igId as string);
    const exists = selectedAssets.find((a) => a.provider === target.platform && a.externalId === extId);
    if (exists) {
      setSelectedAssets((prev) => prev.filter((a) => !(a.provider === target.platform && a.externalId === extId)));
    } else {
      setSelectedAssets((prev) => [...prev, { provider: target.platform, externalId: extId }]);
    }
  };

  const resetCreateForm = () => {
    setIsCreating(false);
    setNewName("");
    setNewDescription("");
    setNewType("publish");
    setSelectedAssets([]);
    setError(null);
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
        body: JSON.stringify({
          name: newName,
          description: newDescription || undefined,
          type: newType,
          assets: selectedAssets,
        }),
      });
      if (res.ok) {
        resetCreateForm();
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
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch {}
  };

  const resolveGroupTargets = useCallback(
    (group: AssetGroup): PublishTarget[] =>
      allTargets.filter((t) =>
        group.assets.some(
          (a) => a.provider === t.platform && a.externalId === (t.platform === "facebook" ? t.pageId : t.igId)
        )
      ),
    [allTargets]
  );

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (typeFilter !== "all" && g.type !== typeFilter) return false;
      if (!q) return true;
      if (g.name.toLowerCase().includes(q)) return true;
      const members = resolveGroupTargets(g);
      return members.some(
        (m) => m.pageName.toLowerCase().includes(q) || (m.igUsername || "").toLowerCase().includes(q)
      );
    });
  }, [groups, search, typeFilter, resolveGroupTargets]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--fc-text)", margin: 0 }}>Grupos de canales</h3>
          <button
            onClick={() => setIsCreating(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              background: "var(--fc-accent)", color: "var(--fc-bg)", borderRadius: 10,
              border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
            }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Crear grupo
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--fc-text-muted)", margin: 0, maxWidth: 640 }}>
          Agrupa canales para publicar en varias cuentas con un clic desde el Redactor.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--fc-text-muted)" }} />
          <input
            type="text"
            placeholder="Buscar grupo o cuenta"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box", padding: "8px 12px 8px 30px", borderRadius: 10,
              border: "1px solid var(--hairline)", background: "var(--fc-bg)", color: "var(--fc-text)", fontSize: 12.5,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {TYPE_FILTERS.map((f) => {
            const active = typeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                style={{
                  padding: "7px 12px", borderRadius: 999, border: `1px solid ${active ? "var(--fc-accent)" : "var(--hairline)"}`,
                  background: active ? "rgba(53,211,217,0.12)" : "transparent",
                  color: active ? "var(--fc-accent)" : "var(--fc-text-muted)",
                  fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {isCreating && (
        <div style={{ background: "var(--surface-hover)", padding: 16, borderRadius: 12, border: "1px solid var(--fc-accent)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fc-accent)" }}>Nuevo grupo</span>
            <button onClick={resetCreateForm} style={{ background: "none", border: "none", color: "var(--fc-text-muted)", cursor: "pointer" }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Nombre del grupo (ej. Marca principal)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--hairline)", background: "var(--fc-bg)", color: "var(--fc-text)", marginBottom: 10 }}
          />
          <input
            type="text"
            placeholder="Descripción (opcional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--hairline)", background: "var(--fc-bg)", color: "var(--fc-text)", marginBottom: 10 }}
          />

          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {(["publish", "respond"] as GroupType[]).map((t) => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                style={{
                  padding: "6px 12px", borderRadius: 999, border: `1px solid ${newType === t ? "var(--fc-accent)" : "var(--hairline)"}`,
                  background: newType === t ? "rgba(53,211,217,0.12)" : "transparent",
                  color: newType === t ? "var(--fc-accent)" : "var(--fc-text-muted)", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                }}
              >
                {t === "publish" ? "Publican" : "Responden"}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fc-text-secondary)", marginBottom: 8 }}>Selecciona canales:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 150, overflowY: "auto", marginBottom: 16 }}>
            {allTargets.map((t) => {
              const extId = t.platform === "facebook" ? t.pageId : t.igId;
              const isSelected = selectedAssets.some((a) => a.provider === t.platform && a.externalId === extId);
              const picture = t.platform === "facebook" ? t.pagePicture : t.igPicture;

              return (
                <button
                  key={t.key}
                  onClick={() => toggleAsset(t)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                    background: isSelected ? (t.platform === "facebook" ? "rgba(24,119,242,0.1)" : "rgba(225,48,108,0.1)") : "transparent",
                    border: isSelected ? (t.platform === "facebook" ? "1px solid #1877f2" : "1px solid #e1306c") : "1px solid var(--hairline)",
                    borderRadius: 8, cursor: "pointer", color: "var(--fc-text)", textAlign: "left",
                  }}
                >
                  <div style={{ position: "relative", width: 28, height: 28 }}>
                    {picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={picture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--surface-hover)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <PlatformMark platform={t.platform} />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                    {t.pageName} <span style={{ color: "var(--fc-text-muted)", fontWeight: 400 }}>{t.igUsername ? `(@${t.igUsername})` : ""}</span>
                  </div>
                  {isSelected && <Check style={{ width: 16, height: 16, color: t.platform === "facebook" ? "#1877f2" : "#e1306c" }} />}
                </button>
              );
            })}
          </div>

          {error && <div style={{ fontSize: 12, color: "var(--fc-danger)", marginBottom: 12 }}>{error}</div>}

          <button
            onClick={handleCreate}
            disabled={saving}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "9px 16px", background: "var(--fc-accent)", color: "var(--fc-bg)",
              borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700,
            }}
          >
            {saving ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Save style={{ width: 14, height: 14 }} />}
            Guardar grupo
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite", color: "var(--fc-accent)", margin: "0 auto" }} />
        </div>
      ) : filteredGroups.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--fc-text-muted)", fontSize: 13, border: "1px dashed var(--hairline)", borderRadius: 12 }}>
          {groups.length === 0 ? "No hay grupos creados" : "Nada con estos filtros"}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filteredGroups.map((g) => {
            const members = resolveGroupTargets(g);
            return (
              <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, background: "var(--surface-hover)", borderRadius: 14, border: "1px solid var(--hairline)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: g.color || "var(--fc-accent)", marginTop: 4, flex: "none" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fc-text)" }}>{g.name}</span>
                      <Tag variant={g.type === "publish" ? "accent" : "default"}>{members.length} {members.length === 1 ? "cuenta" : "cuentas"}</Tag>
                    </div>
                    {g.description && (
                      <div style={{ fontSize: 12, color: "var(--fc-text-muted)", marginTop: 3 }}>{g.description}</div>
                    )}
                  </div>
                  <button onClick={() => handleDelete(g.id)} style={{ background: "none", border: "none", color: "var(--fc-danger)", cursor: "pointer", flex: "none" }} title="Eliminar grupo">
                    <Trash2 style={{ width: 15, height: 15 }} />
                  </button>
                </div>

                <div style={{ height: 1, background: "var(--hairline)" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 120, overflowY: "auto" }}>
                  {members.length === 0 ? (
                    <div style={{ fontSize: 11.5, color: "var(--fc-text-muted)" }}>Sin cuentas conectadas activas.</div>
                  ) : (
                    members.map((m) => (
                      <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <PlatformMark platform={m.platform} size={13} />
                        <span style={{ fontWeight: 600, color: "var(--fc-text)" }}>{m.pageName}</span>
                        {m.igUsername && <span style={{ color: "var(--fc-text-muted)" }}>@{m.igUsername}</span>}
                      </div>
                    ))
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => members.length > 0 && onPublishToGroup?.(members)}
                    disabled={members.length === 0}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
                      color: members.length === 0 ? "var(--fc-text-muted)" : "var(--fc-accent)", cursor: members.length === 0 ? "not-allowed" : "pointer",
                      fontSize: 12, fontWeight: 700, padding: 0,
                    }}
                  >
                    <Send style={{ width: 13, height: 13 }} /> Publicar en el grupo →
                  </button>
                  <span style={{ fontSize: 10.5, color: "var(--fc-text-muted)" }}>
                    {g.lastPublishedAt ? `Última: ${dateFormatter.format(new Date(g.lastPublishedAt))}` : "Sin publicaciones aún"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

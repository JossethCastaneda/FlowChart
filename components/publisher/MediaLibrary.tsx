/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Film, ImageIcon, Loader2, Plus, Trash2, Upload, X } from "lucide-react";

type AssetKind = "image" | "video";

interface Asset {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  tags: string[];
  kind: AssetKind;
  used: boolean;
  createdAt: string;
}

interface Storage {
  fileCount: number;
  usedBytes: number;
  quotaBytes: number;
}

type FilterKey = "all" | "image" | "video" | "unused";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todo" },
  { key: "image", label: "Imágenes" },
  { key: "video", label: "Video" },
  { key: "unused", label: "Sin usar" },
];

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export function MediaLibrary() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [storage, setStorage] = useState<Storage | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filter === "image" || filter === "video") params.set("kind", filter);
    if (filter === "unused") params.set("unused", "true");
    return fetch(`/api/publisher/library?${params.toString()}`)
      .then((res) => res.json())
      .then((payload) => {
        setAssets(payload.data?.assets || []);
        setStorage(payload.data?.storage || null);
      })
      .catch(() => setAssets([]));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const dims = await readImageDimensions(file);
        const formData = new FormData();
        formData.append("file", file);
        if (dims) {
          formData.append("width", String(dims.width));
          formData.append("height", String(dims.height));
        }
        const res = await fetch("/api/publisher/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          setError(payload?.error || `No se pudo subir ${file.name}`);
        }
      }
      await load();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este archivo de la biblioteca?")) return;
    await fetch(`/api/publisher/library/${id}`, { method: "DELETE" });
    setAssets((prev) => (prev ? prev.filter((a) => a.id !== id) : prev));
  }

  async function addTag(asset: Asset, tag: string) {
    const clean = tag.trim();
    if (!clean || asset.tags.includes(clean)) return;
    const tags = [...asset.tags, clean];
    setAssets((prev) => (prev ? prev.map((a) => (a.id === asset.id ? { ...a, tags } : a)) : prev));
    await fetch(`/api/publisher/library/${asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
  }

  async function removeTag(asset: Asset, tag: string) {
    const tags = asset.tags.filter((t) => t !== tag);
    setAssets((prev) => (prev ? prev.map((a) => (a.id === asset.id ? { ...a, tags } : a)) : prev));
    await fetch(`/api/publisher/library/${asset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
  }

  const storageLine = useMemo(() => {
    if (!storage) return null;
    const shown = assets?.length ?? 0;
    return `${shown} de ${storage.fileCount} archivos · ${formatBytes(storage.usedBytes)} de ${formatBytes(storage.quotaBytes)}`;
  }, [storage, assets]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--fc-text)", margin: 0 }}>Biblioteca de medios</h3>
          <p style={{ fontSize: 12, color: "var(--fc-text-muted)", margin: "3px 0 0" }}>
            {storageLine || "Archivos subidos desde el Redactor y esta pestaña."}
          </p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" hidden onChange={(e) => handleFiles(e.target.files)} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              background: "var(--fc-accent)", color: "var(--fc-bg)", borderRadius: 10,
              border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Upload style={{ width: 14, height: 14 }} />}
            Subir recurso
          </button>
        </div>
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--fc-danger)" }}>{error}</p>}

      <div style={{ display: "flex", gap: 6 }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
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

      {assets === null ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite", color: "var(--fc-text-muted)" }} />
        </div>
      ) : assets.length === 0 ? (
        <div style={{ borderRadius: 12, border: "1px dashed var(--hairline)", padding: 48, textAlign: "center", fontSize: 13, color: "var(--fc-text-muted)" }}>
          Aún no hay archivos con este filtro. Los medios que subas aquí o en el Redactor aparecerán aquí.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {assets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onDelete={handleDelete} onAddTag={addTag} onRemoveTag={removeTag} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetCard({
  asset,
  onDelete,
  onAddTag,
  onRemoveTag,
}: {
  asset: Asset;
  onDelete: (id: string) => void;
  onAddTag: (asset: Asset, tag: string) => void;
  onRemoveTag: (asset: Asset, tag: string) => void;
}) {
  const [tagInput, setTagInput] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, borderRadius: 14, border: "1px solid var(--hairline)", background: "var(--surface-hover)", overflow: "hidden" }}>
      <div style={{ position: "relative", aspectRatio: "16/9", background: "var(--fc-bg)" }}>
        {asset.kind === "image" ? (
          <img src={asset.url} alt={asset.fileName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <video src={asset.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
        )}
        <span style={{ position: "absolute", top: 8, left: 8, padding: "2px 7px", borderRadius: 6, background: "rgba(11,18,20,0.75)", color: "#fff", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.04em" }}>
          {asset.kind === "image" ? <ImageIcon style={{ width: 10, height: 10, display: "inline", marginRight: 3, verticalAlign: -1 }} /> : <Film style={{ width: 10, height: 10, display: "inline", marginRight: 3, verticalAlign: -1 }} />}
          {asset.kind === "image" ? "IMG" : "VIDEO"}
        </span>
        {asset.width && asset.height && (
          <span style={{ position: "absolute", top: 8, right: 8, padding: "2px 7px", borderRadius: 6, background: "rgba(11,18,20,0.75)", color: "#fff", fontSize: 9.5, fontFamily: "var(--fc-font-mono, monospace)" }}>
            {asset.width}×{asset.height}
          </span>
        )}
        <button
          onClick={() => onDelete(asset.id)}
          title="Eliminar"
          style={{ position: "absolute", bottom: 8, right: 8, width: 24, height: 24, borderRadius: 7, background: "rgba(11,18,20,0.75)", border: "none", color: "var(--fc-danger)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <Trash2 style={{ width: 13, height: 13 }} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 12px 12px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fc-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {asset.fileName}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--fc-text-muted)" }}>
          {formatBytes(asset.size)} · {asset.used ? "usado" : "sin usar"}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          {asset.tags.map((tag) => (
            <span key={tag} style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 999, background: "var(--fc-bg)", border: "1px solid var(--hairline)", fontSize: 10, color: "var(--fc-text-secondary)" }}>
              #{tag}
              <button onClick={() => onRemoveTag(asset, tag)} style={{ background: "none", border: "none", padding: 0, color: "var(--fc-text-muted)", cursor: "pointer", display: "flex" }}>
                <X style={{ width: 9, height: 9 }} />
              </button>
            </span>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAddTag(asset, tagInput);
              setTagInput("");
            }}
            style={{ display: "flex", alignItems: "center", gap: 2 }}
          >
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="+ tag"
              style={{ width: 46, background: "none", border: "none", outline: "none", color: "var(--fc-text-muted)", fontSize: 10 }}
            />
            {tagInput && (
              <button type="submit" style={{ background: "none", border: "none", padding: 0, color: "var(--fc-accent)", cursor: "pointer", display: "flex" }}>
                <Plus style={{ width: 11, height: 11 }} />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

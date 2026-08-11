/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { File, Loader2 } from "lucide-react";

type Asset = { id: string; url: string; fileName: string; mimeType: string; size: number; createdAt: string };

export function MediaLibrary() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  useEffect(() => { fetch("/api/publisher/upload").then((response) => response.json()).then((payload) => setAssets(payload.data?.assets || [])).catch(() => setAssets([])); }, []);
  if (!assets) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--fc-text-muted)]" /></div>;
  return <div className="glass-panel p-5"><div className="mb-4"><h2 className="text-lg font-bold text-[var(--fc-text)]">Biblioteca del cliente</h2><p className="text-sm text-[var(--fc-text-muted)]">Archivos subidos en el cliente activo. Cambia de cliente en la barra superior para ver otra biblioteca.</p></div>{assets.length === 0 ? <p className="rounded-xl border border-[var(--fc-border)] py-12 text-center text-sm text-[var(--fc-text-muted)]">Aún no hay archivos. Los medios que subas en el redactor aparecerán aquí.</p> : <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">{assets.map((asset) => <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-[var(--fc-border)] bg-[var(--fc-bg)]/20">{asset.mimeType.startsWith("image/") ? <img src={asset.url} alt={asset.fileName} className="aspect-square w-full object-cover" /> : <div className="flex aspect-square items-center justify-center"><File className="text-[var(--fc-text-muted)]" /></div>}<div className="p-2"><p className="truncate text-xs font-medium text-[var(--fc-text)]">{asset.fileName}</p><p className="mt-1 text-[10px] text-[var(--fc-text-muted)]">{(asset.size / 1024 / 1024).toFixed(1)} MB</p></div></a>)}</div>}</div>;
}

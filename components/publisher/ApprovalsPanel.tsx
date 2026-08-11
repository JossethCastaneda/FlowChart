/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

type Post = { id: string; content: string; mediaUrls: string[]; mediaUrl: string | null; channels: string[]; scheduledAt: string | null; createdAt: string };

export function ApprovalsPanel() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => fetch("/api/publisher/posts?approvalStatus=pending").then((response) => response.json()).then((payload) => setPosts(payload.data?.posts || [])).catch(() => setError("No pudimos cargar las aprobaciones.")).finally(() => setLoading(false)), []);
  useEffect(() => { void load(); }, [load]);

  async function decide(id: string, decision: "approve" | "reject") {
    const note = decision === "reject" ? window.prompt("Describe los cambios solicitados:") : undefined;
    if (decision === "reject" && !note) return;
    setBusy(id); setError("");
    const response = await fetch(`/api/publisher/posts/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, note }) });
    const payload = await response.json();
    if (!response.ok) setError(payload.error || "No pudimos registrar la decisión");
    else setPosts((items) => items.filter((item) => item.id !== id));
    setBusy(null);
  }

  if (loading) return <div className="flex justify-center p-12 text-[var(--fc-text-muted)]"><Loader2 className="animate-spin" /></div>;
  return <div className="glass-panel p-5"><div className="mb-4"><h2 className="text-lg font-bold text-[var(--fc-text)]">Aprobaciones editoriales</h2><p className="text-sm text-[var(--fc-text-muted)]">La misma cola que revisa el cliente desde su portal.</p></div>{error && <p className="mb-3 text-xs text-red-400">{error}</p>}{posts.length === 0 ? <p className="rounded-xl border border-[var(--fc-border)] py-12 text-center text-sm text-[var(--fc-text-muted)]">No hay piezas pendientes de aprobación.</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{posts.map((post) => { const image = post.mediaUrls[0] || post.mediaUrl; return <article key={post.id} className="overflow-hidden rounded-xl border border-[var(--fc-border)] bg-[var(--fc-bg)]/20">{image && <img src={image} alt="Vista previa" className="h-40 w-full object-cover" />}<div className="space-y-3 p-4"><div className="flex gap-1">{post.channels.map((channel) => <span key={channel} className="rounded-full bg-[var(--surface-hover)] px-2 py-1 text-[10px] uppercase text-[var(--fc-text-muted)]">{channel}</span>)}</div><p className="line-clamp-4 whitespace-pre-wrap text-sm text-[var(--fc-text-secondary)]">{post.content}</p><div className="flex gap-2"><button disabled={busy === post.id} onClick={() => decide(post.id, "approve")} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Check size={14} />Aprobar</button><button disabled={busy === post.id} onClick={() => decide(post.id, "reject")} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400 disabled:opacity-50"><X size={14} />Cambios</button></div></div></article>; })}</div>}</div>;
}

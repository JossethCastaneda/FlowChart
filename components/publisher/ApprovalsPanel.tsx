/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CheckCircle2, Loader2, Undo2, X } from "lucide-react";
import { Tag, type TagVariant } from "@/components/ui/Tag";
import { Dialog } from "@/components/ui/Dialog";

type ApprovalStatus = "pending" | "approved" | "rejected";
type FilterKey = ApprovalStatus | "all";

interface Post {
  id: string;
  content: string;
  mediaUrls: string[];
  mediaUrl: string | null;
  channels: string[];
  scheduledAt: string | null;
  createdAt: string;
  approvalStatus: ApprovalStatus | null;
  reviewNote: string | null;
}

interface ApprovalCounts {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: "pending", label: "Pendientes", color: "var(--fc-warning)" },
  { key: "approved", label: "Aprobados", color: "var(--fc-success)" },
  { key: "rejected", label: "Devueltos", color: "var(--fc-danger)" },
  { key: "all", label: "Todos", color: "var(--fc-accent)" },
];

const STATUS_TAG: Record<ApprovalStatus, { label: string; variant: TagVariant }> = {
  pending: { label: "Pendiente", variant: "warning" },
  approved: { label: "Aprobado", variant: "success" },
  rejected: { label: "Devuelto", variant: "danger" },
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function ApprovalsPanel() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [counts, setCounts] = useState<ApprovalCounts>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    return fetch(`/api/publisher/posts?approvalStatus=${filter}&limit=200`)
      .then((response) => response.json())
      .then((payload) => {
        setPosts(payload.data?.posts || []);
        if (payload.data?.approvalCounts) setCounts(payload.data.approvalCounts);
      })
      .catch(() => setError("No pudimos cargar las aprobaciones."))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function decide(id: string, decision: "approve" | "reject", note?: string) {
    setBusy(id);
    setError("");
    const response = await fetch(`/api/publisher/posts/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "No pudimos registrar la decisión");
    } else {
      void load();
    }
    setBusy(null);
  }

  function openReject(id: string) {
    setRejectTarget(id);
    setRejectReason("");
  }

  async function confirmReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    const id = rejectTarget;
    setRejectTarget(null);
    await decide(id, "reject", rejectReason.trim());
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <CheckCircle2 style={{ width: 20, height: 20, color: "var(--fc-success)" }} />
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--fc-text)", margin: 0 }}>Centro de aprobaciones</h3>
          <p style={{ fontSize: 12, color: "var(--fc-text-muted)", margin: 0 }}>Revisa, aprueba o solicita cambios antes de que salga a producción.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = f.key === "all" ? counts.total : counts[f.key];
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999,
                border: `1px solid ${active ? f.color : "var(--hairline)"}`,
                background: active ? `${f.color}1f` : "transparent",
                color: active ? f.color : "var(--fc-text-muted)",
                fontSize: 11.5, fontWeight: 700, cursor: "pointer",
              }}
            >
              {f.label}
              <span style={{ fontFamily: "var(--fc-font-mono, monospace)", fontSize: 10, opacity: 0.85 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {error && <p style={{ fontSize: 12, color: "var(--fc-danger)" }}>{error}</p>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48, color: "var(--fc-text-muted)" }}>
          <Loader2 className="animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div style={{ borderRadius: 12, border: "1px dashed var(--hairline)", padding: 48, textAlign: "center", fontSize: 13, color: "var(--fc-text-muted)" }}>
          No hay piezas en este filtro.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {posts.map((post) => {
            const image = post.mediaUrls[0] || post.mediaUrl;
            const status = post.approvalStatus ?? "pending";
            const tag = STATUS_TAG[status];
            const title = post.content.slice(0, 70) + (post.content.length > 70 ? "…" : "");
            return (
              <article key={post.id} style={{ overflow: "hidden", borderRadius: 14, border: "1px solid var(--hairline)", background: "var(--surface-hover)" }}>
                {image && <img src={image} alt="Vista previa" style={{ height: 140, width: "100%", objectFit: "cover" }} />}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Tag variant={tag.variant}>{tag.label}</Tag>
                    {post.channels.map((channel) => (
                      <span key={channel} style={{ borderRadius: 999, background: "var(--fc-bg)", padding: "2px 8px", fontSize: 10, textTransform: "uppercase", color: "var(--fc-text-muted)" }}>
                        {channel}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fc-text)" }}>{title}</div>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--fc-text-secondary)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {post.content}
                  </p>
                  <div style={{ fontSize: 10.5, fontFamily: "var(--fc-font-mono, monospace)", color: "var(--fc-text-muted)" }}>
                    {post.scheduledAt ? dateFormatter.format(new Date(post.scheduledAt)) : "Sin fecha"}
                  </div>
                  {status === "rejected" && post.reviewNote && (
                    <div style={{ fontSize: 11, color: "var(--fc-danger)", background: "rgba(255,107,107,0.1)", borderRadius: 8, padding: "6px 8px" }}>
                      {post.reviewNote}
                    </div>
                  )}
                  {status === "pending" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button
                        disabled={busy === post.id}
                        onClick={() => decide(post.id, "approve")}
                        style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          borderRadius: 10, background: "var(--fc-success)", color: "#04140c", border: "none",
                          padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: busy === post.id ? 0.6 : 1,
                        }}
                      >
                        <Check size={14} /> Aprobar
                      </button>
                      <button
                        disabled={busy === post.id}
                        onClick={() => openReject(post.id)}
                        style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          borderRadius: 10, background: "transparent", color: "var(--fc-danger)", border: "1px solid rgba(255,107,107,0.35)",
                          padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: busy === post.id ? 0.6 : 1,
                        }}
                      >
                        <Undo2 size={14} /> Devolver
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Describe los cambios solicitados">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 320 }}>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="Ej. Marcado por legal · falta letra chica de vigencia"
            style={{ width: "100%", boxSizing: "border-box", borderRadius: 8, border: "1px solid var(--hairline)", background: "var(--fc-bg)", color: "var(--fc-text)", padding: 10, fontSize: 13, resize: "vertical" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setRejectTarget(null)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--hairline)", background: "transparent", color: "var(--fc-text)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
              <X size={13} style={{ marginRight: 4, verticalAlign: -2 }} /> Cancelar
            </button>
            <button
              onClick={confirmReject}
              disabled={!rejectReason.trim()}
              style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--fc-danger)", color: "#1a0505", cursor: rejectReason.trim() ? "pointer" : "not-allowed", fontSize: 12.5, fontWeight: 700, opacity: rejectReason.trim() ? 1 : 0.6 }}
            >
              Devolver
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

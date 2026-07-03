"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FileText, Plus, ExternalLink, Trash2, Calendar, Copy, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { showToast } from "@/components/ui/Toast";

interface ReportItem {
  id: string;
  title: string;
  slug: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  project: { name: string; alias?: string; client?: string };
  createdBy?: { name?: string; image?: string };
}

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
};

export default function ReportesPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reportes");
      const json = await res.json();
      if (json.success) setReports(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este reporte? El link público dejará de funcionar.")) return;
    try {
      const res = await fetch(`/api/reportes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== id));
        showToast("success", "Reporte eliminado");
      }
    } catch {
      showToast("error", "Error al eliminar");
    }
  };

  const copyPublicLink = (slug: string) => {
    const url = `${window.location.origin}/reportes/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    showToast("success", "Link copiado al portapapeles");
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="page-enter">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid var(--hairline)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(224,96,126,0.10)", border: "1px solid rgba(224,96,126,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FileText style={{ width: 18, height: 18, color: "#e0607e" }} />
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.08em", margin: 0 }}>
              Reportes
            </h1>
            <p style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.06em", margin: 0, marginTop: 2, textTransform: "uppercase" }}>
              Informes white-label para clientes
            </p>
          </div>
        </div>
        <Link href="/dashboard/proyectos" style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px",
          background: "rgba(224,96,126,0.10)", border: "1px solid rgba(224,96,126,0.25)",
          color: "#e0607e", borderRadius: 10, fontWeight: 700, fontSize: 11,
          letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none",
          transition: "all 0.15s",
        }}>
          <Plus style={{ width: 14, height: 14 }} /> Generar desde proyecto
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12 }}>
          <Loader2 style={{ width: 18, height: 18, color: "var(--cyan)", animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Cargando reportes...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && reports.length === 0 && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "52px 24px", gap: 16, background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 16, textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: "rgba(224,96,126,0.10)",
            border: "1px solid rgba(224,96,126,0.20)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <FileText style={{ width: 26, height: 26, color: "#e0607e" }} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: "0 0 8px" }}>
              Aún no tienes reportes
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6 }}>
              Genera tu primer reporte desde el detalle de cualquier proyecto con datos de Meta Ads.
              El reporte incluye KPIs, gráficos y un link público para compartir con tu cliente.
            </p>
          </div>
          <Link href="/dashboard/proyectos" style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px",
            background: "rgba(224,96,126,0.10)", border: "1px solid rgba(224,96,126,0.25)",
            color: "#e0607e", borderRadius: 10, fontWeight: 700, fontSize: 12,
            letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none",
          }}>
            <Plus style={{ width: 14, height: 14 }} /> Ir a Proyectos
          </Link>
        </div>
      )}

      {/* Reports List */}
      {!loading && reports.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
          {reports.map((r) => (
            <div key={r.id} style={{
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
              padding: 20, display: "flex", flexDirection: "column", gap: 12,
              transition: "border-color 0.15s",
            }}>
              {/* Title row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.title}
                  </h3>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" }}>
                    {r.project.alias || r.project.name} {r.project.client ? `· ${r.project.client}` : ""}
                  </p>
                </div>
                <div style={{
                  fontSize: 8, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                  background: r.status === "active" ? "rgba(0,200,117,0.10)" : "rgba(148,163,184,0.10)",
                  color: r.status === "active" ? "var(--emerald)" : "var(--text-muted)",
                  border: `1px solid ${r.status === "active" ? "rgba(0,200,117,0.25)" : "rgba(148,163,184,0.15)"}`,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}>
                  {r.status === "active" ? "ACTIVO" : r.status === "expired" ? "EXPIRADO" : r.status.toUpperCase()}
                </div>
              </div>

              {/* Date range */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar style={{ width: 12, height: 12, color: "var(--text-muted)" }} />
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  {fmtDate(r.dateFrom)} — {fmtDate(r.dateTo)}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 8, borderTop: "1px solid var(--hairline)" }}>
                <Link href={`/reportes/${r.slug}`} target="_blank" style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px",
                  background: "var(--surface-hover)", border: "1px solid var(--border)",
                  color: "var(--foreground)", borderRadius: 8, fontWeight: 600, fontSize: 11,
                  textDecoration: "none", transition: "all 0.15s",
                }}>
                  <ExternalLink style={{ width: 12, height: 12 }} /> Ver
                </Link>
                <button onClick={() => copyPublicLink(r.slug)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px",
                  background: "var(--surface-hover)", border: "1px solid var(--border)",
                  color: "var(--foreground)", borderRadius: 8, fontWeight: 600, fontSize: 11,
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  {copiedSlug === r.slug
                    ? <><Check style={{ width: 12, height: 12, color: "var(--emerald)" }} /> Copiado</>
                    : <><Copy style={{ width: 12, height: 12 }} /> Link</>
                  }
                </button>
                <button onClick={() => handleDelete(r.id)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px",
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--red)", borderRadius: 8, fontWeight: 600, fontSize: 11,
                  cursor: "pointer", marginLeft: "auto", transition: "all 0.15s",
                }}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

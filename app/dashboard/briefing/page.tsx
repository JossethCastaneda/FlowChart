"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Target, Plus, Trash2, Loader2, Edit3, Eye, FileText } from "lucide-react";

interface Brief {
  id: string;
  title: string;
  content: any;
  status: string;
  projectId: string | null;
  project: { id: string; name: string; alias: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { color: string; bg: string; border: string }> = {
  Draft:    { color: "rgba(148,163,184,0.5)", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.12)" },
  Review:   { color: "#ffbe0b", bg: "rgba(255,190,11,0.06)", border: "rgba(255,190,11,0.15)" },
  Approved: { color: "#06d6a0", bg: "rgba(6,214,160,0.06)", border: "rgba(6,214,160,0.12)" },
};

export default function BriefingPage() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", objective: "", audience: "", channels: "", kpis: "", budget: "" });
  const [error, setError] = useState("");

  const fetchBriefs = useCallback(async () => {
    try {
      const res = await fetch("/api/briefs");
      const data = await res.json();
      if (data.data) setBriefs(data.data);
    } catch (err) {
      console.error("[BRIEFS] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBriefs(); }, [fetchBriefs]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    setError("");
    try {
      const content = {
        objective: form.objective,
        audience: form.audience,
        channels: form.channels,
        kpis: form.kpis,
        budget: form.budget,
      };
      const url = editingId ? `/api/briefs/${editingId}` : "/api/briefs";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, content }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      if (editingId) {
        setBriefs((prev) => prev.map((b) => b.id === editingId ? data.data : b));
      } else {
        setBriefs((prev) => [data.data, ...prev]);
      }
      resetForm();
    } catch {
      setError("Error de red");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setBriefs((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
    try {
      await fetch(`/api/briefs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      fetchBriefs();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este brief?")) return;
    setBriefs((prev) => prev.filter((b) => b.id !== id));
    try {
      await fetch(`/api/briefs/${id}`, { method: "DELETE" });
    } catch {
      fetchBriefs();
    }
  };

  const handleEdit = (brief: Brief) => {
    const c = (brief.content || {}) as any;
    setForm({
      title: brief.title,
      objective: c.objective || "",
      audience: c.audience || "",
      channels: c.channels || "",
      kpis: c.kpis || "",
      budget: c.budget || "",
    });
    setEditingId(brief.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({ title: "", objective: "", audience: "", channels: "", kpis: "", budget: "" });
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const counts = {
    draft: briefs.filter((b) => b.status === "Draft").length,
    review: briefs.filter((b) => b.status === "Review").length,
    approved: briefs.filter((b) => b.status === "Approved").length,
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px", fontSize: "13px",
    background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)",
    color: "#e2e8f0", outline: "none",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Briefing Hub"
        description="Crea y gestiona briefs de campañas para tu equipo creativo."
        icon={<Target className="w-6 h-6" style={{ color: "var(--orange)" }} />}
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Borradores", value: counts.draft, ...statusConfig.Draft },
          { label: "En Revisión", value: counts.review, ...statusConfig.Review },
          { label: "Aprobados", value: counts.approved, ...statusConfig.Approved },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-panel" style={{ padding: "16px" }}>
            <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "22px", fontWeight: 700, color: kpi.color }}>
              {loading ? "—" : kpi.value}
            </p>
            <p style={{ fontSize: "10px", color: "rgba(148,163,184,0.4)", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.15em", marginTop: "4px" }}>
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* Briefs Panel */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div className="section-header" style={{ marginBottom: "16px" }}>
          <span className="section-title">Campaign Briefs</span>
          <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus style={{ width: 14, height: 14 }} /> Nuevo Brief
          </button>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div style={{ padding: "20px", marginBottom: "16px", background: "rgba(0,212,255,0.02)", border: "1px solid rgba(0,212,255,0.1)" }}>
            <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "10px", letterSpacing: "0.2em", color: "#00d4ff", marginBottom: "14px" }}>
              {editingId ? "EDITAR BRIEF" : "NUEVO BRIEF"}
            </p>
            <div style={{ display: "grid", gap: "10px" }}>
              <input style={inp} placeholder="Nombre de la campaña *"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <textarea style={{ ...inp, minHeight: "60px", resize: "vertical" }} placeholder="Objetivo de la campaña"
                value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <input style={inp} placeholder="Audiencia / Target"
                  value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
                <input style={inp} placeholder="Canales (FB, IG, TikTok...)"
                  value={form.channels} onChange={(e) => setForm({ ...form, channels: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <input style={inp} placeholder="KPIs principales"
                  value={form.kpis} onChange={(e) => setForm({ ...form, kpis: e.target.value })} />
                <input style={inp} placeholder="Presupuesto"
                  value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              </div>
              {error && <p style={{ fontSize: "12px", color: "#ff2d55" }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button onClick={resetForm}
                  style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(148,163,184,0.15)", color: "rgba(148,163,184,0.5)", cursor: "pointer", fontSize: "12px" }}>
                  Cancelar
                </button>
                <button onClick={handleCreate} disabled={creating || !form.title.trim()}
                  className="btn-primary" style={{ padding: "8px 20px" }}>
                  {creating ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear Brief"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Loader2 style={{ width: 24, height: 24, color: "#00d4ff", animation: "spin 1s linear infinite", margin: "0 auto" }} />
          </div>
        )}

        {/* Empty */}
        {!loading && briefs.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <FileText style={{ width: 32, height: 32, color: "rgba(148,163,184,0.15)", margin: "0 auto 12px" }} />
            <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.4)" }}>No hay briefs aún.</p>
            <p style={{ fontSize: "11px", color: "rgba(148,163,184,0.25)", marginTop: "4px" }}>
              Crea tu primer brief de campaña.
            </p>
          </div>
        )}

        {/* Brief Cards */}
        {!loading && briefs.length > 0 && (
          <div style={{ display: "grid", gap: "12px" }}>
            {briefs.map((brief) => {
              const s = statusConfig[brief.status] || statusConfig.Draft;
              const c = (brief.content || {}) as any;
              return (
                <div key={brief.id} style={{
                  padding: "16px 20px", background: s.bg,
                  border: `1px solid ${s.border}`, transition: "border-color 0.2s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0", margin: 0 }}>{brief.title}</h3>
                        <select value={brief.status}
                          onChange={(e) => handleStatusChange(brief.id, e.target.value)}
                          style={{ background: "transparent", border: `1px solid ${s.border}`,
                            color: s.color, fontSize: "9px", fontWeight: 700,
                            fontFamily: "'Orbitron', sans-serif", padding: "2px 6px",
                            cursor: "pointer", outline: "none", letterSpacing: "0.1em" }}>
                          <option value="Draft">DRAFT</option>
                          <option value="Review">REVIEW</option>
                          <option value="Approved">APPROVED</option>
                        </select>
                      </div>
                      {c.objective && (
                        <p style={{ fontSize: "12px", color: "rgba(148,163,184,0.5)", marginBottom: "8px" }}>
                          {c.objective}
                        </p>
                      )}
                      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                        {c.audience && (
                          <span style={{ fontSize: "10px", color: "rgba(148,163,184,0.35)" }}>
                            👥 {c.audience}
                          </span>
                        )}
                        {c.channels && (
                          <span style={{ fontSize: "10px", color: "rgba(148,163,184,0.35)" }}>
                            📢 {c.channels}
                          </span>
                        )}
                        {c.budget && (
                          <span style={{ fontSize: "10px", color: "rgba(148,163,184,0.35)" }}>
                            💰 {c.budget}
                          </span>
                        )}
                        {c.kpis && (
                          <span style={{ fontSize: "10px", color: "rgba(148,163,184,0.35)" }}>
                            📊 {c.kpis}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "4px", flexShrink: 0, marginLeft: "12px" }}>
                      <button onClick={() => handleEdit(brief)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "rgba(0,212,255,0.4)" }}
                        title="Editar">
                        <Edit3 style={{ width: 14, height: 14 }} />
                      </button>
                      <button onClick={() => handleDelete(brief.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "rgba(255,45,85,0.4)" }}
                        title="Eliminar">
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: "9px", color: "rgba(148,163,184,0.2)", marginTop: "8px", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em" }}>
                    {new Date(brief.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                    {brief.project && ` · ${brief.project.alias || brief.project.name}`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

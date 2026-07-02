"use client";

import React, { useState, useCallback } from "react";
import { GridFormData, FileInputData, ContentGridData, Post, VideoDetails } from "./types";
import { generateContentGridClient } from "./geminiClient";
import { Skeleton } from "@/components/ui/Skeleton";
import { BrainCircuit, Download, Sparkles, FileText, X } from "lucide-react";
import { PermissionGuard } from "@/components/layout/PermissionsContext";


/* ═══ CONSTANTS ═══ */
const MONTH_OPTIONS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const POST_COUNT_OPTIONS = [4, 6, 8, 10, 12, 16];
const FOCUS_OPTIONS = ["Ventas","Branding","Alcance","Reconocimiento de Marca","Posicionamiento de Marca"];
const FORMAT_OPTIONS = ["Imagen","Video","Ambas"];
const INBOUND_STAGES = ["Attract", "Convert", "Close", "Delight"];
const DAYS_IN_MONTH: Record<string, number> = {
  Enero: 31, Febrero: 28, Marzo: 31, Abril: 30, Mayo: 31, Junio: 30,
  Julio: 31, Agosto: 31, Septiembre: 30, Octubre: 31, Noviembre: 30, Diciembre: 31,
};

/* ═══ SHARED STYLES ═══ */
const S = {
  input: {
    width: "100%",
    background: "var(--surface-hover)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "7px 10px",
    color: "var(--foreground)",
    fontSize: 12,
    outline: "none",
    transition: "border-color 0.15s",
    fontFamily: "inherit",
  } as React.CSSProperties,
  label: {
    fontSize: 9,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    marginBottom: 5,
    display: "block",
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "var(--cyan)",
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 6,
  } as React.CSSProperties,
};

/* ═══ SETUP FORM ═══ */
function SetupForm({ onGenerate, isLoading }: { onGenerate: (d: GridFormData) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState<GridFormData>({
    client: "", brandFiles: [], offer: "", month: "Junio",
    postCount: 10, focus: ["Ventas","Branding"], formats: "Ambas", comments: "",
  });
  const [fileNames, setFileNames] = useState<string[]>([]);

  const handleFocusChange = (option: string) => {
    const nf = formData.focus.includes(option) ? formData.focus.filter(i => i !== option) : [...formData.focus, option];
    if (nf.length <= 3) setFormData({ ...formData, focus: nf });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (formData.brandFiles.length + files.length > 5) { alert("Máximo 5 archivos."); e.target.value = ""; return; }
    Promise.all(Array.from(files).map(file =>
      new Promise<FileInputData>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => { const r = ev.target?.result as string; const b = r.split(",")[1]; b ? resolve({ mimeType: file.type, data: b }) : reject(); };
        reader.onerror = () => reject(); reader.readAsDataURL(file);
      })
    )).then(nf => {
      setFormData(prev => ({ ...prev, brandFiles: [...prev.brandFiles, ...nf] }));
      setFileNames(prev => [...prev, ...Array.from(files).map(f => f.name)]);
    }).catch(() => alert("Error al procesar archivos."));
    e.target.value = "";
  };

  const handleRemoveFile = (idx: number) => {
    setFormData(prev => ({ ...prev, brandFiles: prev.brandFiles.filter((_, i) => i !== idx) }));
    setFileNames(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onGenerate(formData); }}>
      {/* Sección: Proyecto */}
      <div style={S.sectionTitle as React.CSSProperties}>
        <span style={{ width: 3, height: 10, background: "var(--cyan)", borderRadius: 2, display: "inline-block" }} />
        Proyecto
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        <div><label style={S.label as React.CSSProperties}>Cliente</label><input type="text" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} style={S.input} placeholder="Ej. Bait" /></div>
        <div><label style={S.label as React.CSSProperties}>Mes</label><select value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} style={{ ...S.input, cursor: "pointer" }}>{MONTH_OPTIONS.map(m => <option key={m}>{m}</option>)}</select></div>
        <div><label style={S.label as React.CSSProperties}>Posts</label><select value={formData.postCount} onChange={e => setFormData({...formData, postCount: parseInt(e.target.value)})} style={{ ...S.input, cursor: "pointer" }}>{POST_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
        <div><label style={S.label as React.CSSProperties}>Formatos</label><select value={formData.formats} onChange={e => setFormData({...formData, formats: e.target.value})} style={{ ...S.input, cursor: "pointer" }}>{FORMAT_OPTIONS.map(f => <option key={f}>{f}</option>)}</select></div>
      </div>

      {/* Sección: Estrategia */}
      <div style={S.sectionTitle as React.CSSProperties}>
        <span style={{ width: 3, height: 10, background: "var(--cyan)", borderRadius: 2, display: "inline-block" }} />
        Estrategia
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        <div><label style={S.label as React.CSSProperties}>Oferta Comercial</label><textarea value={formData.offer} onChange={e => setFormData({...formData, offer: e.target.value})} style={{ ...S.input, resize: "vertical", minHeight: 52 } as React.CSSProperties} placeholder="Ej. 9GB por $100 con RRSS ilimitadas" /></div>
        <div><label style={S.label as React.CSSProperties}>Comentarios</label><textarea value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} style={{ ...S.input, resize: "vertical", minHeight: 52 } as React.CSSProperties} placeholder="Tono, exclusiones, estilo..." /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {/* Enfoque */}
        <div>
          <label style={S.label as React.CSSProperties}>Enfoque (max 3)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
            {FOCUS_OPTIONS.map(opt => (
              <button key={opt} type="button" onClick={() => handleFocusChange(opt)} style={{
                padding: "5px 11px", fontSize: 10, fontWeight: 600, borderRadius: 6, cursor: "pointer",
                border: `1px solid ${formData.focus.includes(opt) ? "var(--cyan)" : "var(--border)"}`,
                background: formData.focus.includes(opt) ? "var(--cyan-dim)" : "var(--surface-hover)",
                color: formData.focus.includes(opt) ? "var(--cyan)" : "var(--text-muted)",
                transition: "all 0.15s",
              }}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Documentos de Marca */}
        <div>
          <label style={S.label as React.CSSProperties}>Documentos de Marca</label>
          <label htmlFor="brandFiles" style={{
            ...S.input,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            cursor: formData.brandFiles.length >= 5 ? "not-allowed" : "pointer",
            opacity: formData.brandFiles.length >= 5 ? 0.4 : 1,
            border: "1px dashed var(--border-strong)",
            color: "var(--text-muted)",
            padding: "8px 10px",
          }}>
            <FileText style={{ width: 13, height: 13 }} />
            <span style={{ fontSize: 11 }}>{formData.brandFiles.length > 0 ? `${formData.brandFiles.length}/5 archivos` : "Brandbook, voz y tono..."}</span>
          </label>
          <input id="brandFiles" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md" onChange={handleFileChange} disabled={formData.brandFiles.length >= 5} style={{ display: "none" }} />
          {fileNames.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {fileNames.map((name, i) => (
                <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.2)", padding: "2px 8px", borderRadius: 4, fontSize: 10, color: "var(--cyan)" }}>
                  <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                  <button type="button" onClick={() => handleRemoveFile(i)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1, display: "flex" }}><X style={{ width: 10, height: 10 }} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4, borderTop: "1px solid var(--hairline)" }}>
        <button type="submit" disabled={isLoading || !formData.client.trim()} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "9px 24px",
          fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
          background: isLoading ? "var(--surface-hover)" : "var(--cyan-dim)",
          color: isLoading ? "var(--text-muted)" : "var(--cyan)",
          border: `1px solid ${isLoading ? "var(--border)" : "rgba(0,212,255,0.4)"}`,
          borderRadius: 6, cursor: isLoading ? "not-allowed" : "pointer", transition: "all 0.2s",
          boxShadow: isLoading ? "none" : "0 0 20px rgba(0,212,255,0.1)",
          opacity: !formData.client.trim() ? 0.35 : 1,
          marginTop: 12,
        }}>
          {isLoading ? (
            <><svg style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg> Generando brief...</>
          ) : (
            <><Sparkles style={{ width: 13, height: 13 }} /> Generar Parrilla</>
          )}
        </button>
      </div>
    </form>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function BriefingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gridData, setGridData] = useState<ContentGridData | null>(null);

  const handleGenerate = async (formData: GridFormData) => {
    setIsLoading(true); setError(null); setGridData(null);
    try {
      const data = await generateContentGridClient(formData);
      setGridData(data);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Error desconocido"); }
    finally { setIsLoading(false); }
  };

  const updatePost = (index: number, field: keyof Post, value: string) => {
    setGridData(prev => {
      if (!prev) return prev;
      const posts = [...prev.posts];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      posts[index] = { ...posts[index], [field]: value } as any;
      return { ...prev, posts };
    });
  };

  return (
    <PermissionGuard permKey="canAccessBriefing">
      <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 0 }}>

        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--hairline)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(123,97,255,0.1)", border: "1px solid rgba(123,97,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BrainCircuit style={{ width: 18, height: 18, color: "var(--purple)" }} />
            </div>
            <div>
              <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--foreground)", letterSpacing: "0.08em", margin: 0 }}>
                Briefs <span style={{ color: "var(--purple)" }}>IA</span>
              </h1>
              <p style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.06em", margin: 0, marginTop: 2, textTransform: "uppercase" }}>Powered by Gemini 2.5 Flash</p>
            </div>
          </div>
          {gridData && !isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "rgba(123,97,255,0.07)", border: "1px solid rgba(123,97,255,0.2)", borderRadius: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--purple)", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--purple)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Brief generado</span>
            </div>
          )}
        </div>

        {/* ── Setup Form ── */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <SetupForm onGenerate={handleGenerate} isLoading={isLoading} />
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px 0" }}>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} style={{ height: "44px", width: "100%", borderRadius: "8px" }} />
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--purple)", display: "inline-block", animation: "pulse 1.5s ease-in-out infinite" }} />
              <span style={{ fontSize: 10, color: "var(--purple)", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600 }}>
                Procesando con Gemini AI...
              </span>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ marginTop: 8, padding: "10px 14px", background: "var(--red-dim)", border: "1px solid rgba(255,45,85,0.25)", borderRadius: 8, color: "var(--red)", fontSize: 12 }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* ── Results ── */}
        {gridData && !isLoading && <EditableGrid gridData={gridData} updatePost={updatePost} />}

        {/* ── Empty state ── */}
        {!gridData && !isLoading && !error && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", gap: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(123,97,255,0.08)", border: "1px solid rgba(123,97,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BrainCircuit style={{ width: 24, height: 24, color: "var(--purple)" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: "0 0 6px" }}>Sin brief activo</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 320, margin: 0, lineHeight: 1.5 }}>
                Configura los parámetros del proyecto y presiona <strong style={{ color: "var(--cyan)" }}>Generar Parrilla</strong> para iniciar.
              </p>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

/* ═══ EDITABLE GRID ═══ */
function EditableGrid({ gridData, updatePost }: { gridData: ContentGridData; updatePost: (i: number, field: keyof Post, v: string) => void }) {
  const exportToCSV = useCallback(() => {
    const h = [
      "Día","Idea","Enfoque","Copy In","Copy Out","Arte","Formato","Prompt MJ",
      "Video - No. Escenas", "Video - AI Tool", "Video - Prompts Imagenes Escenas", "Video - Prompts Video AI Escenas",
      "Paso a Paso"
    ];
    const rows = gridData.posts.map(p => [
      p.dia, p.ideaPrincipal, p.enfoquePublicacion, p.copyIn, p.copyOut, p.explicacionArte, p.formatoArte, p.masterPromptMidjourney,
      p.videoDetails?.numEscenas ?? 'N/A',
      p.videoDetails?.videoAITool ?? 'N/A',
      p.videoDetails?.promptsEscenasMidjourney?.join('; ') ?? 'N/A',
      p.videoDetails?.promptsVideoAI?.join('; ') ?? 'N/A',
      p.pasoAPaso
    ]);
    const csv = "data:text/csv;charset=utf-8," + [h.join(","), ...rows.map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(","))].join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csv)); link.setAttribute("download", `briefs_${gridData.posts.length}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }, [gridData]);

  const thS: React.CSSProperties = {
    fontSize: 8, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase",
    letterSpacing: "0.1em", padding: "7px 8px", textAlign: "left",
    borderBottom: "1px solid var(--hairline)", whiteSpace: "nowrap",
    background: "var(--surface)", position: "sticky", top: 0, zIndex: 5,
  };
  const tdS: React.CSSProperties = {
    fontSize: 10, padding: "4px 6px", textAlign: "left",
    borderBottom: "1px solid var(--hairline)", color: "var(--foreground)", verticalAlign: "top",
  };
  const editInput: React.CSSProperties = {
    width: "100%", background: "transparent", border: "1px solid transparent",
    borderRadius: 4, padding: "3px 5px", color: "var(--foreground)",
    fontSize: 9, outline: "none", resize: "vertical", minHeight: 22,
    transition: "border-color 0.15s", fontFamily: "inherit",
  };

  return (
    <div style={{ marginTop: 4 }}>
      {/* Grid Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px 10px 0 0", borderBottom: "1px solid var(--hairline)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Orbitron', sans-serif" }}>Parrilla</span>
          <span className="badge badge-muted">{gridData.posts.length} posts</span>
          {gridData.creditos?.summary && (
            <span style={{ fontSize: 9, color: "var(--purple)", fontStyle: "italic" }}>{gridData.creditos.summary}</span>
          )}
        </div>
        <button
          onClick={exportToCSV}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)",
            color: "var(--cyan)", borderRadius: 6, cursor: "pointer",
          }}
        >
          <Download style={{ width: 11, height: 11 }} />
          Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
        <div style={{ overflow: "auto", maxHeight: "calc(100vh - 340px)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ ...thS, width: 36, textAlign: "center" }}>Día</th>
                <th style={{ ...thS, minWidth: 120 }}>Idea</th>
                <th style={{ ...thS, width: 70 }}>Etapa</th>
                <th style={{ ...thS, minWidth: 80 }}>Copy In</th>
                <th style={{ ...thS, minWidth: 130 }}>Copy Out</th>
                <th style={{ ...thS, minWidth: 110 }}>Arte</th>
                <th style={{ ...thS, width: 48 }}>Fmt</th>
                <th style={{ ...thS, minWidth: 140 }}>Prompt MJ</th>
                <th style={{ ...thS, minWidth: 150 }}>Video Details</th>
                <th style={{ ...thS, minWidth: 110 }}>Ejecución</th>
              </tr>
            </thead>
            <tbody>
              {gridData.posts.map((post, i) => (
                <tr
                  key={i}
                  style={{ transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}
                >
                  {/* Día */}
                  <td style={{ ...tdS, fontWeight: 700, color: "var(--cyan)", textAlign: "center", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{post.dia}</td>
                  {/* Idea */}
                  <td style={tdS}><textarea style={editInput} value={post.ideaPrincipal} onChange={e => updatePost(i, "ideaPrincipal", e.target.value)} onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "transparent"} placeholder="Idea..." /></td>
                  {/* Etapa */}
                  <td style={tdS}><span style={{ fontSize: 7, fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: "var(--cyan-dim)", color: "var(--cyan)", whiteSpace: "nowrap", border: "1px solid rgba(0,212,255,0.2)" }}>{post.enfoquePublicacion}</span></td>
                  {/* Copy In */}
                  <td style={tdS}><textarea style={{ ...editInput, fontWeight: 600, color: "var(--foreground)" }} value={post.copyIn} onChange={e => updatePost(i, "copyIn", e.target.value)} onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "transparent"} placeholder="Headline..." /></td>
                  {/* Copy Out */}
                  <td style={tdS}><textarea style={editInput} value={post.copyOut} onChange={e => updatePost(i, "copyOut", e.target.value)} onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "transparent"} placeholder="Body copy..." rows={2} /></td>
                  {/* Arte */}
                  <td style={tdS}><textarea style={editInput} value={post.explicacionArte} onChange={e => updatePost(i, "explicacionArte", e.target.value)} onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "transparent"} placeholder="Dirección de arte..." /></td>
                  {/* Formato */}
                  <td style={tdS}>
                    <span style={{
                      fontSize: 7, fontWeight: 700, padding: "2px 5px", borderRadius: 3,
                      background: post.formatoArte === "Video" ? "rgba(123,97,255,0.1)" : "var(--surface-hover)",
                      color: post.formatoArte === "Video" ? "var(--purple)" : "var(--text-muted)",
                      border: `1px solid ${post.formatoArte === "Video" ? "rgba(123,97,255,0.25)" : "var(--hairline)"}`,
                    }}>{post.formatoArte}</span>
                  </td>
                  {/* Prompt MJ */}
                  <td style={tdS}><textarea style={{ ...editInput, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", fontSize: 8 }} value={post.masterPromptMidjourney} onChange={e => updatePost(i, "masterPromptMidjourney", e.target.value)} onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "transparent"} placeholder="Prompt MJ..." /></td>
                  {/* Video Details */}
                  <td style={tdS}>
                    {post.videoDetails ? (
                      <div style={{ fontSize: 9, color: "var(--text-secondary)" }}>
                        <div style={{ marginBottom: 4 }}><strong style={{ color: "var(--foreground)" }}>Herramienta:</strong> {post.videoDetails.videoAITool}</div>
                        <div style={{ marginBottom: 4 }}><strong style={{ color: "var(--foreground)" }}>Escenas:</strong> {post.videoDetails.numEscenas}</div>
                        {post.videoDetails.promptsEscenasMidjourney?.length > 0 && (
                          <div style={{ marginBottom: 4 }}>
                            <strong style={{ color: "var(--foreground)" }}>Prompts Imagen:</strong>
                            <ul style={{ paddingLeft: 12, margin: "2px 0 0" }}>
                              {post.videoDetails.promptsEscenasMidjourney.map((p, idx) => <li key={idx}><code style={{ color: "var(--cyan)", fontSize: 8 }}>{p}</code></li>)}
                            </ul>
                          </div>
                        )}
                        {post.videoDetails.promptsVideoAI?.length > 0 && (
                          <div>
                            <strong style={{ color: "var(--foreground)" }}>Prompts Video:</strong>
                            <ul style={{ paddingLeft: 12, margin: "2px 0 0" }}>
                              {post.videoDetails.promptsVideoAI.map((p, idx) => <li key={idx}><code style={{ color: "var(--purple)", fontSize: 8 }}>{p}</code></li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : <span style={{ color: "var(--text-muted)", fontSize: 9 }}>N/A</span>}
                  </td>
                  {/* Ejecución */}
                  <td style={tdS}><textarea style={editInput} value={post.pasoAPaso} onChange={e => updatePost(i, "pasoAPaso", e.target.value)} onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "transparent"} placeholder="Pasos..." /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

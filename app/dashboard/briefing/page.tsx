"use client";

import React, { useState, useCallback } from "react";
import { GridFormData, FileInputData, ContentGridData, Post, VideoDetails } from "./types";
import { generateContentGridClient } from "./geminiClient";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { BrainCircuit } from "lucide-react";


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
  input: { width: "100%", background: "rgba(10,15,30,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4, padding: "6px 10px", color: "#e2e8f0", fontSize: 11, outline: "none", transition: "border-color 0.15s" } as React.CSSProperties,
  label: { fontSize: 9, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, display: "block" } as React.CSSProperties,
  sectionTitle: { fontSize: 9, fontWeight: 700, color: "rgba(0,229,0,0.6)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 } as React.CSSProperties,
};

/* ═══ ICONS ═══ */
const LogoIcon = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="24" fill="#000" />
    <path d="M29.68 31.04C28.48 32.24 26.88 33 24.8 33C21.6 33 19.22 31.42 17.66 28.26L20.3 27.06C21.38 29.22 22.88 30.4 24.8 30.4C26.12 30.4 27.02 29.82 27.02 28.66V28.42C26.54 28.82 25.72 29.1 24.56 29.1C21.8 29.1 19.52 27.28 19.52 24.1C19.52 20.92 21.8 19.1 24.56 19.1C25.72 19.1 26.54 19.38 27.02 19.78V19.54C27.02 18.38 26.12 17.8 24.8 17.8C22.88 17.8 21.38 19.02 20.3 21.14L17.66 19.94C19.22 16.78 21.6 15.2 24.8 15.2C26.88 15.2 28.48 15.96 29.68 17.16V31.04ZM27.02 24.1C27.02 22.3 26.12 21.4 24.56 21.4C23 21.4 22.1 22.3 22.1 24.1C22.1 25.9 23 26.8 24.56 26.8C26.12 26.8 27.02 25.9 27.02 24.1Z" fill="#00E500"/>
    <rect x="32" y="30" width="4" height="2" fill="#00E500"/>
    <rect x="32" y="15" width="4" height="12" fill="#00E500"/>
  </svg>
);

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
      <div style={S.sectionTitle as React.CSSProperties}>Proyecto</div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div><label style={S.label as React.CSSProperties}>Cliente</label><input type="text" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} style={S.input} placeholder="Ej. Bait" /></div>
        <div><label style={S.label as React.CSSProperties}>Mes</label><select value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} style={{ ...S.input, cursor: "pointer" }}>{MONTH_OPTIONS.map(m => <option key={m}>{m}</option>)}</select></div>
        <div><label style={S.label as React.CSSProperties}>Posts</label><select value={formData.postCount} onChange={e => setFormData({...formData, postCount: parseInt(e.target.value)})} style={{ ...S.input, cursor: "pointer" }}>{POST_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
        <div><label style={S.label as React.CSSProperties}>Formatos</label><select value={formData.formats} onChange={e => setFormData({...formData, formats: e.target.value})} style={{ ...S.input, cursor: "pointer" }}>{FORMAT_OPTIONS.map(f => <option key={f}>{f}</option>)}</select></div>
      </div>

      <div style={S.sectionTitle as React.CSSProperties}>Estrategia</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div><label style={S.label as React.CSSProperties}>Oferta Comercial</label><textarea value={formData.offer} onChange={e => setFormData({...formData, offer: e.target.value})} style={{ ...S.input, resize: "vertical", minHeight: 44 } as React.CSSProperties} placeholder="Ej. 9GB por $100 con RRSS ilimitadas" /></div>
        <div><label style={S.label as React.CSSProperties}>Comentarios</label><textarea value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} style={{ ...S.input, resize: "vertical", minHeight: 44 } as React.CSSProperties} placeholder="Tono, exclusiones..." /></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={S.label as React.CSSProperties}>Enfoque (max 3)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
            {FOCUS_OPTIONS.map(opt => (
              <button key={opt} type="button" onClick={() => handleFocusChange(opt)} style={{
                padding: "4px 10px", fontSize: 9, fontWeight: 600, borderRadius: 3, border: "none", cursor: "pointer",
                background: formData.focus.includes(opt) ? "#00E500" : "rgba(255,255,255,0.03)",
                color: formData.focus.includes(opt) ? "#000" : "#64748b", transition: "all 0.15s",
              }}>{opt}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={S.label as React.CSSProperties}>Documentos de Marca</label>
          <label htmlFor="brandFiles" style={{ ...S.input, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: formData.brandFiles.length >= 5 ? "not-allowed" : "pointer", opacity: formData.brandFiles.length >= 5 ? 0.4 : 1, border: "1px dashed rgba(255,255,255,0.08)", padding: "6px 10px" }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="rgba(148,163,184,0.65)"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd"/></svg>
            <span style={{ fontSize: 10, color: "#64748b" }}>{formData.brandFiles.length > 0 ? `${formData.brandFiles.length}/5 archivos` : "Brandbook, voz y tono..."}</span>
          </label>
          <input id="brandFiles" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md" onChange={handleFileChange} disabled={formData.brandFiles.length >= 5} style={{ display: "none" }} />
          {fileNames.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {fileNames.map((name, i) => (
                <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(0,229,0,0.06)", padding: "2px 8px", borderRadius: 3, fontSize: 9, color: "#00E500" }}>
                  <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                  <button type="button" onClick={() => handleRemoveFile(i)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 11, padding: 0, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
        <button type="submit" disabled={isLoading || !formData.client.trim()} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 20px", fontSize: 10, fontWeight: 700,
          background: isLoading ? "rgba(0,229,0,0.2)" : "#00E500", color: "#000", border: "none", borderRadius: 4,
          cursor: isLoading ? "not-allowed" : "pointer", transition: "all 0.2s",
          boxShadow: isLoading ? "none" : "0 0 16px rgba(0,229,0,0.12)",
          opacity: !formData.client.trim() ? 0.3 : 1, letterSpacing: "0.05em", textTransform: "uppercase",
        }}>
          {isLoading ? (
            <><svg style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg> Generando...</>
          ) : "Generar Parrilla"}
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
      // 1. Fetch the secure Gemini API Key from our own token endpoint
      const tokenRes = await fetch("/api/gridia/token");
      if (!tokenRes.ok) throw new Error("No se pudo obtener el token de API");
      const { token } = await tokenRes.json();

      // 2. Fetch directly from Google Gemini API (bypassing Vercel's 4.5MB payload limit)
      const data = await generateContentGridClient(formData, token);
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
    <div className="page-enter">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LogoIcon />
          <div>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 700, color: "white", letterSpacing: "0.05em" }}>
              Grid<span style={{ color: "#00E500" }}>IA</span>
            </h1>
            <p style={{ fontSize: 8, color: "rgba(148,163,184,0.65)", letterSpacing: "0.05em" }}>Powered by Gemini 2.5 Flash</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ background: "rgba(255,255,255,0.012)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: 6, padding: 14 }}>
        <SetupForm onGenerate={handleGenerate} isLoading={isLoading} />
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "24px 0" }}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} style={{ height: "48px", width: "100%", borderRadius: "4px" }} />
          ))}
          <div style={{ textAlign: "center", marginTop: "8px" }}>
            <span style={{ fontSize: "10px", color: "rgba(0,229,0,0.6)", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600 }}>
              ACTUALIZANDO HOLOCRÓN (GEMINI AI)...
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 4, color: "#fca5a5", fontSize: 11 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      {gridData && !isLoading && <EditableGrid gridData={gridData} updatePost={updatePost} />}

      {/* Empty state */}
      {!gridData && !isLoading && !error && (
        <EmptyState
          icon={<BrainCircuit className="w-12 h-12" />}
          title="GridIA Inactiva"
          description="Configura los parámetros del proyecto y presiona Generar para iniciar la conexión neuronal."
        />
      )}
    </div>
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
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csv)); link.setAttribute("download", `gridia_${gridData.posts.length}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }, [gridData]);

  const thS: React.CSSProperties = { fontSize: 8, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", padding: "5px 6px", textAlign: "left", borderBottom: "1px solid rgba(0,229,0,0.12)", whiteSpace: "nowrap", background: "#0b0f1e", position: "sticky", top: 0, zIndex: 5 };
  const tdS: React.CSSProperties = { fontSize: 10, padding: "3px 4px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#cbd5e1", verticalAlign: "top" };
  const editInput: React.CSSProperties = { width: "100%", background: "transparent", border: "1px solid transparent", borderRadius: 2, padding: "3px 5px", color: "#e2e8f0", fontSize: 9, outline: "none", resize: "vertical", minHeight: 22, transition: "border-color 0.15s" };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "white", textTransform: "uppercase", letterSpacing: "0.08em" }}>Parrilla</span>
          <span style={{ fontSize: 9, color: "rgba(148,163,184,0.65)" }}>·</span>
          <span style={{ fontSize: 9, color: "rgba(148,163,184,0.65)" }}>{gridData.posts.length} posts</span>
          <span style={{ fontSize: 9, color: "rgba(148,163,184,0.65)" }}>·</span>
          <span style={{ fontSize: 9, color: "rgba(0,229,0,0.5)" }}>{gridData.creditos.summary}</span>
        </div>
        <button onClick={exportToCSV} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 9, fontWeight: 600, background: "transparent", border: "1px solid rgba(0,229,0,0.3)", color: "#00E500", borderRadius: 3, cursor: "pointer" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          CSV
        </button>
      </div>

      <div style={{ background: "#0b0f1e", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ overflow: "auto", maxHeight: "calc(100vh - 320px)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ ...thS, width: 32, textAlign: "center" }}>Día</th>
                <th style={{ ...thS, minWidth: 120 }}>Idea</th>
                <th style={{ ...thS, width: 60 }}>Etapa</th>
                <th style={{ ...thS, minWidth: 80 }}>Copy In</th>
                <th style={{ ...thS, minWidth: 130 }}>Copy Out</th>
                <th style={{ ...thS, minWidth: 110 }}>Arte</th>
                <th style={{ ...thS, width: 44 }}>Fmt</th>
                <th style={{ ...thS, minWidth: 140 }}>Prompt MJ</th>
                <th style={{ ...thS, minWidth: 150 }}>Video Details</th>
                <th style={{ ...thS, minWidth: 110 }}>Ejecución</th>
              </tr>
            </thead>
            <tbody>
              {gridData.posts.map((post, i) => (
                <tr key={i} style={{ transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.012)"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ ...tdS, fontWeight: 700, color: "#00E500", textAlign: "center", fontSize: 11 }}>{post.dia}</td>
                  <td style={tdS}><textarea style={editInput} value={post.ideaPrincipal} onChange={e => updatePost(i, "ideaPrincipal", e.target.value)} onFocus={e => e.target.style.borderColor = "rgba(0,229,0,0.3)"} onBlur={e => e.target.style.borderColor = "transparent"} placeholder="Idea..." /></td>
                  <td style={tdS}><span style={{ fontSize: 7, fontWeight: 700, padding: "1px 4px", borderRadius: 2, background: "rgba(0,229,0,0.08)", color: "rgba(0,229,0,0.7)", whiteSpace: "nowrap" }}>{post.enfoquePublicacion}</span></td>
                  <td style={tdS}><textarea style={{ ...editInput, fontWeight: 600, color: "white" }} value={post.copyIn} onChange={e => updatePost(i, "copyIn", e.target.value)} onFocus={e => e.target.style.borderColor = "rgba(0,229,0,0.3)"} onBlur={e => e.target.style.borderColor = "transparent"} placeholder="Headline..." /></td>
                  <td style={tdS}><textarea style={editInput} value={post.copyOut} onChange={e => updatePost(i, "copyOut", e.target.value)} onFocus={e => e.target.style.borderColor = "rgba(0,229,0,0.3)"} onBlur={e => e.target.style.borderColor = "transparent"} placeholder="Body copy..." rows={2} /></td>
                  <td style={tdS}><textarea style={editInput} value={post.explicacionArte} onChange={e => updatePost(i, "explicacionArte", e.target.value)} onFocus={e => e.target.style.borderColor = "rgba(0,229,0,0.3)"} onBlur={e => e.target.style.borderColor = "transparent"} placeholder="Dirección de arte..." /></td>
                  <td style={tdS}><span style={{ fontSize: 7, fontWeight: 700, padding: "1px 4px", borderRadius: 2, background: post.formatoArte === "Video" ? "rgba(0,229,0,0.1)" : "rgba(148,163,184,0.06)", color: post.formatoArte === "Video" ? "#00E500" : "#64748b" }}>{post.formatoArte}</span></td>
                  <td style={tdS}><textarea style={{ ...editInput, color: "rgba(0,229,0,0.6)", fontFamily: "monospace", fontSize: 8 }} value={post.masterPromptMidjourney} onChange={e => updatePost(i, "masterPromptMidjourney", e.target.value)} onFocus={e => e.target.style.borderColor = "rgba(0,229,0,0.3)"} onBlur={e => e.target.style.borderColor = "transparent"} placeholder="Prompt MJ..." /></td>
                  <td style={tdS}>
                    {post.videoDetails ? (
                      <div style={{ fontSize: 9, color: "#94a3b8" }}>
                        <div style={{ marginBottom: 4 }}><strong style={{ color: "#fff" }}>Herramienta:</strong> {post.videoDetails.videoAITool}</div>
                        <div style={{ marginBottom: 4 }}><strong style={{ color: "#fff" }}>Escenas:</strong> {post.videoDetails.numEscenas}</div>
                        {post.videoDetails.promptsEscenasMidjourney?.length > 0 && (
                          <div style={{ marginBottom: 4 }}>
                            <strong style={{ color: "#fff" }}>Prompts Imagen:</strong>
                            <ul style={{ paddingLeft: 12, margin: "2px 0 0" }}>
                              {post.videoDetails.promptsEscenasMidjourney.map((p, idx) => <li key={idx}><code style={{ color: "#00E500", fontSize: 8 }}>{p}</code></li>)}
                            </ul>
                          </div>
                        )}
                        {post.videoDetails.promptsVideoAI?.length > 0 && (
                          <div>
                            <strong style={{ color: "#fff" }}>Prompts Video:</strong>
                            <ul style={{ paddingLeft: 12, margin: "2px 0 0" }}>
                              {post.videoDetails.promptsVideoAI.map((p, idx) => <li key={idx}><code style={{ color: "#00E500", fontSize: 8 }}>{p}</code></li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : <span style={{ color: "rgba(148,163,184,0.65)", fontSize: 9 }}>N/A</span>}
                  </td>
                  <td style={tdS}><textarea style={editInput} value={post.pasoAPaso} onChange={e => updatePost(i, "pasoAPaso", e.target.value)} onFocus={e => e.target.style.borderColor = "rgba(0,229,0,0.3)"} onBlur={e => e.target.style.borderColor = "transparent"} placeholder="Pasos..." /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

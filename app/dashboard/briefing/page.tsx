"use client";

import React, { useState, useCallback } from "react";

/* ═══ TYPES ═══ */
interface FileInputData { mimeType: string; data: string; }
interface GridFormData {
  client: string; brandFiles: FileInputData[]; offer: string;
  month: string; postCount: number; focus: string[];
  formats: string; comments?: string;
}
interface VideoDetails {
  numEscenas: number; promptsEscenasMidjourney: string[];
  promptsVideoAI: string[]; videoAITool: string;
}
interface Post {
  dia: number; ideaPrincipal: string; enfoquePublicacion: string;
  copyIn: string; copyOut: string; explicacionArte: string;
  formatoArte: "Imagen" | "Video"; masterPromptMidjourney: string;
  videoDetails?: VideoDetails; pasoAPaso: string;
}
interface ContentGridData {
  posts: Post[];
  creditos: { min: number; max: number; summary: string };
}

/* ═══ CONSTANTS ═══ */
const MONTH_OPTIONS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const POST_COUNT_OPTIONS = [4, 6, 8, 10, 12, 16];
const FOCUS_OPTIONS = ["Ventas","Branding","Alcance","Reconocimiento de Marca","Posicionamiento de Marca"];
const FORMAT_OPTIONS = ["Imagen","Video","Ambas"];

/* ═══ STYLES ═══ */
const panelStyle: React.CSSProperties = { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, padding: 20 };
const inputStyle: React.CSSProperties = { width: "100%", background: "rgba(10,15,30,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "8px 12px", color: "#e2e8f0", fontSize: 12, outline: "none" };
const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "rgba(148,163,184,0.5)", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 6, display: "block" };

/* ═══ ICONS ═══ */
const LogoIcon = () => (
  <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
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
    const newFocus = formData.focus.includes(option)
      ? formData.focus.filter(i => i !== option)
      : [...formData.focus, option];
    if (newFocus.length <= 3) setFormData({ ...formData, focus: newFocus });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (formData.brandFiles.length + files.length > 5) { alert("Máximo 5 archivos."); e.target.value = ""; return; }
    const filePromises = Array.from(files).map(file =>
      new Promise<FileInputData>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          const base64Data = result.split(",")[1];
          base64Data ? resolve({ mimeType: file.type, data: base64Data }) : reject(new Error(`Error: ${file.name}`));
        };
        reader.onerror = () => reject(new Error(`Error: ${file.name}`));
        reader.readAsDataURL(file);
      })
    );
    Promise.all(filePromises).then(newFiles => {
      setFormData(prev => ({ ...prev, brandFiles: [...prev.brandFiles, ...newFiles] }));
      setFileNames(prev => [...prev, ...Array.from(files).map(f => f.name)]);
    }).catch(() => alert("Error al procesar archivos."));
    e.target.value = "";
  };

  const handleRemoveFile = (idx: number) => {
    setFormData(prev => ({ ...prev, brandFiles: prev.brandFiles.filter((_, i) => i !== idx) }));
    setFileNames(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onGenerate(formData); };

  return (
    <form onSubmit={handleSubmit}>
      {/* Section: Proyecto */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          Configuración del Proyecto
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Cliente</label>
            <input type="text" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} style={inputStyle} placeholder="Ej. Bait" />
          </div>
          <div>
            <label style={labelStyle}>Mes</label>
            <select value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} style={{ ...inputStyle, cursor: "pointer" }}>
              {MONTH_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>No. Publicaciones</label>
            <select value={formData.postCount} onChange={e => setFormData({...formData, postCount: parseInt(e.target.value)})} style={{ ...inputStyle, cursor: "pointer" }}>
              {POST_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Section: Marca y Estrategia */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          Marca y Estrategia
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Oferta Comercial</label>
            <textarea value={formData.offer} onChange={e => setFormData({...formData, offer: e.target.value})} style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} placeholder="Ej. 9GB por $100 con RRSS ilimitadas" />
          </div>
          <div>
            <label style={labelStyle}>Comentarios Generales</label>
            <textarea value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} placeholder="Instrucciones adicionales, tono específico, exclusiones..." />
          </div>

          {/* Brand files */}
          <div>
            <label style={labelStyle}>Documentos de Marca (Brandbook, Voz y Tono, etc.)</label>
            <label htmlFor="brandFiles" style={{
              ...inputStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: formData.brandFiles.length >= 5 ? "not-allowed" : "pointer",
              opacity: formData.brandFiles.length >= 5 ? 0.5 : 1, border: "1px dashed rgba(255,255,255,0.1)", padding: "10px 12px",
            }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="rgba(148,163,184,0.4)"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd"/></svg>
              <span style={{ fontSize: 11, color: "rgba(148,163,184,0.5)" }}>
                {formData.brandFiles.length > 0 ? `Cargar más... (${formData.brandFiles.length}/5)` : "Seleccionar archivos..."}
              </span>
            </label>
            <input id="brandFiles" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md" onChange={handleFileChange} disabled={formData.brandFiles.length >= 5} style={{ display: "none" }} />
            {fileNames.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                {fileNames.map((name, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)", padding: "6px 10px", borderRadius: 4, fontSize: 11, color: "#cbd5e1" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>{name}</span>
                    <button type="button" onClick={() => handleRemoveFile(i)} style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "none", color: "rgba(148,163,184,0.5)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Focus tags */}
          <div>
            <label style={labelStyle}>Enfoque de la Parrilla (max 3)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {FOCUS_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => handleFocusChange(opt)} style={{
                  padding: "4px 12px", fontSize: 10, fontWeight: 600, borderRadius: 20, border: "none", cursor: "pointer",
                  background: formData.focus.includes(opt) ? "#00E500" : "rgba(255,255,255,0.04)",
                  color: formData.focus.includes(opt) ? "#000" : "rgba(148,163,184,0.5)",
                  transition: "all 0.15s",
                }}>{opt}</button>
              ))}
            </div>
          </div>

          {/* Formats */}
          <div>
            <label style={labelStyle}>Formatos</label>
            <select value={formData.formats} onChange={e => setFormData({...formData, formats: e.target.value})} style={{ ...inputStyle, cursor: "pointer" }}>
              {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
        <button type="submit" disabled={isLoading || !formData.client.trim()} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 28px", fontSize: 12, fontWeight: 700,
          background: isLoading ? "rgba(0,229,0,0.3)" : "#00E500", color: "#000", border: "none", borderRadius: 6,
          cursor: isLoading ? "not-allowed" : "pointer", transition: "all 0.2s",
          boxShadow: isLoading ? "none" : "0 0 20px rgba(0,229,0,0.15)",
          opacity: !formData.client.trim() ? 0.4 : 1,
        }}>
          {isLoading ? (
            <><svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg> Generando...</>
          ) : "Generar Parrilla"}
        </button>
      </div>
    </form>
  );
}

/* ═══ CONTENT GRID DISPLAY ═══ */
function ContentGridDisplay({ gridData }: { gridData: ContentGridData }) {
  const exportToCSV = useCallback(() => {
    if (!gridData) return;
    const headers = ["Día","Idea Principal","Enfoque (Inbound Marketing)","Copy In","Copy Out","Explicación del Arte","Formato","Master Prompt Midjourney","Video - Escenas","Video - AI Tool","Video - Prompts Imagen","Video - Prompts Video","Paso a Paso"];
    const rows = gridData.posts.map(post => [
      post.dia, post.ideaPrincipal, post.enfoquePublicacion, post.copyIn, post.copyOut,
      post.explicacionArte, post.formatoArte, post.masterPromptMidjourney,
      post.videoDetails?.numEscenas ?? "N/A", post.videoDetails?.videoAITool ?? "N/A",
      post.videoDetails?.promptsEscenasMidjourney.join("; ") ?? "N/A",
      post.videoDetails?.promptsVideoAI.join("; ") ?? "N/A", post.pasoAPaso,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `gridia_${gridData.posts.length}_posts.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [gridData]);

  const thS: React.CSSProperties = { fontSize: 8, fontWeight: 700, color: "rgba(148,163,184,0.45)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "6px 10px", textAlign: "left", borderBottom: "1px solid rgba(0,229,0,0.15)", whiteSpace: "nowrap", background: "#0b0f1e" };
  const tdS: React.CSSProperties = { fontSize: 10, padding: "8px 10px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.025)", color: "#cbd5e1", verticalAlign: "top" };

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "white", letterSpacing: "0.05em", textTransform: "uppercase" }}>Parrilla Generada</h2>
          <p style={{ fontSize: 10, color: "rgba(148,163,184,0.5)", marginTop: 2 }}>{gridData.creditos.summary}</p>
        </div>
        <button onClick={exportToCSV} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 10, fontWeight: 600,
          background: "transparent", border: "1px solid #00E500", color: "#00E500", borderRadius: 4, cursor: "pointer",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "#0b0f1e", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ overflow: "auto", maxHeight: "calc(100vh - 400px)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1400 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 5 }}>
              <tr>
                <th style={{ ...thS, width: 40 }}>Día</th>
                <th style={{ ...thS, minWidth: 150 }}>Idea</th>
                <th style={{ ...thS, width: 80 }}>Enfoque</th>
                <th style={{ ...thS, minWidth: 100 }}>Copy In</th>
                <th style={{ ...thS, minWidth: 160 }}>Copy Out</th>
                <th style={{ ...thS, minWidth: 140 }}>Arte</th>
                <th style={{ ...thS, width: 60 }}>Formato</th>
                <th style={{ ...thS, minWidth: 180 }}>Prompt Midjourney</th>
                <th style={{ ...thS, minWidth: 180 }}>Video</th>
                <th style={{ ...thS, minWidth: 140 }}>Paso a Paso</th>
              </tr>
            </thead>
            <tbody>
              {gridData.posts.sort((a, b) => a.dia - b.dia).map((post, i) => (
                <tr key={i} style={{ transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.015)"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ ...tdS, fontWeight: 700, color: "#00E500", textAlign: "center" }}>{post.dia}</td>
                  <td style={tdS}>{post.ideaPrincipal}</td>
                  <td style={tdS}>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: "rgba(0,229,0,0.1)", color: "#00E500" }}>{post.enfoquePublicacion}</span>
                  </td>
                  <td style={{ ...tdS, fontWeight: 600, color: "white" }}>{post.copyIn}</td>
                  <td style={{ ...tdS, maxWidth: 200, whiteSpace: "pre-wrap" }}>{post.copyOut}</td>
                  <td style={{ ...tdS, maxWidth: 180, whiteSpace: "pre-wrap" }}>{post.explicacionArte}</td>
                  <td style={tdS}>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: post.formatoArte === "Video" ? "rgba(0,229,0,0.15)" : "rgba(148,163,184,0.08)", color: post.formatoArte === "Video" ? "#00E500" : "rgba(148,163,184,0.5)" }}>{post.formatoArte}</span>
                  </td>
                  <td style={{ ...tdS, maxWidth: 220 }}>
                    <code style={{ fontSize: 9, color: "#00E500", wordBreak: "break-word" }}>{post.masterPromptMidjourney}</code>
                  </td>
                  <td style={{ ...tdS, maxWidth: 220 }}>
                    {post.videoDetails ? (
                      <div style={{ fontSize: 9 }}>
                        <div style={{ marginBottom: 4 }}><strong style={{ color: "rgba(148,163,184,0.6)" }}>Tool:</strong> <span style={{ color: "#00E500" }}>{post.videoDetails.videoAITool}</span></div>
                        <div style={{ marginBottom: 4 }}><strong style={{ color: "rgba(148,163,184,0.6)" }}>Escenas:</strong> {post.videoDetails.numEscenas}</div>
                        {post.videoDetails.promptsEscenasMidjourney.length > 0 && (
                          <div style={{ marginBottom: 4 }}>
                            <strong style={{ color: "rgba(148,163,184,0.6)" }}>Img Prompts:</strong>
                            {post.videoDetails.promptsEscenasMidjourney.map((p, j) => <div key={j} style={{ marginLeft: 8, color: "#00E500", fontSize: 8 }}>• {p}</div>)}
                          </div>
                        )}
                        {post.videoDetails.promptsVideoAI.length > 0 && (
                          <div>
                            <strong style={{ color: "rgba(148,163,184,0.6)" }}>Video Prompts:</strong>
                            {post.videoDetails.promptsVideoAI.map((p, j) => <div key={j} style={{ marginLeft: 8, color: "#00E500", fontSize: 8 }}>• {p}</div>)}
                          </div>
                        )}
                      </div>
                    ) : <span style={{ color: "rgba(148,163,184,0.15)" }}>—</span>}
                  </td>
                  <td style={{ ...tdS, maxWidth: 180, whiteSpace: "pre-wrap" }}>{post.pasoAPaso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function BriefingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gridData, setGridData] = useState<ContentGridData | null>(null);

  const handleGenerate = async (formData: GridFormData) => {
    setIsLoading(true);
    setError(null);
    setGridData(null);
    try {
      const res = await fetch("/api/gridia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setGridData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <LogoIcon />
        <div>
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 700, color: "white", letterSpacing: "0.05em" }}>
            Grid<span style={{ color: "#00E500" }}>IA</span>
          </h1>
          <p style={{ fontSize: 10, color: "rgba(148,163,184,0.4)" }}>Content Grid Generator · by Lid Marketing</p>
        </div>
      </div>

      {/* Form Panel */}
      <div style={panelStyle}>
        <SetupForm onGenerate={handleGenerate} isLoading={isLoading} />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, marginTop: 16 }}>
          <div style={{ width: 36, height: 36, border: "3px solid rgba(0,229,0,0.15)", borderTopColor: "#00E500", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <span style={{ marginTop: 12, fontSize: 11, color: "rgba(148,163,184,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Generando parrilla con Gemini AI...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, color: "#fca5a5", fontSize: 12 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      {gridData && !isLoading && <ContentGridDisplay gridData={gridData} />}

      {/* Empty state */}
      {!gridData && !isLoading && !error && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(148,163,184,0.25)", fontSize: 11 }}>
          Configure su proyecto y haga clic en &quot;Generar Parrilla&quot; para comenzar.
        </div>
      )}
    </div>
  );
}

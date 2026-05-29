"use client";
import React, { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react";

interface ImportModalProps {
  adAccountId: string;
  level: "campaigns" | "adsets" | "ads";
  onClose: () => void;
  onImported: () => void;
}

interface ParsedRow {
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  objective?: string;
  [key: string]: any;
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  campaigns: ["name"],
  adsets: ["name"],
  ads: ["name"],
};

const TEMPLATE_HEADERS: Record<string, string[]> = {
  campaigns: ["name", "status", "objective", "daily_budget", "lifetime_budget", "special_ad_categories"],
  adsets: ["name", "status", "daily_budget", "lifetime_budget", "optimization_goal", "billing_event", "bid_amount"],
  ads: ["name", "status", "creative_id"],
};

export function ImportModal({ adAccountId, level, onClose, onImported }: ImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const levelLabel = level === "campaigns" ? "campañas" : level === "adsets" ? "conjuntos de anuncios" : "anuncios";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const ext = f.name.split(".").pop()?.toLowerCase();
    try {
      if (ext === "csv") {
        const text = await f.text();
        const Papa = (await import("papaparse")).default;
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        validateAndSet(result.data as any[]);
      } else if (ext === "xlsx" || ext === "xls") {
        const XLSX = await import("xlsx");
        const buffer = await f.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        validateAndSet(data);
      } else {
        setErrors(["Formato no soportado. Usa .csv o .xlsx"]);
      }
    } catch (err: any) {
      setErrors([`Error al leer archivo: ${err.message}`]);
    }
  };

  const validateAndSet = (rows: any[]) => {
    const errs: string[] = [];
    const required = REQUIRED_FIELDS[level];

    if (rows.length === 0) {
      errs.push("El archivo está vacío");
    }

    // Check required fields
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      for (const field of required) {
        if (!headers.includes(field)) {
          errs.push(`Columna obligatoria faltante: "${field}"`);
        }
      }
    }

    // Validate each row
    rows.forEach((row, i) => {
      if (!row.name || String(row.name).trim() === "") {
        errs.push(`Fila ${i + 2}: nombre vacío`);
      }
      if (row.daily_budget && isNaN(parseFloat(row.daily_budget))) {
        errs.push(`Fila ${i + 2}: presupuesto diario no es número`);
      }
    });

    setErrors(errs);
    setParsedRows(rows as ParsedRow[]);
    if (errs.length === 0 && rows.length > 0) {
      setStep(2);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setStep(3);

    const results = { success: 0, failed: 0, errors: [] as string[] };
    const version = "v21.0";

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      try {
        const body: any = { adAccountId };

        if (level === "campaigns") {
          body.name = row.name;
          body.status = row.status || "PAUSED";
          body.objective = row.objective || "OUTCOME_TRAFFIC";
          if (row.daily_budget) body.daily_budget = Math.round(parseFloat(row.daily_budget) * 100);
          if (row.lifetime_budget) body.lifetime_budget = Math.round(parseFloat(row.lifetime_budget) * 100);
          body.special_ad_categories = row.special_ad_categories ? [row.special_ad_categories] : [];
        } else if (level === "adsets") {
          body.name = row.name;
          body.status = row.status || "PAUSED";
          if (row.daily_budget) body.daily_budget = Math.round(parseFloat(row.daily_budget) * 100);
          body.optimization_goal = row.optimization_goal || "LINK_CLICKS";
          body.billing_event = row.billing_event || "IMPRESSIONS";
          if (row.bid_amount) body.bid_amount = Math.round(parseFloat(row.bid_amount) * 100);
        } else {
          body.name = row.name;
          body.status = row.status || "PAUSED";
          if (row.creative_id) body.creative = { creative_id: row.creative_id };
        }

        const res = await fetch(`/api/meta/${level}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (data.success || data.id) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`"${row.name}": ${data.error || "Error desconocido"}`);
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`"${row.name}": ${err.message}`);
      }
    }

    setImportResults(results);
    setImporting(false);
    setStep(4);
  };

  const handleDownloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const headers = TEMPLATE_HEADERS[level];
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      level === "campaigns"
        ? ["Mi campaña ejemplo", "PAUSED", "OUTCOME_TRAFFIC", "50", "", ""]
        : level === "adsets"
        ? ["Mi conjunto ejemplo", "PAUSED", "100", "", "LINK_CLICKS", "IMPRESSIONS", "5"]
        : ["Mi anuncio ejemplo", "PAUSED", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, `plantilla_${level}.xlsx`);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: "12px", background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(148,163,184,0.15)", borderRadius: "6px", color: "white", outline: "none",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 201,
        width: "520px", maxWidth: "90vw", background: "rgba(8,14,28,0.98)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(0,212,255,0.15)", borderRadius: "12px", overflow: "hidden",
        boxShadow: "0 20px 60px -12px rgba(0,0,0,0.7)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700, color: "white" }}>
            <Upload className="w-4 h-4" style={{ color: "var(--cyan)" }} />
            Importar {levelLabel}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(148,163,184,0.5)", cursor: "pointer" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", padding: "12px 20px", gap: "4px" }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{ flex: 1, height: "3px", borderRadius: "2px", background: s <= step ? "var(--cyan)" : "rgba(148,163,184,0.1)" }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "16px 20px", minHeight: "240px" }}>
          {step === 1 && (
            <>
              {/* Upload area */}
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: "2px dashed rgba(0,212,255,0.15)", borderRadius: "10px", padding: "32px 20px",
                  textAlign: "center", cursor: "pointer", transition: "all 0.2s",
                  background: "rgba(0,212,255,0.02)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,212,255,0.35)"; e.currentTarget.style.background = "rgba(0,212,255,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,212,255,0.15)"; e.currentTarget.style.background = "rgba(0,212,255,0.02)"; }}
              >
                <FileSpreadsheet className="w-8 h-8" style={{ color: "rgba(0,212,255,0.3)", margin: "0 auto 10px" }} />
                <div style={{ fontSize: "12px", color: "white", fontWeight: 600, marginBottom: "4px" }}>
                  {file ? file.name : "Arrastra un archivo o haz clic"}
                </div>
                <div style={{ fontSize: "10px", color: "rgba(148,163,184,0.4)" }}>
                  Formatos: .csv, .xlsx — Máximo 500 filas
                </div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} style={{ display: "none" }} />
              </div>

              {/* Download template */}
              <button onClick={handleDownloadTemplate} style={{
                display: "flex", alignItems: "center", gap: "6px", margin: "12px auto 0", padding: "6px 12px",
                fontSize: "10px", fontWeight: 600, color: "var(--cyan)", background: "rgba(0,212,255,0.05)",
                border: "1px solid rgba(0,212,255,0.1)", borderRadius: "6px", cursor: "pointer",
              }}>
                <Download className="w-3 h-3" /> Descargar plantilla .xlsx
              </button>

              {/* Errors */}
              {errors.length > 0 && (
                <div style={{ marginTop: "12px", padding: "10px", background: "rgba(239,68,68,0.05)", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.15)" }}>
                  {errors.map((err, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "#ef4444", marginBottom: "2px" }}>
                      <AlertCircle className="w-3 h-3" style={{ flexShrink: 0 }} /> {err}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ fontSize: "12px", color: "white", fontWeight: 600, marginBottom: "10px" }}>
                Vista previa — {parsedRows.length} {levelLabel} a importar
              </div>
              <div style={{ maxHeight: "200px", overflowY: "auto", borderRadius: "6px", border: "1px solid var(--border)" }} className="custom-scrollbar">
                <table style={{ width: "100%", fontSize: "10px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(0,212,255,0.05)" }}>
                      <th style={{ padding: "6px 8px", textAlign: "left", color: "var(--cyan)", fontWeight: 700 }}>#</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", color: "var(--cyan)", fontWeight: 700 }}>Nombre</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", color: "var(--cyan)", fontWeight: 700 }}>Estado</th>
                      <th style={{ padding: "6px 8px", textAlign: "left", color: "var(--cyan)", fontWeight: 700 }}>Presupuesto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 20).map((row, i) => (
                      <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "4px 8px", color: "rgba(148,163,184,0.4)" }}>{i + 1}</td>
                        <td style={{ padding: "4px 8px", color: "white" }}>{row.name}</td>
                        <td style={{ padding: "4px 8px", color: row.status === "ACTIVE" ? "#34d399" : "rgba(148,163,184,0.5)" }}>{row.status || "PAUSED"}</td>
                        <td style={{ padding: "4px 8px", color: "rgba(148,163,184,0.6)" }}>{row.daily_budget ? `$${row.daily_budget}/día` : row.lifetime_budget ? `$${row.lifetime_budget} total` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 20 && (
                  <div style={{ padding: "6px", fontSize: "9px", color: "rgba(148,163,184,0.3)", textAlign: "center" }}>
                    +{parsedRows.length - 20} filas más...
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--cyan)", margin: "0 auto 12px" }} />
              <div style={{ fontSize: "12px", color: "white", fontWeight: 600 }}>Importando {parsedRows.length} {levelLabel}...</div>
              <div style={{ fontSize: "10px", color: "rgba(148,163,184,0.4)", marginTop: "4px" }}>No cierres esta ventana</div>
            </div>
          )}

          {step === 4 && importResults && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: importResults.failed === 0 ? "#34d399" : "#fbbf24", margin: "0 auto 12px" }} />
              <div style={{ fontSize: "14px", color: "white", fontWeight: 700, marginBottom: "6px" }}>
                Importación completada
              </div>
              <div style={{ fontSize: "12px", color: "rgba(148,163,184,0.7)", marginBottom: "12px" }}>
                ✅ {importResults.success} exitosas · {importResults.failed > 0 ? `❌ ${importResults.failed} fallidas` : "0 errores"}
              </div>
              {importResults.errors.length > 0 && (
                <div style={{ textAlign: "left", maxHeight: "120px", overflowY: "auto", padding: "8px", background: "rgba(239,68,68,0.05)", borderRadius: "6px", fontSize: "9px", color: "#ef4444" }}>
                  {importResults.errors.map((err, i) => <div key={i} style={{ marginBottom: "2px" }}>• {err}</div>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: "8px", padding: "12px 20px", borderTop: "1px solid var(--border)", justifyContent: "flex-end" }}>
          {step === 1 && (
            <button onClick={onClose} style={{ padding: "7px 14px", fontSize: "11px", fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "rgba(148,163,184,0.7)", cursor: "pointer" }}>
              Cancelar
            </button>
          )}
          {step === 2 && (
            <>
              <button onClick={() => { setStep(1); setFile(null); setParsedRows([]); }} style={{ padding: "7px 14px", fontSize: "11px", fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "rgba(148,163,184,0.7)", cursor: "pointer" }}>
                Atrás
              </button>
              <button onClick={handleImport} style={{ padding: "7px 14px", fontSize: "11px", fontWeight: 600, background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: "6px", color: "var(--cyan)", cursor: "pointer" }}>
                Importar {parsedRows.length} {levelLabel}
              </button>
            </>
          )}
          {step === 4 && (
            <button onClick={() => { onImported(); onClose(); }} style={{ padding: "7px 14px", fontSize: "11px", fontWeight: 600, background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: "6px", color: "var(--cyan)", cursor: "pointer" }}>
              Cerrar y actualizar
            </button>
          )}
        </div>
      </div>
    </>
  );
}

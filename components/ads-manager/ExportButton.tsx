"use client";

import React, { useState } from "react";
import { Download, FileText, Table2, ChevronDown, Sheet } from "lucide-react";

interface ExportButtonProps {
  data: any[];
  level: "campaigns" | "adsets" | "ads";
  visibleColumns: string[];
}

function findActionValue(actions: any[], type: string): number {
  if (!actions || !Array.isArray(actions)) return 0;
  const a = actions.find((x: any) => x.action_type === type);
  return a ? parseInt(a.value || "0", 10) : 0;
}

export function ExportButton({ data, level, visibleColumns }: ExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  const columnLabels: Record<string, string> = {
    name: "Nombre", delivery: "Entrega", budget: "Presupuesto", objective: "Objetivo",
    roas: "ROAS", reach: "Alcance", impressions: "Impresiones", cpm: "CPM",
    frequency: "Frecuencia", clicks: "Clics", ctr: "CTR", cpc: "CPC",
    results: "Resultados", conversations: "Conversaciones",
    cost_per_message: "Costo/Msg", cost_per_conversation: "Costo/Conv",
    cpa: "CPA", landing_page_views: "Landing Views", hook_rate: "Hook Rate",
    spend: "Gasto", quality_ranking: "Calidad",
  };

  const getCellValue = (row: any, col: string): string => {
    const ins = row.insights || {};
    switch (col) {
      case "name": return row.name || "";
      case "delivery": return row.effective_status || row.status || "";
      case "budget": {
        const daily = row.daily_budget ? parseFloat(row.daily_budget) / 100 : 0;
        const lifetime = row.lifetime_budget ? parseFloat(row.lifetime_budget) / 100 : 0;
        return daily > 0 ? `$${daily.toFixed(2)} (diario)` : lifetime > 0 ? `$${lifetime.toFixed(2)} (total)` : "CBO";
      }
      case "objective": return row.objective || "";
      case "roas": {
        const r = ins.purchase_roas?.[0]?.value;
        return r ? parseFloat(r).toFixed(2) : "0";
      }
      case "reach": return (ins.reach || 0).toString();
      case "impressions": return (ins.impressions || 0).toString();
      case "cpm": return (ins.cpm || 0).toFixed(2);
      case "frequency": return (ins.frequency || 0).toFixed(2);
      case "clicks": return (ins.clicks || 0).toString();
      case "ctr": return (ins.ctr || 0).toFixed(2);
      case "cpc": return (ins.cpc || 0).toFixed(2);
      case "results": return findActionValue(ins.actions, "link_click").toString();
      case "conversations": return findActionValue(ins.actions, "onsite_conversion.messaging_conversation_started_7d").toString();
      case "spend": return (ins.spend || 0).toFixed(2);
      default: return "";
    }
  };

  const exportCSV = () => {
    const headers = visibleColumns.map(c => columnLabels[c] || c);
    const rows = data.map(row => visibleColumns.map(c => {
      const val = getCellValue(row, c);
      // Escape commas and quotes
      return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }));

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sodare_${level}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  /**
   * Export as XLSX using a lightweight native XML approach.
   * This avoids the vulnerable `xlsx` (SheetJS) library while producing
   * a valid Excel 2007+ Open XML file (.xlsx) without any dependencies.
   */
  const exportXLSX = () => {
    const headers = visibleColumns.map(c => columnLabels[c] || c);
    const rows = data.map(row => visibleColumns.map(c => getCellValue(row, c)));

    // Build simple XML for a spreadsheet
    const escapeXml = (s: string) => s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    const xmlRows = [headers, ...rows].map((row, ri) => {
      const cells = row.map((cell, ci) => {
        const numVal = !isNaN(Number(cell)) && cell !== "" ? Number(cell) : null;
        const addr = `${String.fromCharCode(65 + ci)}${ri + 1}`;
        if (numVal !== null) {
          return `<c r="${addr}"><v>${numVal}</v></c>`;
        }
        return `<c r="${addr}" t="inlineStr"><is><t>${escapeXml(String(cell))}</t></is></c>`;
      }).join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    }).join("");

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${xmlRows}</sheetData></worksheet>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${level.toUpperCase()}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

    // Dynamically import JSZip only when needed (smaller initial bundle)
    import("jszip").then((JSZipModule) => {
      const JSZip = JSZipModule.default;
      const zip = new JSZip();
      zip.file("[Content_Types].xml", contentTypesXml);
      zip.folder("_rels")!.file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
      const xl = zip.folder("xl")!;
      xl.file("workbook.xml", workbookXml);
      xl.folder("_rels")!.file("workbook.xml.rels", relsXml);
      xl.folder("worksheets")!.file("sheet1.xml", sheetXml);

      zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }).then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sodare_${level}_${new Date().toISOString().split("T")[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }).catch(() => {
      // Fallback to CSV if JSZip is unavailable
      exportCSV();
    });
    setShowMenu(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "6px 10px", fontSize: "11px", fontWeight: 600,
          background: "var(--row-hover)", border: "1px solid var(--hairline)",
          borderRadius: "6px", color: "rgba(148,163,184,0.7)", cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--cyan)"; e.currentTarget.style.color = "white"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(148,163,184,0.7)"; }}
      >
        <Download className="w-3.5 h-3.5" /> Exportar <ChevronDown className="w-3 h-3" />
      </button>

      {showMenu && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: "6px",
          background: "rgba(10,18,35,0.97)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(59,130,246,0.15)", borderRadius: "8px",
          padding: "4px", zIndex: 100, minWidth: "160px",
          boxShadow: "0 12px 40px -8px rgba(0,0,0,0.7)",
        }}>
          <button
            onClick={exportXLSX}
            style={{
              width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 10px", fontSize: "11px", color: "var(--foreground)",
              background: "transparent", border: "none", cursor: "pointer", borderRadius: "5px",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,129,251,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Sheet className="w-3.5 h-3.5" style={{ color: "var(--emerald)" }} /> Exportar Excel
          </button>
          <button
            onClick={exportCSV}
            style={{
              width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 10px", fontSize: "11px", color: "var(--foreground)",
              background: "transparent", border: "none", cursor: "pointer", borderRadius: "5px",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,129,251,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Table2 className="w-3.5 h-3.5" style={{ color: "var(--emerald)" }} /> Exportar CSV
          </button>
          <button
            onClick={() => { window.print(); setShowMenu(false); }}
            style={{
              width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 10px", fontSize: "11px", color: "var(--foreground)",
              background: "transparent", border: "none", cursor: "pointer", borderRadius: "5px",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,129,251,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <FileText className="w-3.5 h-3.5" style={{ color: "var(--purple)" }} /> Imprimir / PDF
          </button>
        </div>
      )}
    </div>
  );
}

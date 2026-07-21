/**
 * ZEFIRUS MMM — Generador de reportes
 * CSV de datos + resumen ejecutivo en texto para compartir con el cliente.
 */

import type { WeeklyRow, MmmModel, ChannelConfig } from "./types";

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function generateCsvReport(rows: WeeklyRow[], channels: ChannelConfig[], model: MmmModel): string {
  const enabledCh = channels.filter(c => c.enabled);
  const headers = ["Semana", "Excluida", ...enabledCh.map(c => `Spend_${c.name}`), "Outcome", "Modelo_predicho", "Nota"];

  const csvRows = rows.map((row, i) => [
    row.label,
    row.isOutlier ? "Si" : "No",
    ...enabledCh.map(c => (row.spend[c.id] ?? 0).toFixed(2)),
    row.outcome.toFixed(2),
    (model.modeledSeries[i] ?? 0).toFixed(2),
    row.note ?? "",
  ]);

  const totals = [
    "TOTAL", "",
    ...enabledCh.map(c => rows.reduce((s, r) => s + (r.spend[c.id] ?? 0), 0).toFixed(2)),
    rows.reduce((s, r) => s + r.outcome, 0).toFixed(2),
    model.totalModeled.toFixed(2), "",
  ];

  const all = [headers, ...csvRows, [], totals];
  return all.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
}

// ─── Resumen ejecutivo ────────────────────────────────────────────────────────

export function generateSummaryText(model: MmmModel, channels: ChannelConfig[], currency = "USD"): string {
  const enabledCh = channels.filter(c => c.enabled);
  const fmt = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency, maximumFractionDigits: 0 });
  const fmtPct = (n: number) => (n * 100).toFixed(1) + "%";

  const bestCh = enabledCh.reduce((best, ch) =>
    (model.channelRoas[ch.id] ?? 0) > (model.channelRoas[best?.id ?? ""] ?? -1) ? ch : best,
    enabledCh[0]
  );

  const contribTotal = Object.values(model.contributions).reduce((s, v) => s + v, 0);

  const lines = [
    "=== MEDIA MIX MODELING - RESUMEN EJECUTIVO ===",
    "",
    `Periodo analizado: ${model.weekCount} semanas`,
    `Ajuste del modelo (R2): ${(model.rSquared * 100).toFixed(1)}%`,
    "",
    "--- RESULTADOS GLOBALES ---",
    `Revenue total analizado:    ${fmt(model.totalActual)}`,
    `Revenue organico (base):    ${fmt(model.baseRevenue)} (${fmtPct(1 - model.incrementalShare)})`,
    `Revenue incremental (ads):  ${fmt(model.incrementalRevenue)} (${fmtPct(model.incrementalShare)})`,
    "",
    "--- CONTRIBUCION POR CANAL ---",
    ...enabledCh.map(ch => {
      const roas = model.channelRoas[ch.id] ?? 0;
      const contrib = model.contributions[ch.id] ?? 0;
      const share = contribTotal > 0 ? contrib / contribTotal : 0;
      return `  ${ch.name.padEnd(16)} ROAS: ${roas.toFixed(2)}x | Contribucion: ${fmtPct(share)} | ${fmt(contrib)}`;
    }),
    "",
    "--- HALLAZGOS CLAVE ---",
    bestCh ? `* Canal mas eficiente: ${bestCh.name} con ${(model.channelRoas[bestCh.id] ?? 0).toFixed(2)}x ROAS` : "",
    `* ${fmtPct(model.incrementalShare)} de las ventas son atribuibles a publicidad pagada`,
    `* El modelo explica el ${(model.rSquared * 100).toFixed(0)}% de la variabilidad en ventas`,
    "",
    "Generado por Zefirus Media Mix - " + new Date().toLocaleDateString("es-MX"),
  ];

  return lines.filter(l => l !== undefined).join("\n");
}

// ─── Download helpers ─────────────────────────────────────────────────────────

export function downloadCsv(content: string, filename = "media-mix-datos.csv") {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(content: string, filename = "media-mix-resumen.txt") {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

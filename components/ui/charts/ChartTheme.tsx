/**
 * ChartTheme — defs SVG estándar para Recharts.
 * Montar dentro de cualquier <defs> (o en un <svg> oculto) vía <ChartTheme />.
 * Los stops leen los tokens del tema (app/globals.css), por lo que las gráficas
 * cambian con el tema activo. No hardcodear hex de series: usar CHART_PALETTE.
 */

/** Paleta ordenada para series de gráficas (tokens del tema). */
export const CHART_PALETTE = [
  "var(--fc-accent)",
  "var(--fc-success)",
  "var(--fc-warning)",
  "var(--fc-danger)",
  "var(--fc-module-aria)",
  "var(--fc-module-envivo)",
  "var(--fc-module-escucha)",
  "var(--fc-module-metricas)",
] as const;

export function ChartTheme() {
  return (
    <defs>
      {/* ── Gradientes de área ── */}
      <linearGradient id="colorCyanArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%"  style={{ stopColor: "var(--fc-accent)" }} stopOpacity={0.30} />
        <stop offset="95%" style={{ stopColor: "var(--fc-accent)" }} stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorEmeraldArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%"  style={{ stopColor: "var(--fc-success)" }} stopOpacity={0.28} />
        <stop offset="95%" style={{ stopColor: "var(--fc-success)" }} stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorAmberArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%"  style={{ stopColor: "var(--fc-warning)" }} stopOpacity={0.28} />
        <stop offset="95%" style={{ stopColor: "var(--fc-warning)" }} stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorPurpleArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%"  style={{ stopColor: "var(--fc-module-aria)" }} stopOpacity={0.28} />
        <stop offset="95%" style={{ stopColor: "var(--fc-module-aria)" }} stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorRedArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%"  style={{ stopColor: "var(--fc-danger)" }} stopOpacity={0.28} />
        <stop offset="95%" style={{ stopColor: "var(--fc-danger)" }} stopOpacity={0} />
      </linearGradient>

      {/* ── Gradientes de barra ── */}
      <linearGradient id="colorCyanBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   style={{ stopColor: "var(--fc-accent)" }} />
        <stop offset="100%" style={{ stopColor: "#2563eb" }} />
      </linearGradient>
      <linearGradient id="colorEmeraldBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   style={{ stopColor: "var(--fc-success)" }} />
        <stop offset="100%" style={{ stopColor: "#2b9a67" }} />
      </linearGradient>
      <linearGradient id="colorAmberBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   style={{ stopColor: "var(--fc-warning)" }} />
        <stop offset="100%" style={{ stopColor: "#b8862f" }} />
      </linearGradient>
      <linearGradient id="colorPurpleBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   style={{ stopColor: "var(--fc-module-aria)" }} />
        <stop offset="100%" style={{ stopColor: "#6a6cd8" }} />
      </linearGradient>
      <linearGradient id="colorRedBar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   style={{ stopColor: "var(--fc-danger)" }} />
        <stop offset="100%" style={{ stopColor: "#c03a3e" }} />
      </linearGradient>
    </defs>
  );
}

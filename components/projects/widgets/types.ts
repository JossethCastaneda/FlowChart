/**
 * Shared types and props for project dashboard widgets.
 * These are the computed values calculated in the parent page component
 * and passed down to individual widgets.
 */

export interface ProjectWidgetProps {
  /* ── Budget & Goals ── */
  budgetNum: number;
  cprTarget: number;
  bk: { daily: number; weekly: number; monthly: number; label: string };
  goalNum: number;
  goalBreakdown: { daily: number; weekly: number; monthly: number };

  /* ── Aggregated Metrics ── */
  totalSpend: number;
  totalResults: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  totalActionValue: number;
  cpr: number;
  ctr: number;
  roas: number;
  spendProgress: number;

  /* ── Projections ── */
  daysElapsed: number;
  daysInMonth: number;
  daysRemaining: number;
  idealSpendToday: number;
  spendPace: number;
  projectedResults: number;
  projectedSpend: number;
  goalCompletion: number;
  dailyNeeded: number;
  trackStatus: string;

  /* ── Chart Data ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  timeSeriesData: any[];

  /* ── Channel Config ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  ch: any; // ChannelConfig | undefined

  /* ── Loading State ── */
  isLoading: boolean;

  /* ── Breakdown Data (for heatmap, etc.) ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  breakdownData: Record<string, any[]>;

  /* ── Insights (raw, for finding result actions) ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  insights: any;

  /* ── Formatters (passed down so widgets don't re-import) ── */
  fmtMXN: (n: number) => string;
  fmtMXN0: (n: number) => string;
  fmtNum: (n: number) => string;
  pct: (n: number) => string;
}

/** Props for gasto-specific widgets */
export interface GastoWidgetProps extends ProjectWidgetProps {
  timeGranularity: string;
  setTimeGranularity: (v: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  getSpendTable: () => any[];
}

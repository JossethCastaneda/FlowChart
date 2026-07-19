/**
 * BotMaker API types and analytics result interfaces.
 * Extracted from lib/botmaker.ts for clarity and reuse.
 */

// ── Connection ────────────────────────────────────────────────────────────────

export interface BotmakerConnection {
  baseUrl: string;
  accessToken: string;
}

// ── Raw API shapes (from /sessions) ──────────────────────────────────────────

export interface BmMessage {
  from?: "bot" | "user" | "agent";
  creationTime?: string | number;
  content?: {
    type?: string;
    text?: string;
    /** Botones MOSTRADOS por el bot (array de strings u objetos {label/value}). */
    buttons?: unknown;
    /** Botón ELEGIDO por el usuario (string u objeto {label/value}). */
    selectedButton?: unknown;
    /** Adjunto multimedia (imagen/audio/video/archivo). */
    media?: { type?: string; url?: string; caption?: string } | null;
    /** Ítems de carrusel mostrados. */
    carouselItems?: unknown;
  } & Record<string, unknown>;
}

export interface BmEventInfo {
  typification?: string;
  /** notification-error: tipo/razón del error del bot. */
  error?: string;
  errorType?: string;
  reason?: string;
  messageId?: string;
  /** set-variable: variable capturada por el bot (señal de "pidió este dato"). */
  variableName?: string;
  variableValue?: string;
  /** find-intent: intención disparada / fallback. */
  intentId?: string;
  intentName?: string;
  isFallback?: boolean;
}

export interface BmEvent {
  name?: string;
  creationTime?: string | number;
  info?: BmEventInfo & Record<string, unknown>;
}

export interface BmSession {
  id?: string;
  creationTime?: string | number;
  chat?: { chat?: { contactId?: string; channelId?: string }; lastUserMessageDatetime?: string };
  messages?: BmMessage[];
  events?: BmEvent[];
}

// ── Channels ──────────────────────────────────────────────────────────────────

export type ChannelCanonical = "whatsapp" | "webchat" | "instagram" | "facebook" | "messenger";

export interface BmChannelInfo {
  id: string;
  platform: string;
  canonical: ChannelCanonical | null;
  name: string;
  /** Número de línea (solo WhatsApp). */
  number?: string;
  active: boolean;
}

export interface BotmakerChannelsResult {
  channels: BmChannelInfo[];
  /** # de items que Botmaker devolvió ANTES de filtrar/clasificar. */
  rawCount: number;
  /** Valores distintos de `platform` vistos en la respuesta (para mapear). */
  platforms: string[];
  httpStatus: number;
}

// ── Canonical channels ────────────────────────────────────────────────────────

export const CANONICAL_CHANNELS = ["whatsapp", "messenger", "instagram", "facebook"] as const;
export type CanonicalChannel = (typeof CANONICAL_CHANNELS)[number];

// ── Metrics result types ──────────────────────────────────────────────────────

export interface ResultsMetrics {
  sessionsStarted: number;
  uniqueSessions: number;
  messagesByUser: number;
  messagesByBot: number;
  messagesByAgent: number;
  avgResponseTimeSec: number;
  avgUserResponseTimeSec: number;
  avgBotResponseTimeSec: number;
  avgSessionDurationSec: number;
  topTypifications: { label: string; count: number }[];
  hourlyUniqueSessions: number[];
  topUserQuestions: { text: string; count: number }[];
}

export interface ChannelBreakdown {
  all: ResultsMetrics;
  byChannel: Record<CanonicalChannel, ResultsMetrics>;
  counts: Record<CanonicalChannel | "all", number>;
}

export interface MessageTypeBreakdown {
  total: number;
  byType: { type: string; count: number; pct: number }[];
  userTotal: number;
  botTotal: number;
}

export interface ButtonStats {
  shownMessages: number;
  shownOptions: number;
  selected: number;
  selectRate: number;
  topButtons: { label: string; shown: number; selected: number; ctr: number }[];
}

export interface BotErrorStats {
  total: number;
  sessionsWithError: number;
  perSessionAvg: number;
  byType: { type: string; count: number }[];
}

export interface TimeToSaleStats {
  count: number;
  conversionRate: number;
  avgSec: number;
  medianSec: number;
  distribution: { bucket: string; count: number }[];
}

export interface NipTiming {
  prompted: number;
  delivered: number;
  firstResponseRate: number;
  avgSec: number;
  medianSec: number;
  responded: number;
  respondedRate: number;
  avgRespondedSec: number;
}

export interface FirstMenuReaction {
  total: number;
  byType: { type: string; label: string; count: number; pct: number }[];
}

export interface RejectionStats {
  total: number;
  byReason: { key: string; label: string; count: number }[];
}

export interface SimEsimStats { sim: number; esim: number; sinDato: number }

export interface ReactivationStats {
  withGap: number;
  reactivated: number;
  rate: number;
}

export interface DerivationStats {
  count: number;
  rate: number;
}

export interface DataRequestFunnel {
  method: "set-variable" | "heuristic" | "configured" | "none";
  totalSessions: number;
  steps: { key: string; label: string; reached: number; dropOff: number; dropOffPct: number }[];
}

export interface BotBehavior {
  sampleSize: number;
  responseTimes: { avgBotSec: number; avgUserSec: number; avgFirstResponseSec: number };
  objections: { label: string; count: number }[];
  messageTypes: MessageTypeBreakdown;
  buttons: ButtonStats;
  errors: BotErrorStats;
  firstMenu: FirstMenuReaction;
  timeToSale: TimeToSaleStats;
  nip: NipTiming;
  dataRequestFunnel: DataRequestFunnel;
  globalFunnel2: DataRequestFunnel;
  rejections: RejectionStats;
  simEsim: SimEsimStats;
  reactivations: ReactivationStats;
  derivations: DerivationStats;
}

export interface BotSummary {
  channelId: string;
  name: string;
  platform: string;
  canonical: ChannelCanonical | null;
  number?: string;
  sampleSize: number;
  sales: number;
  conversionRate: number;
  nipPrompted: number;
  nipDeliveredRate: number;
  derivations: DerivationStats;
  reactivations: ReactivationStats;
  firstMenu: FirstMenuReaction;
  funnel2: DataRequestFunnel;
  flowType: string | null;
}

export interface BehaviorByBotOptions {
  flowTypeByChannel?: Record<string, string>;
  defaultFlowType?: string | null;
}

// ── Quality scoring types ─────────────────────────────────────────────────────

export type QualityLevel = "excellent" | "good" | "fair" | "poor";

export interface LeadQualitySubMetric {
  key: string;
  label: string;
  score: number;
  max: number;
  raw: number;
  unit: string;
  tip: string;
}

export interface LeadQualityMetrics {
  score: number;
  level: QualityLevel;
  subMetrics: LeadQualitySubMetric[];
  summary: string;
  recommendation: string;
}

export interface BotQualitySubMetric {
  key: string;
  label: string;
  score: number;
  max: number;
  raw: number;
  unit: string;
  tip: string;
}

export interface BotQualityMetrics {
  score: number;
  level: QualityLevel;
  subMetrics: BotQualitySubMetric[];
  summary: string;
  recommendation: string;
}

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  rate: number;
  dropOff: number;
}

export type Quadrant =
  | "high-lead-high-bot"
  | "high-lead-low-bot"
  | "low-lead-high-bot"
  | "low-lead-low-bot";

export interface PrescriptiveAction {
  priority: number;
  action: string;
  impact: string;
  area: "lead" | "bot" | "ops";
}

export interface ExecutiveDiagnostic {
  funnel: FunnelStage[];
  overallConversion: number;
  quadrant: Quadrant;
  quadrantLabel: string;
  quadrantDiagnosis: string;
  headline: string;
  actions: PrescriptiveAction[];
  bottleneck: { stage: string; dropOff: number; insight: string };
}

export interface ChannelQuality {
  leadQuality: LeadQualityMetrics;
  botQuality: BotQualityMetrics;
  diagnostic: ExecutiveDiagnostic;
}

export interface QualityByChannel {
  all: ChannelQuality;
  byChannel: Record<CanonicalChannel, ChannelQuality>;
}

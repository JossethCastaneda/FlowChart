/**
 * Bot Analytics — pure insight computation from live Botmaker sessions.
 * ============================================================================
 * Built against the REAL v2 data shape (verified 2026-06-24): the behavioural
 * signal lives in `events` (find-intent / go-to / bot-change / conversation-close
 * / notification-error), NOT in set-variable. Breakpoints are encoded in node
 * names: `incorrect of <X>` (invalid answer → retry), `inactivity of <X>`
 * (timeout/silence), `fulfilled of <X>` (step ok). Fallback/intent-miss =
 * executingIntents "Mensaje por defecto".
 *
 * Everything here is a pure function of the input arrays → fully testable and
 * cheap (single passes, O(messages+events)).
 */
import type { BmSession } from "@/lib/botmaker-api";

// ── Public types (shared contract: route + widgets consume these) ────────────

export type Granularity = "hour" | "day" | "week" | "month";

export interface ChannelLite {
  id: string;
  name: string;
  platform: string;
  canonical?: string | null;
}

export interface VarDef {
  name: string;
  type: string;
  category?: string;
}

export interface DashboardOptions {
  from: string;
  to: string;
  timezone: string;
  channels: ChannelLite[];
  /** botId → human bot name (from /intents). */
  botNames: Record<string, string>;
  variables: VarDef[];
  /** Optional channel filter — limit every metric to one channel. */
  channelId?: string | null;
}

export interface Kpis {
  sessions: number;
  users: number;
  messages: number;
  userMessages: number;
  botMessages: number;
  agentMessages: number;
  automationRate: number;   // % sessions resolved without an agent
  agentRate: number;        // % sessions that reached a human agent
  closeRate: number;        // % sessions with a conversation-close
  fallbackRate: number;     // % sessions that hit "Mensaje por defecto"
  errorRate: number;        // % sessions with a delivery error
  retryRate: number;        // % sessions with ≥1 "incorrect of <X>"
  avgFirstResponseSec: number;
  avgSessionDurationSec: number;
  conversionRate: number;   // % sessions typified as a sale
}

export interface TimeBucket {
  bucket: string;     // sortable key
  label: string;      // human label
  sessions: number;
  users: number;
  sales: number;
  fallbacks: number;
  errors: number;
  handoffs: number;
}

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  pct: number;        // % of first step
  dropOff: number;
  dropOffPct: number; // % drop from previous step
}

export interface BreakpointRow {
  field: string;
  prompts: number;        // sessions that reached the field (ok + failed)
  okFirstTry: number;
  okAfterRetry: number;
  failed: number;         // ≥1 incorrect and never fulfilled
  timeouts: number;       // inactivity-of count
  avgAttempts: number;    // mean attempts among sessions that eventually succeeded
  maxAttempts: number;
  failRate: number;       // failed / prompts
}

export interface ButtonRow {
  label: string;
  shown: number;
  selected: number;
  ctr: number;            // selected / shown (0–1)
}

export interface NamedCount { name: string; count: number; pct?: number }

export interface FlowEdge { source: string; target: string; value: number }

export interface ChannelRow {
  id: string;
  name: string;
  platform: string;
  canonical: string | null;
  sessions: number;
  pct: number;
  agentRate: number;
  fallbackRate: number;
}

export interface InsightCard {
  severity: "critical" | "warning" | "ok" | "info";
  title: string;
  detail: string;
}

export interface VariablesSummary {
  total: number;
  byType: NamedCount[];
  byCategory: { category: string; count: number; names: string[] }[];
}

export interface DashboardData {
  meta: {
    from: string;
    to: string;
    timezone: string;
    generatedAt: string;
    channelId: string | null;
  };
  kpis: Kpis;
  timeseries: Record<Granularity, TimeBucket[]>;
  heatmap: number[][];               // [7 weekdays][24 hours]
  funnel: FunnelStep[];
  flowEdges: FlowEdge[];
  breakpoints: BreakpointRow[];      // ranked by impact
  fallback: { sessions: number; rate: number; occurrences: number; topUnrecognized: NamedCount[] };
  buttons: { selectRate: number; rows: ButtonRow[] };
  copies: NamedCount[];              // low-CTR / ignored prompts (problem copies)
  typifications: NamedCount[];
  errors: NamedCount[];
  channels: ChannelRow[];
  bots: NamedCount[];
  intentMiss: NamedCount[];          // top failing nodes (incorrect-of)
  variables: VariablesSummary;
  insights: InsightCard[];
}

// ── time helpers ─────────────────────────────────────────────────────────────

const toMs = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const t = Date.parse(v as string);
  return Number.isNaN(t) ? null : t;
};

interface TzParts { y: number; m: number; d: number; hour: number; weekday: number }

function makeTzResolver(tz: string): (ms: number) => TzParts {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hour12: false, hourCycle: "h23", weekday: "short",
  });
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return (ms: number): TzParts => {
    const parts = fmt.formatToParts(new Date(ms));
    let y = 0, m = 0, d = 0, hour = 0, weekday = 0;
    for (const p of parts) {
      if (p.type === "year") y = +p.value;
      else if (p.type === "month") m = +p.value;
      else if (p.type === "day") d = +p.value;
      else if (p.type === "hour") hour = +p.value % 24;
      else if (p.type === "weekday") weekday = wdMap[p.value] ?? 0;
    }
    return { y, m, d, hour, weekday };
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Monday-of-week date string (YYYY-MM-DD) for a TZ date, computed in UTC space. */
function weekStartKey(p: TzParts): { key: string; label: string } {
  const base = Date.UTC(p.y, p.m - 1, p.d);
  const dow = new Date(base).getUTCDay(); // 0 Sun..6 Sat
  const deltaToMon = (dow + 6) % 7;
  const mon = new Date(base - deltaToMon * 86400000);
  const my = mon.getUTCFullYear(), mm = mon.getUTCMonth() + 1, md = mon.getUTCDate();
  return { key: `${my}-${pad(mm)}-${pad(md)}`, label: `Sem ${pad(md)}/${pad(mm)}` };
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// ── node-name parsing (breakpoints) ──────────────────────────────────────────

const RE_INCORRECT = /^(?:flow\s+)?incorrect of\s+"?(.+?)"?$/i;
const RE_INACTIVITY = /^(?:flow\s+)?inactivity of\s+"?(.+?)"?$/i;
const RE_FULFILLED = /^(?:flow\s+)?fulfilled of\s+"?(.+?)"?$/i;

type NodeKind = "incorrect" | "inactivity" | "fulfilled" | null;
function classifyNode(name: string): { kind: NodeKind; field: string } {
  const n = name.trim();
  let m = RE_INCORRECT.exec(n);
  if (m) return { kind: "incorrect", field: cleanField(m[1]) };
  m = RE_INACTIVITY.exec(n);
  if (m) return { kind: "inactivity", field: cleanField(m[1]) };
  m = RE_FULFILLED.exec(n);
  if (m) return { kind: "fulfilled", field: cleanField(m[1]) };
  return { kind: null, field: "" };
}
function cleanField(s: string): string {
  return s.replace(/^["“']+|["”']+$/g, "").replace(/\s+/g, " ").trim();
}

const FALLBACK_NAMES = new Set(["mensaje por defecto", "mensaje por default", "default message"]);

// ── content helpers (buttons) ────────────────────────────────────────────────

function buttonLabels(content: unknown): string[] {
  const b = (content as { buttons?: unknown })?.buttons;
  if (!Array.isArray(b)) return [];
  const out: string[] = [];
  for (const x of b) {
    let label: unknown;
    if (typeof x === "string") label = x;
    else if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      label = o.label ?? o.text ?? o.title ?? o.value ?? o.name;
    }
    if (typeof label === "string" && label.trim()) out.push(label.trim());
  }
  return out;
}
function selectedLabel(content: unknown): string | null {
  const s = (content as { selectedButton?: unknown })?.selectedButton;
  if (!s) return null;
  if (typeof s === "string") return s.trim() || null;
  const o = s as Record<string, unknown>;
  const v = o.label ?? o.text ?? o.title ?? o.value;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

const SALE_TYP = /(venta|vendid|compr[oó]|exitos)/i;
const SALE_PHRASE = /felicidad/i;
const NEG_TYP = /(abandon|no_resp|no contesta|dejo_de|declina|no_le_interesa|insulto)/i;

function eventName(e: { name?: string }): string { return (e.name || "").toLowerCase(); }

// ── main ─────────────────────────────────────────────────────────────────────

export function computeDashboard(sessionsIn: BmSession[], opts: DashboardOptions): DashboardData {
  const tz = opts.timezone || "America/Mexico_City";
  const resolve = makeTzResolver(tz);

  const channelMap = new Map<string, ChannelLite>();
  for (const c of opts.channels) channelMap.set(c.id, c);

  // Filter by channel and strict creationTime range
  const filterFromMs = new Date(opts.from).getTime();
  const filterToMs = new Date(opts.to).getTime();
  
  const sessions = (Array.isArray(sessionsIn) ? sessionsIn : []).filter((s) => {
    const start = toMs(s.creationTime);
    if (start == null || start < filterFromMs || start > filterToMs) return false;
    
    if (!opts.channelId) return (s.messages || []).length > 0;
    return s.chat?.chat?.channelId === opts.channelId && (s.messages || []).length > 0;
  });

  // ── accumulators ──
  const contacts = new Set<string>();
  let userMessages = 0, botMessages = 0, agentMessages = 0;
  let sessionsWithAgent = 0, sessionsClosed = 0, sessionsFallback = 0, sessionsError = 0, sessionsRetry = 0;
  let sales = 0, resolved = 0, engaged = 0, multiTurn = 0;
  let frtSum = 0, frtN = 0, durSum = 0, durN = 0;

  const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const tsHour = new Map<string, TimeBucket>();
  const tsDay = new Map<string, TimeBucket>();
  const tsWeek = new Map<string, TimeBucket>();
  const tsMonth = new Map<string, TimeBucket>();

  const typ: Record<string, number> = {};
  const errReason: Record<string, number> = {};
  const btnShown: Record<string, number> = {};
  const btnSel: Record<string, number> = {};
  const edges: Record<string, number> = {};
  const botTouch: Record<string, number> = {};
  const unrecognized: Record<string, number> = {};
  let fallbackOccurrences = 0;

  // per-channel
  const chAgg: Record<string, { sessions: number; agent: number; fallback: number }> = {};

  // breakpoints per field
  interface FieldAgg {
    okFirst: number; okRetry: number; failed: number; timeouts: number;
    attemptsSum: number; attemptsN: number; maxAttempts: number; prompts: number;
  }
  const fieldAgg: Record<string, FieldAgg> = {};
  const ensureField = (f: string): FieldAgg =>
    (fieldAgg[f] ||= { okFirst: 0, okRetry: 0, failed: 0, timeouts: 0, attemptsSum: 0, attemptsN: 0, maxAttempts: 0, prompts: 0 });

  const incrTs = (
    map: Map<string, TimeBucket>, key: string, label: string,
    contact: string | undefined, isSale: boolean, isFallback: boolean, isError: boolean, isAgent: boolean
  ) => {
    let b = map.get(key);
    if (!b) { b = { bucket: key, label, sessions: 0, users: 0, sales: 0, fallbacks: 0, errors: 0, handoffs: 0 }; map.set(key, b); }
    b.sessions++;
    if (isSale) b.sales++;
    if (isFallback) b.fallbacks++;
    if (isError) b.errors++;
    if (isAgent) b.handoffs++;
    // users approximated per-bucket by sessions (unique-per-bucket not tracked to save memory)
    if (contact) b.users++;
  };

  for (const s of sessions) {
    const msgs = (s.messages || []).slice().sort((a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0));
    const events = s.events || [];
    const contact = s.chat?.chat?.contactId;
    const channelId = s.chat?.chat?.channelId;
    if (contact) contacts.add(contact);

    // ── messages: counts, first-response, buttons ──
    let uCount = 0, firstUserAt: number | null = null, firstBotAt: number | null = null;
    let lastUserAt: number | null = null;
    let turns = 0; let lastFrom: string | null = null;
    for (const m of msgs) {
      const at = toMs(m.creationTime);
      if (m.from === "user") {
        userMessages++; uCount++;
        if (firstUserAt == null && at != null) firstUserAt = at;
        lastUserAt = at;
      } else if (m.from === "agent") {
        agentMessages++;
        if (firstBotAt == null && firstUserAt != null && at != null) firstBotAt = at;
      } else {
        botMessages++;
        if (firstBotAt == null && firstUserAt != null && at != null) firstBotAt = at;
      }
      if (m.from && m.from !== lastFrom) { turns++; lastFrom = m.from; }
      // buttons shown
      const labels = buttonLabels(m.content);
      for (const l of labels) btnShown[l] = (btnShown[l] || 0) + 1;
      const sel = selectedLabel(m.content);
      if (sel) btnSel[sel] = (btnSel[sel] || 0) + 1;
    }
    if (uCount >= 2) engaged++;
    if (turns >= 4) multiTurn++;
    if (firstUserAt != null && firstBotAt != null && firstBotAt >= firstUserAt) { frtSum += firstBotAt - firstUserAt; frtN++; }

    // ── events: agent, close/typification, errors, fallback, flow, breakpoints ──
    let hasAgent = false, hasError = false, hasFallback = false, hasClose = false, hasRetry = false;
    let sessionTyp: string | null = null;
    let saleByPhrase = false;

    // breakpoint per-session walk (events already roughly chronological; sort to be safe)
    const evSorted = events.slice().sort((a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0));
    const incorrectBefore: Record<string, number> = {};
    const fulfilledDone: Record<string, boolean> = {};
    const sawIncorrect: Record<string, boolean> = {};
    const timeoutField: Record<string, boolean> = {};
    let prevFlowNode: string | null = null;

    for (const e of evSorted) {
      const nm = eventName(e);
      const info = (e.info || {}) as Record<string, unknown>;
      const nodeName = typeof info.name === "string" ? info.name : "";
      const exec = typeof info.executingIntents === "string" ? info.executingIntents : "";

      if (nm === "conversation-close") { hasClose = true; if (typeof info.typification === "string") sessionTyp = info.typification; }
      if (nm === "notification-error") {
        hasError = true;
        const reason = String(info.reason ?? info.error ?? "desconocido").split("|")[0].slice(0, 60).trim();
        errReason[reason] = (errReason[reason] || 0) + 1;
      }
      if (nm.includes("assign") && nm.includes("agent")) hasAgent = true;
      if (nm === "bot-change" && typeof info.currentBotId === "string") botTouch[info.currentBotId] = (botTouch[info.currentBotId] || 0) + 1;

      // fallback detection
      if (FALLBACK_NAMES.has(exec.toLowerCase()) || FALLBACK_NAMES.has(nodeName.toLowerCase())) {
        hasFallback = true; fallbackOccurrences++;
        // nearest preceding user text = unrecognized input
        const et = toMs(e.creationTime) || 0;
        let last: string | null = null;
        for (const m of msgs) {
          if (m.from !== "user") continue;
          const mt = toMs(m.creationTime) || 0;
          if (mt <= et) { const t = (m.content?.text || "").toString().trim(); if (t) last = t; } else break;
        }
        if (last && last.length <= 60) { const k = last.toLowerCase(); unrecognized[k] = (unrecognized[k] || 0) + 1; }
      }

      // flow edges (go-to gives source→target directly)
      if (nm === "find-intent" || nm === "go-to") {
        if (nodeName) {
          const src = (exec || prevFlowNode) as string;
          if (src && src !== nodeName) edges[`${src}|||${nodeName}`] = (edges[`${src}|||${nodeName}`] || 0) + 1;
          prevFlowNode = nodeName;
        }
        // breakpoint classification
        const target = nodeName || exec;
        if (target) {
          const { kind, field } = classifyNode(target);
          if (kind === "incorrect") { incorrectBefore[field] = (incorrectBefore[field] || 0) + 1; sawIncorrect[field] = true; hasRetry = true; }
          else if (kind === "fulfilled") {
            if (!fulfilledDone[field]) {
              fulfilledDone[field] = true;
              const before = incorrectBefore[field] || 0;
              const a = ensureField(field);
              if (before === 0) a.okFirst++; else a.okRetry++;
              a.attemptsSum += before + 1; a.attemptsN++;
              if (before + 1 > a.maxAttempts) a.maxAttempts = before + 1;
            }
          } else if (kind === "inactivity") { timeoutField[field] = true; }
        }
      }
    }

    // finalize breakpoint per session
    for (const f of Object.keys(sawIncorrect)) {
      if (!fulfilledDone[f]) ensureField(f).failed++;
    }
    for (const f of Object.keys(timeoutField)) ensureField(f).timeouts++;

    // agent fallback: any agent message
    if (!hasAgent && msgs.some((m) => m.from === "agent")) hasAgent = true;

    // sale detection
    saleByPhrase = msgs.some((m) => m.from !== "user" && SALE_PHRASE.test((m.content?.text || "").toString()));
    const isSale = saleByPhrase || (sessionTyp != null && SALE_TYP.test(sessionTyp));
    if (isSale) sales++;
    if (sessionTyp) {
      typ[sessionTyp] = (typ[sessionTyp] || 0) + 1;
      if (!NEG_TYP.test(sessionTyp)) resolved++;
    }

    if (hasAgent) sessionsWithAgent++;
    if (hasClose) sessionsClosed++;
    if (hasFallback) sessionsFallback++;
    if (hasError) sessionsError++;
    if (hasRetry) sessionsRetry++;

    // duration
    const start = toMs(s.creationTime);
    const closeEv = evSorted.find((e) => eventName(e) === "conversation-close");
    const end = toMs(closeEv?.creationTime) ?? toMs(msgs[msgs.length - 1]?.creationTime);
    if (start != null && end != null && end >= start) { durSum += end - start; durN++; }

    // channel agg
    if (channelId) {
      const a = (chAgg[channelId] ||= { sessions: 0, agent: 0, fallback: 0 });
      a.sessions++; if (hasAgent) a.agent++; if (hasFallback) a.fallback++;
    }

    // time buckets + heatmap (by session start)
    if (start != null) {
      const p = resolve(start);
      heatmap[p.weekday][p.hour]++;
      const hk = `${p.y}-${pad(p.m)}-${pad(p.d)} ${pad(p.hour)}`;
      incrTs(tsHour, hk, `${pad(p.d)}/${pad(p.m)} ${pad(p.hour)}h`, contact, isSale, hasFallback, hasError, hasAgent);
      const dk = `${p.y}-${pad(p.m)}-${pad(p.d)}`;
      incrTs(tsDay, dk, `${pad(p.d)} ${MONTHS[p.m - 1]}`, contact, isSale, hasFallback, hasError, hasAgent);
      const wk = weekStartKey(p);
      incrTs(tsWeek, wk.key, wk.label, contact, isSale, hasFallback, hasError, hasAgent);
      const mk = `${p.y}-${pad(p.m)}`;
      incrTs(tsMonth, mk, `${MONTHS[p.m - 1]} ${p.y}`, contact, isSale, hasFallback, hasError, hasAgent);
    }
  }

  const total = sessions.length;
  const pctOf = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  const botOnly = Math.max(0, total - sessionsWithAgent);

  const kpis: Kpis = {
    sessions: total,
    users: contacts.size || total,
    messages: userMessages + botMessages + agentMessages,
    userMessages, botMessages, agentMessages,
    automationRate: pctOf(botOnly),
    agentRate: pctOf(sessionsWithAgent),
    closeRate: pctOf(sessionsClosed),
    fallbackRate: pctOf(sessionsFallback),
    errorRate: pctOf(sessionsError),
    retryRate: pctOf(sessionsRetry),
    avgFirstResponseSec: frtN ? Math.round(frtSum / frtN / 1000) : 0,
    avgSessionDurationSec: durN ? Math.round(durSum / durN / 1000) : 0,
    conversionRate: pctOf(sales),
  };

  const sortTs = (m: Map<string, TimeBucket>) => Array.from(m.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
  const timeseries: Record<Granularity, TimeBucket[]> = {
    hour: sortTs(tsHour), day: sortTs(tsDay), week: sortTs(tsWeek), month: sortTs(tsMonth),
  };

  // ── funnel (engagement → resolution, bot-agnostic) ──
  const rawFunnel = [
    { key: "sessions", label: "Sesiones", count: total },
    { key: "engaged", label: "Con interacción (≥2 msgs)", count: engaged },
    { key: "multiTurn", label: "Conversación (≥4 turnos)", count: multiTurn },
    { key: "resolved", label: "Resueltas", count: resolved },
    { key: "sale", label: "Venta / conversión", count: sales },
  ];
  const funnel: FunnelStep[] = rawFunnel.map((s, i) => {
    const prev = i === 0 ? total : rawFunnel[i - 1].count;
    const dropOff = Math.max(0, prev - s.count);
    return {
      key: s.key, label: s.label, count: s.count,
      pct: total ? Math.round((s.count / total) * 1000) / 10 : 0,
      dropOff, dropOffPct: prev ? Math.round((dropOff / prev) * 1000) / 10 : 0,
    };
  });

  // ── breakpoints ──
  const breakpoints: BreakpointRow[] = Object.entries(fieldAgg).map(([field, a]) => {
    const prompts = a.okFirst + a.okRetry + a.failed;
    return {
      field,
      prompts,
      okFirstTry: a.okFirst,
      okAfterRetry: a.okRetry,
      failed: a.failed,
      timeouts: a.timeouts,
      avgAttempts: a.attemptsN ? Math.round((a.attemptsSum / a.attemptsN) * 100) / 100 : 0,
      maxAttempts: a.maxAttempts,
      failRate: prompts ? Math.round((a.failed / prompts) * 1000) / 10 : 0,
    };
  }).sort((a, b) => (b.okAfterRetry + b.failed + b.timeouts) - (a.okAfterRetry + a.failed + a.timeouts));

  // ── flow edges ──
  const flowEdges: FlowEdge[] = Object.entries(edges)
    .map(([k, value]) => { const [source, target] = k.split("|||"); return { source, target, value }; })
    .sort((a, b) => b.value - a.value).slice(0, 40);

  // ── buttons ──
  const btnRows: ButtonRow[] = Object.entries(btnShown).map(([label, shown]) => {
    const selected = btnSel[label] || matchLooseSel(label, btnSel);
    return { label, shown, selected, ctr: shown ? Math.round((selected / shown) * 1000) / 1000 : 0 };
  }).sort((a, b) => b.shown - a.shown);
  const totalShown = btnRows.reduce((s, r) => s + r.shown, 0);
  const totalSel = btnRows.reduce((s, r) => s + r.selected, 0);

  // problem copies: high exposure, low CTR
  const copies: NamedCount[] = btnRows
    .filter((r) => r.shown >= 15 && r.ctr < 0.15)
    .map((r) => ({ name: r.label, count: Math.round(r.ctr * 1000) / 10 }))
    .sort((a, b) => b.count - a.count).slice(0, 12);

  // ── channels ──
  const channels: ChannelRow[] = Object.entries(chAgg).map(([id, a]) => {
    const c = channelMap.get(id);
    return {
      id,
      name: c?.name || prettyChannelId(id),
      platform: c?.platform || "",
      canonical: c?.canonical ?? null,
      sessions: a.sessions,
      pct: total ? Math.round((a.sessions / total) * 1000) / 10 : 0,
      agentRate: a.sessions ? Math.round((a.agent / a.sessions) * 1000) / 10 : 0,
      fallbackRate: a.sessions ? Math.round((a.fallback / a.sessions) * 1000) / 10 : 0,
    };
  }).sort((a, b) => b.sessions - a.sessions);

  // ── bots ──
  const bots: NamedCount[] = Object.entries(botTouch)
    .map(([id, count]) => ({ name: opts.botNames[id] || id, count }))
    .sort((a, b) => b.count - a.count).slice(0, 15);

  // ── intent miss (top failing nodes) ──
  const intentMiss: NamedCount[] = Object.entries(fieldAgg)
    .map(([field, a]) => ({ name: field, count: a.okRetry + a.failed }))
    .filter((x) => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 12);

  // ── typifications / errors ──
  const typifications = sortNamed(typ, total, 14);
  const errors = sortNamed(errReason, 0, 12);
  const topUnrecognized = sortNamed(unrecognized, 0, 12);

  // ── variables dictionary ──
  const byType: Record<string, number> = {};
  const byCat: Record<string, string[]> = {};
  for (const v of opts.variables) {
    byType[v.type] = (byType[v.type] || 0) + 1;
    const cat = (v.category || "Sin categoría").trim() || "Sin categoría";
    (byCat[cat] ||= []).push(v.name);
  }
  const variables: VariablesSummary = {
    total: opts.variables.length,
    byType: Object.entries(byType).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    byCategory: Object.entries(byCat).map(([category, names]) => ({ category, count: names.length, names }))
      .sort((a, b) => b.count - a.count),
  };

  const fallback = {
    sessions: sessionsFallback,
    rate: kpis.fallbackRate,
    occurrences: fallbackOccurrences,
    topUnrecognized,
  };

  const insights = buildInsights(kpis, breakpoints, fallback, copies, errors, funnel, channels);

  return {
    meta: { from: opts.from, to: opts.to, timezone: tz, generatedAt: new Date().toISOString(), channelId: opts.channelId ?? null },
    kpis,
    timeseries,
    heatmap,
    funnel,
    flowEdges,
    breakpoints,
    fallback,
    buttons: { selectRate: totalShown ? Math.round((totalSel / totalShown) * 1000) / 1000 : 0, rows: btnRows.slice(0, 25) },
    copies,
    typifications,
    errors,
    channels,
    bots,
    intentMiss,
    variables,
    insights,
  };
}

// ── small utils ──────────────────────────────────────────────────────────────

function sortNamed(rec: Record<string, number>, total: number, n: number): NamedCount[] {
  return Object.entries(rec)
    .map(([name, count]) => ({ name, count, pct: total ? Math.round((count / total) * 1000) / 10 : undefined }))
    .sort((a, b) => b.count - a.count).slice(0, n);
}

/** selectedButton labels sometimes drop a leading emoji/space vs the shown label. */
function matchLooseSel(label: string, sel: Record<string, number>): number {
  const norm = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  const target = norm(label);
  if (!target) return 0;
  for (const [k, v] of Object.entries(sel)) if (norm(k) === target) return v;
  return 0;
}

function prettyChannelId(id: string): string {
  const m = id.match(/-(whatsapp|messenger|facebook-page|webchat|instagram[_-]?chat?)-?(.*)$/i);
  if (!m) return id.slice(-18);
  const plat = m[1].replace("facebook-page", "Facebook").replace(/instagram.*/i, "Instagram");
  return `${plat.charAt(0).toUpperCase()}${plat.slice(1)} ${m[2].slice(-8)}`.trim();
}

function buildInsights(
  k: Kpis, bp: BreakpointRow[], fb: DashboardData["fallback"], copies: NamedCount[],
  errors: NamedCount[], funnel: FunnelStep[], channels: ChannelRow[]
): InsightCard[] {
  const out: InsightCard[] = [];

  if (fb.rate >= 15) out.push({ severity: "critical", title: `Fallback alto: ${fb.rate}% de sesiones`, detail: `El bot respondió "Mensaje por defecto" en ${fb.sessions} sesiones (${fb.occurrences} veces). Revisa intenciones no cubiertas — top no entendido: ${fb.topUnrecognized[0]?.name ?? "—"}.` });
  else if (fb.rate >= 5) out.push({ severity: "warning", title: `Fallback: ${fb.rate}%`, detail: `Hay intenciones sin cubrir. Mensaje no entendido más común: "${fb.topUnrecognized[0]?.name ?? "—"}".` });

  const worstField = bp.find((b) => b.failRate >= 20 && b.prompts >= 10);
  if (worstField) out.push({ severity: "critical", title: `"${worstField.field}" falla el ${worstField.failRate}%`, detail: `${worstField.failed} de ${worstField.prompts} sesiones nunca dan una respuesta válida en este paso. ${worstField.okAfterRetry} lo logran tras reintentar (avg ${worstField.avgAttempts} intentos).` });

  const retryField = [...bp].sort((a, b) => b.avgAttempts - a.avgAttempts).find((b) => b.avgAttempts >= 1.6 && b.prompts >= 10);
  if (retryField) out.push({ severity: "warning", title: `"${retryField.field}" requiere ${retryField.avgAttempts} intentos`, detail: `En promedio el bot pregunta ${retryField.avgAttempts} veces para obtener una respuesta válida (máx ${retryField.maxAttempts}). Revisa el copy/validación de este campo.` });

  const timeoutField = [...bp].sort((a, b) => b.timeouts - a.timeouts).find((b) => b.timeouts >= Math.max(8, k.sessions * 0.05));
  if (timeoutField) out.push({ severity: "warning", title: `Abandono por inactividad en "${timeoutField.field}"`, detail: `${timeoutField.timeouts} sesiones quedaron en silencio en este paso. Considera un recordatorio o simplificar la pregunta.` });

  if (copies.length) out.push({ severity: "warning", title: `Copys con baja conversión`, detail: `"${copies[0].name}" se muestra mucho pero solo ${copies[0].count}% lo eligen. Reescribe el texto o reduce opciones.` });

  if (errors.length && errors[0].count >= 10) out.push({ severity: "critical", title: `Errores de entrega: ${errors[0].count}`, detail: `"${errors[0].name}" — mensajes que no llegaron (ventana de 24h / cuenta bloqueada). Revisa plantillas HSM y estado de la cuenta WhatsApp.` });

  if (k.agentRate >= 50) out.push({ severity: "warning", title: `Escalación alta: ${k.agentRate}%`, detail: `La mitad o más de las sesiones llegan a un agente humano. Automatiza las preguntas frecuentes para descargar al equipo.` });
  else if (k.automationRate >= 70) out.push({ severity: "ok", title: `Automatización ${k.automationRate}%`, detail: `El bot resuelve la mayoría sin agente. Buen nivel de autoservicio.` });

  const biggestDrop = funnel.slice(1).sort((a, b) => b.dropOffPct - a.dropOffPct)[0];
  if (biggestDrop && biggestDrop.dropOffPct >= 40) out.push({ severity: "info", title: `Mayor caída del funnel en "${biggestDrop.label}"`, detail: `Se pierde ${biggestDrop.dropOffPct}% en este paso (${biggestDrop.dropOff} sesiones). Es el cuello de botella principal.` });

  const worstChannel = channels.filter((c) => c.sessions >= 20).sort((a, b) => b.fallbackRate - a.fallbackRate)[0];
  if (worstChannel && worstChannel.fallbackRate >= 20) out.push({ severity: "info", title: `Canal con más fallback: ${worstChannel.name}`, detail: `${worstChannel.fallbackRate}% de fallback en ${worstChannel.sessions} sesiones. Ese bot/canal necesita más cobertura de intenciones.` });

  if (!out.length) out.push({ severity: "ok", title: "Sin alertas críticas", detail: "No se detectaron puntos de quiebre relevantes en el periodo seleccionado." });
  return out;
}

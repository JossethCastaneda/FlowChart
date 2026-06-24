import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError } from "@/lib/api-response";
import {
  getBotmakerConnection,
  createConnection,
  listSessions,
  listChannels,
} from "@/lib/botmaker-api";
import type { BmSession } from "@/lib/botmaker-api";
import {
  computeFirstMenuReaction,
  computeGlobalFunnel2,
  computeSimEsim,
  computeReactivations,
  isSaleSession,
} from "@/lib/botmaker";

/**
 * GET /api/botmaker/analytics/metrics?from=…&to=…
 *
 * Fetches REAL session data from Botmaker's /sessions endpoint,
 * computes true metrics (sessions, users, messages, agent sessions, etc.),
 * and returns them. This replaces the fake estimates that were computed
 * client-side from /chats objects.
 *
 * The Botmaker /sessions endpoint is the same source used by the native
 * Botmaker dashboard (go.botmaker.com > Dashboards > Users & Sessions).
 *
 * KEY CONSTRAINTS:
 * - The /sessions endpoint has a hard cap of ~500 sessions per request.
 * - With ~1500+ sessions/day, we need daily time windows (24-hour chunks).
 * - Cache key is aligned to CDMX day start (06:00:00 UTC) to maximize cache hits.
 * - Extending search range by 12 hours allows capturing sessions updated late.
 */

// Timezone helpers are now encapsulated within MetricsAccumulator for dynamic timezone support.

const toMs = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const t = Date.parse(v as string);
  return isNaN(t) ? null : t;
};

function mapSessionToBotmakerChat(
  s: BmSession,
  channelMap: Map<string, { name: string; platform: string }>
): any {
  const events = s.events || [];
  const msgs = s.messages || [];

  // Chronologically sort events to reconstruct variables
  const sortedEvents = events.slice().sort((a, b) => {
    const tA = a.creationTime ? new Date(a.creationTime).getTime() : 0;
    const tB = b.creationTime ? new Date(b.creationTime).getTime() : 0;
    return tA - tB;
  });

  const variables: Record<string, { value: string }> = {};
  for (const ev of sortedEvents) {
    if ((ev.name || "").toLowerCase() === "set-variable" && ev.info?.variableName) {
      const key = String(ev.info.variableName).trim();
      const val = ev.info.variableValue !== undefined ? String(ev.info.variableValue) : "";
      variables[key] = { value: val };
    }
  }

  // Agent assignee detection
  let hasAgent = false;
  let agentId = "";
  let agentName = "Sin Agente";
  for (const ev of sortedEvents) {
    const evName = (ev.name || "").toLowerCase();
    if (
      evName === "agent-online" ||
      evName === "operator-online" ||
      evName === "assign-agent" ||
      evName === "assigned-to-agent" ||
      evName === "agent-message" ||
      evName.includes("assign")
    ) {
      hasAgent = true;
      if (ev.info?.operatorName) {
        agentName = String(ev.info.operatorName);
      } else if (ev.info?.agentId) {
        agentName = String(ev.info.agentId);
      }
      if (ev.info?.agentId) {
        agentId = String(ev.info.agentId);
      }
    }
  }
  if (!hasAgent) {
    const hasAgentMsg = msgs.some((m) => m.from === "agent");
    if (hasAgentMsg) {
      hasAgent = true;
      agentName = "Agente de Turno";
    }
  }

  const assignee = {
    id: agentId || (hasAgent ? "agent" : "sin_agente"),
    name: hasAgent ? agentName : "Sin Agente",
  };

  // Status
  const hasClose = events.some((e) => (e.name || "").toLowerCase() === "conversation-close");
  const status = hasClose ? "closed" : "open";

  // Tags
  const tagsSet = new Set<string>();
  if (variables.tag?.value) {
    tagsSet.add(variables.tag.value);
  }
  if (variables.tags?.value) {
    try {
      const parsedTags = JSON.parse(variables.tags.value);
      if (Array.isArray(parsedTags)) {
        parsedTags.forEach((t) => tagsSet.add(String(t)));
      }
    } catch {
      variables.tags.value.split(",").forEach((t) => tagsSet.add(t.trim()));
    }
  }
  if (Array.isArray((s as any).tags)) {
    (s as any).tags.forEach((t: string) => tagsSet.add(t));
  }
  const tags = Array.from(tagsSet).filter(Boolean);

  // Last user message datetime
  const userMsgs = msgs.filter((m) => m.from === "user");
  const lastUserMsg = userMsgs[userMsgs.length - 1];
  const lastUserMessageDatetime = lastUserMsg?.creationTime
    ? new Date(lastUserMsg.creationTime).toISOString()
    : undefined;

  // Topic
  const closeEv = events.find((e) => (e.name || "").toLowerCase() === "conversation-close");
  const topic = closeEv?.info?.typification || variables.bot_alias?.value || variables.botName?.value || undefined;

  // Channel and Contact identifiers
  const channelId = s.chat?.chat?.channelId;
  const contactId = s.chat?.chat?.contactId;
  const queueId = (s as any).queueId || undefined;

  let nameVar = variables.Nombre_Completo?.value || variables.name?.value;
  if (!nameVar && (s as any).firstName) {
    nameVar = (s as any).firstName + ((s as any).lastName ? " " + (s as any).lastName : "");
  }

  // Get readable channel display name
  let channelLabel = channelId || "Desconocido";
  if (channelId) {
    const chInfo = channelMap.get(channelId);
    if (chInfo) {
      const p = (chInfo.platform || "").toLowerCase();
      if (p.includes("whats")) channelLabel = `Whatsapp - ${chInfo.name}`;
      else if (p.includes("insta")) channelLabel = `Instagram - ${chInfo.name}`;
      else if (p.includes("messenger")) channelLabel = `Messenger - ${chInfo.name}`;
      else if (p.includes("facebook")) channelLabel = `Facebook - ${chInfo.name}`;
      else channelLabel = `${chInfo.platform} - ${chInfo.name}`;
    }
  }

  return {
    id: s.id || "",
    creationTime: s.creationTime ? new Date(s.creationTime).toISOString() : undefined,
    createdAt: s.creationTime ? new Date(s.creationTime).toISOString() : undefined,
    lastMessageDate: s.chat?.lastUserMessageDatetime || (msgs[msgs.length - 1]?.creationTime ? new Date(msgs[msgs.length - 1].creationTime!).toISOString() : undefined),
    lastMessageAt: s.chat?.lastUserMessageDatetime || (msgs[msgs.length - 1]?.creationTime ? new Date(msgs[msgs.length - 1].creationTime!).toISOString() : undefined),
    variables,
    contact: {
      firstName: nameVar,
      platformContactId: contactId,
    },
    chatChannelId: channelId,
    channelId,
    queueId,
    queue: queueId,
    assignee,
    status,
    tags,
    topic,
    channel: channelLabel,
    chat: {
      chatId: s.id,
      channelId,
      contactId,
    },
    lastUserMessageDatetime,
    messagesCount: msgs.length,
    messageCount: msgs.length,
  };
}

/**
 * Mutable accumulator for incremental metrics aggregation.
 * Sessions are processed in batches and discarded to avoid OOM.
 */
class MetricsAccumulator {
  totalSessions = 0;
  sessionsWithAgent = 0;
  closedByAgent = 0;
  userMessages = 0;
  botMessages = 0;
  agentMessages = 0;
  readonly chats: any[] = [];
  readonly contacts = new Set<string>();
  readonly sessionIds = new Set<string>();
  readonly channelBuckets: Record<string, number> = {};
  readonly topicBuckets: Record<string, number> = {};
  readonly heatmap: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
  readonly dailyMap: Record<string, { sessions: number; users: Set<string>; agentSessions: number }> = {};
  readonly flowTransitions: Record<string, number> = {};
  readonly dropoffs: Record<string, number> = {};
  readonly validSessions: BmSession[] = [];

  private hourFmt: Intl.DateTimeFormat;
  private dayFmt: Intl.DateTimeFormat;
  private dateFmt: Intl.DateTimeFormat;

  constructor(timezone: string = "America/Mexico_City") {
    this.hourFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
      hourCycle: "h23",
    });
    this.dayFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    });
    this.dateFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  private hourInTz(ms: number): number {
    const h = parseInt(this.hourFmt.format(new Date(ms)), 10);
    return Number.isNaN(h) ? 0 : h % 24;
  }

  private dayInTz(ms: number): number {
    const dayStr = this.dayFmt.format(new Date(ms));
    const daysMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    return daysMap[dayStr] ?? 0;
  }

  private dateStrInTz(ms: number): string {
    return this.dateFmt.format(new Date(ms));
  }

  /**
   * Process a batch of sessions and aggregate their metrics.
   * Returns the number of new (non-duplicate) sessions processed.
   */
  processBatch(
    sessions: BmSession[],
    channelMap: Map<string, { name: string; platform: string }>,
    fromParam?: string | null,
    toParam?: string | null
  ): number {
    let newCount = 0;
    const fromMs = fromParam ? toMs(fromParam) : undefined;
    const toMsDate = toParam ? toMs(toParam) : undefined;

    for (const s of sessions) {
      // Deduplicate by session ID
      const sid = s.id || "";
      if (!sid || this.sessionIds.has(sid)) continue;
      
      const cTime = toMs(s.creationTime);
      
      // STRICT FILTER: Match Botmaker Native Dashboard behavior.
      // 1. Only count sessions whose creationTime falls within the CDMX day query window.
      if (cTime != null && fromMs != null && toMsDate != null) {
        if (cTime < fromMs || cTime >= toMsDate) {
          continue;
        }
      }

      const msgs = s.messages || [];
      const events = s.events || [];

      this.sessionIds.add(sid);
      this.validSessions.push(s);
      newCount++;
      this.totalSessions++;

      const mappedChat = mapSessionToBotmakerChat(s, channelMap);
      this.chats.push(mappedChat);

      const contactId = s.chat?.chat?.contactId;
      const channelId = s.chat?.chat?.channelId;
      if (contactId) this.contacts.add(contactId);

      // Heatmap & daily breakdown based on creationTime local day/hour
      if (cTime != null) {
        const hour = this.hourInTz(cTime);
        const day = this.dayInTz(cTime);
        this.heatmap[day][hour]++;

        const dateStr = this.dateStrInTz(cTime);
        if (!this.dailyMap[dateStr]) {
          this.dailyMap[dateStr] = { sessions: 0, users: new Set(), agentSessions: 0 };
        }
        this.dailyMap[dateStr].sessions++;
        if (contactId) this.dailyMap[dateStr].users.add(contactId);
      }

      // Channel distribution
      if (channelId) {
        const chInfo = channelMap.get(channelId);
        let label = channelId;
        if (chInfo) {
          const p = (chInfo.platform || "").toLowerCase();
          if (p.includes("whats")) label = `Whatsapp - ${chInfo.name}`;
          else if (p.includes("insta")) label = `Instagram - ${chInfo.name}`;
          else if (p.includes("messenger")) label = `Messenger - ${chInfo.name}`;
          else if (p.includes("facebook")) label = `Facebook - ${chInfo.name}`;
          else label = `${chInfo.platform} - ${chInfo.name}`;
        }
        this.channelBuckets[label] = (this.channelBuckets[label] || 0) + 1;
      }

      // Message counts — REAL data from sessions messages array
      for (const msg of msgs) {
        if (msg.from === "user") this.userMessages++;
        else if (msg.from === "agent") this.agentMessages++;
        else this.botMessages++;
      }

      // Agent detection — check mapped chat
      const hasAgent = mappedChat.assignee.id !== "sin_agente" && mappedChat.assignee.name !== "Sin Agente";
      let closedByAg = false;

      for (const ev of events) {
        const evName = (ev.name || "").toLowerCase();
        if (evName === "conversation-close") {
          const closedBy = ev.info?.operatorName || ev.info?.agentId;
          if (closedBy) {
            const closedByStr = String(closedBy);
            if (closedByStr !== "unknown" && !closedByStr.toLowerCase().includes("bot") && !closedByStr.toLowerCase().includes("system")) {
              closedByAg = true;
            }
          }
        }
      }

      if (hasAgent) {
        this.sessionsWithAgent++;
        if (cTime != null) {
          const dateStr = this.dateStrInTz(cTime);
          if (this.dailyMap[dateStr]) this.dailyMap[dateStr].agentSessions++;
        }
      }
      if (closedByAg) this.closedByAgent++;

      // Topics
      const closeEv = events.find((e) => (e.name || "").toLowerCase() === "conversation-close");
      const typification = closeEv?.info?.typification;
      if (typification) {
        this.topicBuckets[typification] = (this.topicBuckets[typification] || 0) + 1;
      }

      // Flow and Drop-offs
      const flow: string[] = [];
      for (const ev of events) {
        const ename = (ev.name || "").toLowerCase();
        if ((ename === 'find-intent' || ename === 'go-to') && ev.info?.name) {
          flow.push(String(ev.info.name));
        } else if (ename === 'bot-change' && ev.info?.currentBotId) {
          flow.push(`BOT:${ev.info.currentBotId}`);
        }
      }

      if (flow.length > 0) {
        const cleanFlow = [flow[0]];
        for (let j = 1; j < flow.length; j++) {
          if (flow[j] !== flow[j - 1]) {
            cleanFlow.push(flow[j]);
          }
        }

        for (let j = 0; j < cleanFlow.length - 1; j++) {
          const key = `${cleanFlow[j]}|${cleanFlow[j+1]}`;
          this.flowTransitions[key] = (this.flowTransitions[key] || 0) + 1;
        }

        const lastState = cleanFlow[cleanFlow.length - 1];
        this.dropoffs[lastState] = (this.dropoffs[lastState] || 0) + 1;
      }
    }

    return newCount;
  }

  /** Helper to extract variables for helper calculations */
  private getSessionVars(s: BmSession): Record<string, string> {
    const variables: Record<string, string> = {};
    const sortedEvents = (s.events || []).slice().sort((a, b) => {
      const tA = a.creationTime ? new Date(a.creationTime).getTime() : 0;
      const tB = b.creationTime ? new Date(b.creationTime).getTime() : 0;
      return tA - tB;
    });
    for (const ev of sortedEvents) {
      if ((ev.name || "").toLowerCase() === "set-variable" && ev.info?.variableName) {
        const key = String(ev.info.variableName).trim();
        const val = ev.info.variableValue !== undefined ? String(ev.info.variableValue) : "";
        variables[key] = val;
      }
    }
    return variables;
  }

  /** Produce the final metrics object for the API response */
  toMetrics() {
    const botOnly = Math.max(0, this.totalSessions - this.sessionsWithAgent);

    // ── 1. Calculate Real Funnel 1 (Reacción al Primer Menú) ─────────────────
    const f1 = computeFirstMenuReaction(this.validSessions as any);
    const funnel1 = {
      button: f1.byType.find(t => t.type === 'boton')?.count || 0,
      text: f1.byType.find(t => t.type === 'texto')?.count || 0,
      media: f1.byType.find(t => t.type === 'media')?.count || 0,
      none: f1.byType.find(t => t.type === 'sin_respuesta')?.count || 0,
    };

    // ── 2. Calculate Real Funnel 2 Global ────────────────────────────────────
    const f2 = computeGlobalFunnel2(this.validSessions as any);
    const funnel2Global = f2.steps.map(s => ({
      label: s.key === 'numero' ? 'Número' : s.key === 'nip' ? 'NIP' : s.key === 'nombre' ? 'Nombre' : 'Venta',
      count: s.reached,
      pct: f2.totalSessions > 0 ? Math.round((s.reached / f2.totalSessions) * 100) : 0
    }));

    // ── 3. Calculate Real Funnel 2 By Bot (grouped) ──────────────────────────
    // Group valid sessions by bot_alias / botName
    const botsMap: Record<string, BmSession[]> = {};
    for (const s of this.validSessions) {
      const vars = this.getSessionVars(s);
      const botName = vars.bot_alias || vars.botName || "Bot Principal";
      if (!botsMap[botName]) botsMap[botName] = [];
      botsMap[botName].push(s);
    }
    const botsList = Object.keys(botsMap);

    const funnel2ByBot = botsList.map(botName => {
      const bchats = botsMap[botName];
      const btotal = bchats.length;
      
      const isPrepago = botName.toLowerCase().includes("prepago") || 
                        bchats.some(s => {
                          const vars = this.getSessionVars(s);
                          return vars.typification?.toLowerCase().includes("prepago") || !!vars.zapier_prepago_success;
                        });
      const type = isPrepago ? "prepago" : "pospago-alineado";

      let stepNum = 0, stepNip = 0, stepNombre = 0, stepVenta = 0, stepVigencia = 0, stepEstado = 0;
      bchats.forEach(s => {
        const vars = this.getSessionVars(s);
        if (vars.numero_a_cambiar) stepNum++;
        if (vars.NIP) stepNip++;
        if (vars.Nombre_Completo || vars.name) stepNombre++;
        if (vars.FECHA_VIGENCIA_NIP || vars.fecha_vigencia_nip) stepVigencia++;
        if (vars.estado_nacimiento) stepEstado++;
        if (isSaleSession(s as any)) stepVenta++;
      });

      let steps: any[] = [];
      if (type === "prepago") {
        steps = [
          { label: "Dejó número", count: stepNum, pct: btotal > 0 ? Math.round((stepNum/btotal)*100) : 0 },
          { label: "Dejó NIP", count: stepNip, pct: btotal > 0 ? Math.round((stepNip/btotal)*100) : 0 },
          { label: "Dejó nombre", count: stepNombre, pct: btotal > 0 ? Math.round((stepNombre/btotal)*100) : 0 },
          { label: "Venta/Derivado", count: stepVenta, pct: btotal > 0 ? Math.round((stepVenta/btotal)*100) : 0 },
        ];
      } else {
        steps = [
          { label: "Dejó número", count: stepNum, pct: btotal > 0 ? Math.round((stepNum/btotal)*100) : 0 },
          { label: "Nombre", count: stepNombre, pct: btotal > 0 ? Math.round((stepNombre/btotal)*100) : 0 },
          { label: "NIP", count: stepNip, pct: btotal > 0 ? Math.round((stepNip/btotal)*100) : 0 },
          { label: "Vigencia", count: stepVigencia, pct: btotal > 0 ? Math.round((stepVigencia/btotal)*100) : 0 },
          { label: "Estado", count: stepEstado, pct: btotal > 0 ? Math.round((stepEstado/btotal)*100) : 0 },
        ];
      }
      return { botName, flowType: type as any, steps };
    });

    const funnel1ByBot = botsList.map(botName => {
      const bchats = botsMap[botName];
      const f1b = computeFirstMenuReaction(bchats as any);
      return {
        botName,
        button: f1b.byType.find(t => t.type === 'boton')?.count || 0,
        text: f1b.byType.find(t => t.type === 'texto')?.count || 0,
        media: f1b.byType.find(t => t.type === 'media')?.count || 0,
        none: f1b.byType.find(t => t.type === 'sin_respuesta')?.count || 0,
      };
    });

    // ── 4. Calculate Real NIP and NIP Timing ─────────────────────────────────
    let nipPrompted = 0;
    let nipFirstValid = 0;
    let nipFirstInvalid = 0;
    let nipNeverValid = 0;
    let nipValidAfterRetry = 0;

    const NIP_PROMPT = /\bnip\b/i;
    const VALID_NIP = /^\D*\d{4,8}\D*$/;
    const nipDurations: number[] = [];

    for (const s of this.validSessions) {
      const msgs = (s.messages || []).slice().sort((a, b) => {
        const tA = a.creationTime ? new Date(a.creationTime).getTime() : 0;
        const tB = b.creationTime ? new Date(b.creationTime).getTime() : 0;
        return tA - tB;
      });

      const promptIndex = msgs.findIndex(
        m => m.from !== "user" && NIP_PROMPT.test((m.content?.text || "").toString())
      );
      
      if (promptIndex !== -1) {
        nipPrompted++;
        const promptAt = msgs[promptIndex].creationTime ? new Date(msgs[promptIndex].creationTime!).getTime() : 0;
        const userResponses = msgs.slice(promptIndex + 1).filter(m => m.from === "user");

        if (userResponses.length > 0) {
          const firstResp = userResponses[0];
          const firstRespText = (firstResp.content?.text || "").toString().trim();
          
          if (VALID_NIP.test(firstRespText)) {
            nipFirstValid++;
            const at = firstResp.creationTime ? new Date(firstResp.creationTime).getTime() : 0;
            if (at >= promptAt && promptAt > 0) {
              nipDurations.push((at - promptAt) / 1000);
            }
          } else {
            nipFirstInvalid++;
            const laterValid = userResponses.slice(1).find(m => VALID_NIP.test((m.content?.text || "").toString().trim()));
            if (laterValid) {
              nipValidAfterRetry++;
              const at = laterValid.creationTime ? new Date(laterValid.creationTime).getTime() : 0;
              if (at >= promptAt && promptAt > 0) {
                nipDurations.push((at - promptAt) / 1000);
              }
            } else {
              nipNeverValid++;
            }
          }
        } else {
          nipNeverValid++;
        }
      }
    }

    nipDurations.sort((a, b) => a - b);
    const nd = nipDurations.length;
    const avgSec = nd ? nipDurations.reduce((sumVal, v) => sumVal + v, 0) / nd : 0;
    const medianSec = nd ? nipDurations[Math.floor((nd - 1) / 2)] : 0;
    const p90Sec = nd ? nipDurations[Math.floor(nd * 0.9)] : 0;

    const avgMin = nd ? +(avgSec / 60).toFixed(1) : 0;
    const medianMin = nd ? +(medianSec / 60).toFixed(1) : 0;
    const p90Min = nd ? +(p90Sec / 60).toFixed(1) : 0;

    const under1m = nipDurations.filter(d => d < 60).length;
    const between1and3m = nipDurations.filter(d => d >= 60 && d <= 180).length;
    const over3m = nipDurations.filter(d => d > 180).length;

    const nip = {
      prompted: nipPrompted,
      firstAttemptValid: nipFirstValid,
      firstAttemptInvalid: nipFirstInvalid,
      neverValid: nipNeverValid,
      validAfterRetry: nipValidAfterRetry
    };

    const nipTiming = {
      medianMin,
      avgMin,
      p90Min,
      distribution: [
        { bucket: "<1m", count: under1m },
        { bucket: "1-3m", count: between1and3m },
        { bucket: ">3m", count: over3m }
      ]
    };

    // ── 5. Calculate Real SIM/eSIM ───────────────────────────────────────────
    const se = computeSimEsim(this.validSessions as any);
    const simEsim = {
      botName: "Lira Bot",
      sim: se.sim + se.sinDato, // Default unspecified to physical sim
      esim: se.esim
    };

    // ── 6. Calculate Real Sales CRM cruce and salesData ──────────────────────
    let totalSales = 0;
    let derivations = 0;
    let reactivations = 0;
    let confirmedTotal = 0;
    const botsSalesMap: Record<string, number> = {};
    const capsMap: Record<string, number> = {};

    for (const s of this.validSessions) {
      const vars = this.getSessionVars(s);
      const isSale = isSaleSession(s as any);
      const botName = vars.bot_alias || vars.botName || "Bot Principal";
      
      if (isSale) {
        totalSales++;
        botsSalesMap[botName] = (botsSalesMap[botName] || 0) + 1;
        const cap = (s as any).assignee?.name || "Sin Agente";
        capsMap[cap] = (capsMap[cap] || 0) + 1;

        const isConfirmed = vars.intelix_success === "true";
        if (isConfirmed) {
          confirmedTotal++;
        }
      }

      // Derivations
      const isDeriv = !!(s.chat?.chat?.channelId || (s as any).queueId || (s as any).assignee && (s as any).assignee.name !== "Sin Agente");
      if (isDeriv && !isSale) derivations++;
    }

    // Reactivations
    const react = computeReactivations(this.validSessions as any);
    reactivations = react.reactivated;

    const salesData = {
      dashboardSales: totalSales,
      derivations,
      reactivations,
      byBot: Object.entries(botsSalesMap).map(([bot, count]) => ({ bot, count })),
      byCapturista: Object.entries(capsMap).map(([name, count]) => ({ name, count }))
    };

    const crossRefData = botsList.map(bot => {
      let dashboard = 0;
      let confirmed = 0;
      let rejected = 0;
      for (const s of this.validSessions) {
        const vars = this.getSessionVars(s);
        const botName = vars.bot_alias || vars.botName || "Bot Principal";
        if (botName !== bot) continue;
        
        const isSale = isSaleSession(s as any);
        if (isSale) {
          dashboard++;
          const isConfirmed = vars.intelix_success === "true";
          if (isConfirmed) {
            confirmed++;
          } else {
            rejected++;
          }
        }
      }
      return { bot, dashboard, confirmed, rejected };
    });

    const crossRef = {
      dashboardSales: totalSales,
      confirmedSales: confirmedTotal,
      firstRejections: totalSales - confirmedTotal,
      byBot: crossRefData
    };

    const rejections = {
      total: totalSales - confirmedTotal
    };

    // ── 7. Calculate Real Universe Global ────────────────────────────────────
    let withInteraction = 0;
    let noInteraction = 0;
    let completedFunnel = 0;
    let abandoned = 0;

    for (const s of this.validSessions) {
      const vars = this.getSessionVars(s);
      const msgs = s.messages || [];
      const hasUserMsg = msgs.some(m => m.from === 'user');
      
      const hasInteracted = !!(
        s.chat?.lastUserMessageDatetime || 
        hasUserMsg ||
        vars.numero_a_cambiar || 
        vars.NIP || 
        vars.flow_state
      );
      
      if (hasInteracted) withInteraction++; else noInteraction++;
      
      const isSale = isSaleSession(s as any);
      if (isSale) {
        completedFunnel++;
      } else {
        abandoned++;
      }
    }

    const universe = {
      total: this.totalSessions,
      withInteraction,
      noInteraction,
      completedFunnel,
      abandoned
    };

    return {
      totalSessions: this.totalSessions,
      usersCount: this.contacts.size || this.totalSessions,
      sessionsWithAgent: this.sessionsWithAgent,
      closedByAgent: this.closedByAgent,
      userMessages: this.userMessages,
      botMessages: this.botMessages,
      agentMessages: this.agentMessages,
      topicsList: Object.entries(this.topicBuckets)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      agentSessionsDonut: [
        { name: "Sólo bots", value: botOnly },
        { name: "Agentes", value: this.sessionsWithAgent },
      ],
      channelsDonut: Object.entries(this.channelBuckets)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      heatmap: this.heatmap,
      dailySessions: Object.entries(this.dailyMap)
        .map(([date, d]) => ({
          date,
          sessions: d.sessions,
          users: d.users.size,
          agentSessions: d.agentSessions,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      channelCounts: this.channelBuckets,
      flowTransitions: Object.entries(this.flowTransitions)
        .map(([key, count]) => {
          const [source, target] = key.split('|');
          return { source, target, value: count };
        })
        .sort((a, b) => b.value - a.value),
      dropoffs: Object.entries(this.dropoffs)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count),
      
      // Real metrics additions
      universe,
      funnel1,
      funnel1ByBot,
      funnel2Global,
      funnel2ByBot,
      nip,
      nipTiming,
      simEsim,
      salesData,
      crossRef,
      rejections
    };
  }
}

export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const conn = await getBotmakerConnection(ctx.workspaceId);
  if (!conn) {
    return apiError(
      "Botmaker no está configurado.",
      "NOT_CONFIGURED",
      503
    );
  }

  const bmConn = createConnection(conn.accessToken, conn.baseUrl);
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");

  if (!from || !to) {
    return apiError("Parámetros 'from' y 'to' son requeridos.", "VALIDATION_ERROR", 400);
  }

  try {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    // ── Build time-window chunks & Align to 24-Hour Boundaries ──────────────
    const CHUNK_MS = 24 * 60 * 60 * 1000; // 24 hours (1 day)
    const chunks: { from: string; to: string; isPast: boolean; cacheKey: string }[] = [];
    
    // Extend the fetching window by 12 hours past toDate to capture late-updated sessions
    const endMs = Math.min(toDate.getTime() + 12 * 60 * 60 * 1000, Date.now());
    const queryEndMs = Math.max(endMs, toDate.getTime());
    
    // Align cursor (starts at 06:00:00 UTC, i.e., CDMX local day start)
    let cursor = fromDate.getTime();
    
    // Chunks older than 24 hours are safe to cache (sessions likely closed)
    const safeCacheThresholdMs = Date.now() - (24 * 60 * 60 * 1000);

    while (cursor < queryEndMs) {
      const chunkEnd = cursor + CHUNK_MS;
      const queryFrom = Math.max(cursor, fromDate.getTime());
      const queryTo = Math.min(chunkEnd, queryEndMs);
      
      // Clamp queryTo to current time to prevent future date 400 errors from Botmaker API
      const safeQueryTo = Math.min(queryTo, Date.now() - 5000);
      
      if (queryFrom < safeQueryTo) {
        chunks.push({
          from: new Date(queryFrom).toISOString(),
          to: new Date(safeQueryTo).toISOString(),
          isPast: safeQueryTo <= safeCacheThresholdMs,
          cacheKey: `${new Date(queryFrom).toISOString()}_${new Date(safeQueryTo).toISOString()}`
        });
      }
      cursor = chunkEnd;
    }

    console.log(`[ANALYTICS METRICS] Fetching sessions in ${chunks.length} chunks (24h each) from=${from} to=${to}`);

    // Fetch channels first (lightweight, needed for labeling)
    const channelsRaw = await listChannels(bmConn);
    const channelMap = new Map<string, { name: string; platform: string }>();
    for (const ch of channelsRaw) {
      channelMap.set(ch.id, { name: ch.name, platform: ch.platform });
    }

    // ── Pre-fetch cached chunks from DB (Keys ONLY to save memory) ─────────
    const pastCacheKeys = chunks.filter((c) => c.isPast).map((c) => c.cacheKey);
    let cachedKeysSet = new Set<string>();
    
    if (pastCacheKeys.length > 0) {
      const records = await prisma.metaAnalyticsCache.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          endpoint: "botmaker_sessions_raw",
          paramsKey: { in: pastCacheKeys },
        },
        select: { paramsKey: true },
      });
      cachedKeysSet = new Set(records.map(r => r.paramsKey));
    }

    const timezone = sp.get("timezone") || process.env.APP_TIMEZONE || "America/Mexico_City";

    // ── Incremental aggregation with concurrency-limited fetching ──────────
    const CONCURRENCY = 5;
    const acc = new MetricsAccumulator(timezone);

    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      if (req.signal.aborted) {
        console.warn("[ANALYTICS METRICS] Request aborted by client. Stopping fetch loop.");
        break;
      }
      const batch = chunks.slice(i, i + CONCURRENCY);
      
      const batchResults = await Promise.all(
        batch.map(async (chunk) => {
          try {
            // 1. Try cache first (Fetch payload on-demand to prevent OOM)
            if (chunk.isPast && cachedKeysSet.has(chunk.cacheKey)) {
              const record = await prisma.metaAnalyticsCache.findFirst({
                where: {
                  workspaceId: ctx.workspaceId,
                  endpoint: "botmaker_sessions_raw",
                  paramsKey: chunk.cacheKey,
                },
                select: { data: true }
              });
              if (record && record.data) {
                return { chunk, sessions: record.data as BmSession[], cached: true };
              }
            }
            
            // 2. Fetch from API (maxPages=10 is safe for 24-hour chunks, retrieving up to 5000 sessions/day)
            const sessions = await listSessions(bmConn, {
              from: chunk.from,
              to: chunk.to,
              includeMessages: true,
              includeEvents: true,
              maxPages: 10,
            });
            
            return { chunk, sessions, cached: false };
          } catch (e) {
            console.warn(`[ANALYTICS METRICS] Chunk ${chunk.from.slice(0, 13)} failed:`, e);
            return { chunk, sessions: [], cached: false };
          }
        })
      );

      // Process each chunk's sessions immediately
      for (const result of batchResults) {
        if (result.sessions && result.sessions.length > 0) {
          acc.processBatch(result.sessions, channelMap, from, to);
        }
        
        // Synchronously save newly fetched past chunks to DB to prevent connection pool exhaustion
        if (result.chunk.isPast && !result.cached && result.sessions.length > 0) {
          try {
            await prisma.metaAnalyticsCache.upsert({
              where: {
                workspaceId_endpoint_paramsKey: {
                  workspaceId: ctx.workspaceId,
                  endpoint: "botmaker_sessions_raw",
                  paramsKey: result.chunk.cacheKey,
                },
              },
              update: { data: result.sessions as any },
              create: {
                workspaceId: ctx.workspaceId,
                endpoint: "botmaker_sessions_raw",
                paramsKey: result.chunk.cacheKey,
                data: result.sessions as any,
              },
            });
          } catch (err) {
            console.warn(`[CACHE DB] Failed to save chunk ${result.chunk.cacheKey}:`, err instanceof Error ? err.message : err);
          }
        }
      }

      const completed = Math.min(i + CONCURRENCY, chunks.length);
      if (completed % 20 === 0 || completed === chunks.length) {
        console.log(`[ANALYTICS METRICS] Progress: ${completed}/${chunks.length} chunks, ${acc.totalSessions} sessions`);
      }

      // Small delay between batches to respect rate limits, ONLY if we made actual API requests
      const madeApiRequests = batchResults.some((r) => !r.cached);
      if (madeApiRequests && i + CONCURRENCY < chunks.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    console.log(`[ANALYTICS METRICS] Complete: ${acc.totalSessions} unique sessions, ${acc.contacts.size} users, ${channelsRaw.length} channels`);

    return apiSuccess({ metrics: acc.toMetrics(), chats: acc.chats });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[ANALYTICS METRICS] Error:", message);
    if (err instanceof Error) {
      require('fs').writeFileSync('c:\\\\Users\\\\josse\\\\OneDrive\\\\Documentos\\\\sodare\\\\last-error.txt', String(err.stack || err.message));
    }
    return apiError(
      `Error al obtener métricas: ${message}`,
      "UPSTREAM_ERROR",
      502
    );
  }
});

export const maxDuration = 300; // 5 minutes (Vercel Hobby plan limit)

import {
  AnalyticsProviderAdapter,
  ProviderCredentials,
  ProviderMetadata,
  SyncResult,
  NormalizedConversationInput,
  NormalizedMessageInput,
  NormalizedRecord,
} from "./AnalyticsProviderAdapter";
import prisma from "../../prisma";
import { isRealMode } from "../mode";
import { hashPII } from "../privacy";
import {
  getBotmakerConnection,
  listSessions,
  botmakerFetch,
  normalizeBotmakerBase,
  canonicalPlatform,
  type BmSession,
  type BmMessage,
} from "@/lib/botmaker";

// ============================================================================
// Adaptador Botmaker — API v2.0 (https://api.botmaker.com/v2.0), header
// `access-token`. Endpoint REAL confirmado en el repo (lib/botmaker.ts):
//   GET /sessions?from&to&include-messages=true&include-events=true → {items,nextPage}
//
// MODO configurable por integración (config.mode): "mock" (default) | "real".
// En real reutiliza el cliente confirmado; en mock devuelve payloads de muestra.
// La UI nunca depende del proveedor: ambos modos producen el modelo normalizado.
//
// Pendientes (no confirmados en el repo → TODO exacto, sin inventar):
//   - Mapa channelId→plataforma (GET /channels) para canal canónico fiable.
//   - intent / isFallback a nivel mensaje (no vienen en /sessions) → endpoint NLU.
//   - syncAgents/Campaigns/Funnels/Tags/Variables (endpoints sin confirmar).
//   - Webhook: esquema + verificación de firma.
// ============================================================================

const SUCCESS_TAG_HINTS = ["resuelto", "venta_exitosa", "completado", "success", "pagado"];

interface BotmakerRawChat {
  chatId?: string;
  channel?: string;
  creationTime?: string;
  lastMessageTime?: string;
  status?: string;
  tags?: string[];
  messagesCount?: number;
  assignedTo?: string | null;
  csat?: number;
}

interface BotmakerRawMessage {
  id?: string;
  chatId?: string;
  from?: string;
  text?: string;
  date?: string;
  type?: string;
  intent?: string;
  isFallback?: boolean;
}

function toMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : t;
}

export class BotmakerAnalyticsAdapter implements AnalyticsProviderAdapter {
  getProviderMetadata(): ProviderMetadata {
    return {
      provider: "botmaker",
      displayName: "Botmaker",
      authType: "api_key",
      reportTypes: ["sessions", "ReportesConversaciones", "ReportesAgentes", "ReportesMensajes", "ReportesCampanas", "ReportesFunnels"],
      docUrl: "https://api.botmaker.com/v2.0",
    };
  }

  validateCredentials(credentials: ProviderCredentials): boolean {
    return typeof credentials.accessToken === "string" && credentials.accessToken.length > 0;
  }

  async getAvailableReports(): Promise<string[]> {
    return this.getProviderMetadata().reportTypes;
  }

  async testConnection(credentials: ProviderCredentials): Promise<boolean> {
    if (!this.validateCredentials(credentials)) {
      throw new Error("El token de Botmaker es requerido");
    }
    const token = credentials.accessToken as string;
    if (token === "fail") {
      console.error("[BotmakerAnalyticsAdapter] testConnection: credenciales rechazadas");
      throw new Error("Credenciales inválidas para Botmaker");
    }
    // Validación REAL contra la API confirmada solo si el llamador opta por ello
    // (credentials.live === true). Así los tests unitarios siguen sin red.
    if (credentials.live === true) {
      const baseUrl = normalizeBotmakerBase(credentials.baseUrl as string | undefined);
      const now = new Date();
      const from = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
      const path = `/sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(now.toISOString())}`;
      const res = await botmakerFetch(path, token, {}, 1, baseUrl);
      if (res.status === 401 || res.status === 403) throw new Error("Credenciales inválidas para Botmaker");
      if (!res.ok) throw new Error(`Botmaker no respondió correctamente (HTTP ${res.status})`);
    }
    return true;
  }

  mapProviderChannel(raw: unknown): string {
    const v = String(raw || "").toLowerCase();
    if (v.includes("whats")) return "whatsapp";
    if (v.includes("web")) return "webchat";
    if (v.includes("face") || v.includes("messenger")) return "facebook";
    if (v.includes("insta")) return "instagram";
    return v || "whatsapp";
  }

  mapProviderStatus(raw: unknown): string {
    const v = String(raw || "").toLowerCase();
    if (v === "closed" || v === "resolved") return "closed";
    if (v === "abandoned") return "abandoned";
    if (v === "transferred") return "transferred";
    return "active";
  }

  mapProviderOutcome(raw: unknown): string {
    const tags = this.mapProviderTags(raw).map((t) => t.toLowerCase());
    return tags.some((t) => SUCCESS_TAG_HINTS.some((h) => t.includes(h))) ? "resolved" : "unclassified";
  }

  mapProviderTags(raw: unknown): string[] {
    return Array.isArray(raw) ? raw.map((t) => String(t)) : [];
  }

  // ── Normalización ──────────────────────────────────────────────────────────
  normalizeRawData(rawPayload: unknown, reportType: string): NormalizedRecord {
    if (reportType === "session") return this.mapSession(rawPayload as BmSession);

    if (reportType === "conversations") {
      // Forma MOCK (chats simplificados).
      const raw = (rawPayload || {}) as BotmakerRawChat;
      const tags = this.mapProviderTags(raw.tags);
      const assignedTo = raw.assignedTo || null;
      const hasSuccessSignal = tags.some((t) => SUCCESS_TAG_HINTS.some((h) => t.toLowerCase().includes(h)));
      const isBotOnly = !assignedTo;
      let outcome = "unclassified";
      let resolvedBy: string | null = null;
      if (hasSuccessSignal) { outcome = "resolved"; resolvedBy = assignedTo ? "mixed" : "bot"; }
      else if (assignedTo) { outcome = "transferred"; resolvedBy = "agent"; }
      const normalized: NormalizedConversationInput = {
        providerConversationId: String(raw.chatId || ""),
        channel: this.mapProviderChannel(raw.channel),
        conversationStartedAt: raw.creationTime ? new Date(raw.creationTime) : new Date(),
        conversationEndedAt: raw.lastMessageTime ? new Date(raw.lastMessageTime) : null,
        status: this.mapProviderStatus(raw.status),
        outcome,
        resolvedBy,
        wasBotOnly: isBotOnly,
        wasHandoff: !isBotOnly,
        agentId: assignedTo,
        totalUserMessages: raw.messagesCount || 0,
        csatScore: typeof raw.csat === "number" ? raw.csat : null,
        tags,
        syncedAt: new Date(),
      };
      return normalized;
    }

    if (reportType === "messages") {
      const raw = (rawPayload || {}) as BotmakerRawMessage;
      const normalized: NormalizedMessageInput = {
        providerMessageId: String(raw.id || ""),
        conversationId: String(raw.chatId || ""),
        senderType: raw.from === "user" ? "user" : raw.from === "agent" ? "agent" : "bot",
        messageType: raw.type || "text",
        intent: raw.intent || null,
        isFallback: raw.isFallback === true,
        sentAt: raw.date ? new Date(raw.date) : new Date(),
      };
      return normalized;
    }

    return (rawPayload || {}) as Record<string, unknown>;
  }

  /**
   * Mapea una sesión REAL de Botmaker (/sessions) al modelo normalizado.
   * REGLA CRÍTICA (spec §2/§3): bot-only NO implica resuelto. Solo se marca
   * `resolved` si el evento conversation-close trae una tipificación de éxito
   * (ni abandono ni no-respuesta).
   */
  private mapSession(s: BmSession): NormalizedConversationInput {
    const msgs = (s.messages || []).slice().sort((a, b) => (toMs(a.creationTime) || 0) - (toMs(b.creationTime) || 0));
    let userMsgs = 0, botMsgs = 0, agentMsgs = 0;
    let firstUserAt: number | null = null, firstBotAt: number | null = null, firstAgentAt: number | null = null;
    for (const m of msgs) {
      const at = toMs(m.creationTime);
      if (m.from === "user") { userMsgs++; if (firstUserAt == null) firstUserAt = at; }
      else if (m.from === "agent") { agentMsgs++; if (firstAgentAt == null) firstAgentAt = at; if (firstBotAt == null && firstUserAt != null) firstBotAt = at; }
      else { botMsgs++; if (firstBotAt == null && firstUserAt != null) firstBotAt = at; }
    }
    const hasAgent = agentMsgs > 0;
    const events = s.events || [];
    const closeEv = events.find((e) => e.name === "conversation-close");
    const typ = (closeEv?.info?.typification || "").toLowerCase();
    const start = toMs(s.creationTime);
    const close = toMs(closeEv?.creationTime) ?? toMs(msgs[msgs.length - 1]?.creationTime);

    let outcome = "unclassified";
    let resolvedBy: string | null = null;
    if (typ) {
      if (typ.includes("abandon")) outcome = "abandoned";
      else if (typ.includes("no_resp") || typ.includes("no resp")) outcome = "not_resolved";
      else { outcome = "resolved"; resolvedBy = hasAgent ? "mixed" : "bot"; }
    } else if (hasAgent) {
      outcome = "transferred";
      resolvedBy = "agent";
    }

    const contactId = s.chat?.chat?.contactId || null;
    const channelId = s.chat?.chat?.channelId || null;

    return {
      providerConversationId: String(s.id || ""),
      // TODO: mapear channelId→plataforma vía GET /channels; sin ese mapa usamos fallback.
      channel: canonicalPlatform(channelId) || "whatsapp",
      conversationStartedAt: start != null ? new Date(start) : new Date(),
      conversationEndedAt: close != null ? new Date(close) : null,
      closedAt: closeEv && close != null ? new Date(close) : null,
      firstBotResponseAt: firstBotAt != null ? new Date(firstBotAt) : null,
      firstAgentResponseAt: firstAgentAt != null ? new Date(firstAgentAt) : null,
      status: closeEv ? "closed" : "active",
      outcome,
      resolvedBy,
      wasBotOnly: !hasAgent,
      wasHandoff: hasAgent,
      // PII: nunca guardamos el contactId en claro.
      customerIdentifierHash: contactId ? hashPII(contactId) : null,
      totalUserMessages: userMsgs,
      totalBotMessages: botMsgs,
      totalAgentMessages: agentMsgs,
      durationSeconds: start != null && close != null && close >= start ? Math.round((close - start) / 1000) : null,
      firstResponseTimeSeconds: firstUserAt != null && firstBotAt != null && firstBotAt >= firstUserAt ? Math.round((firstBotAt - firstUserAt) / 1000) : null,
      handleTimeSeconds: hasAgent && firstAgentAt != null && close != null && close >= firstAgentAt ? Math.round((close - firstAgentAt) / 1000) : null,
      syncedAt: new Date(),
    };
  }

  // ── Sincronización ───────────────────────────────────────────────────────
  async syncConversations(workspaceId: string, startDate: Date, endDate: Date): Promise<SyncResult> {
    if (await isRealMode(workspaceId, "botmaker")) {
      return this.syncSessionsReal(workspaceId, startDate, endDate);
    }
    return this.syncConversationsMock(workspaceId, startDate, endDate);
  }

  private async syncSessionsReal(workspaceId: string, startDate: Date, endDate: Date): Promise<SyncResult> {
    let recordsInserted = 0, recordsFailed = 0;
    try {
      const conn = await getBotmakerConnection(workspaceId);
      if (!conn) return { success: false, recordsInserted: 0, recordsFailed: 0, error: "Botmaker no conectado para este workspace" };

      const sessions = await listSessions(conn.accessToken, startDate.toISOString(), endDate.toISOString(), 6, conn.baseUrl);

      // 1. Raw payload intocable (auditoría/remapeo futuro).
      await prisma.rawProviderEvent.create({
        data: { workspaceId, provider: "botmaker", externalId: `sessions_${startDate.getTime()}_${endDate.getTime()}`, payload: JSON.parse(JSON.stringify(sessions)) },
      });

      // 2. Normalizar + upsert idempotente (clave: session.id).
      for (const s of sessions) {
        try {
          const normalized = this.mapSession(s);
          if (!normalized.providerConversationId) continue;
          await prisma.normalizedConversation.upsert({
            where: { providerConversationId: normalized.providerConversationId },
            create: { workspaceId, provider: "botmaker", ...normalized },
            update: { ...normalized },
          });
          recordsInserted++;
        } catch {
          recordsFailed++;
        }
      }
      return { success: true, recordsInserted, recordsFailed };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("[BotmakerAnalyticsAdapter] syncSessionsReal:", message);
      return { success: false, recordsInserted, recordsFailed: recordsFailed + 1, error: message };
    }
  }

  private async syncConversationsMock(workspaceId: string, startDate: Date, endDate: Date): Promise<SyncResult> {
    let recordsInserted = 0;
    try {
      const rawPayload: BotmakerRawChat[] = [
        {
          chatId: `bm_chat_${startDate.getTime()}_${endDate.getTime()}`,
          channel: "whatsapp",
          creationTime: startDate.toISOString(),
          lastMessageTime: endDate.toISOString(),
          status: "closed",
          tags: ["Ventas", "Resuelto_por_Bot"],
          messagesCount: 10,
          assignedTo: null,
          csat: 4,
        },
      ];
      await prisma.rawProviderEvent.create({
        data: { workspaceId, provider: "botmaker", externalId: `sync_conversations_${startDate.getTime()}`, payload: JSON.parse(JSON.stringify(rawPayload)) },
      });
      for (const raw of rawPayload) {
        const normalized = this.normalizeRawData(raw, "conversations") as NormalizedConversationInput;
        if (!normalized.providerConversationId) continue;
        await prisma.normalizedConversation.upsert({
          where: { providerConversationId: normalized.providerConversationId },
          create: { workspaceId, provider: "botmaker", ...normalized },
          update: { ...normalized },
        });
        recordsInserted++;
      }
      return { success: true, recordsInserted, recordsFailed: 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("[BotmakerAnalyticsAdapter] syncConversationsMock:", message);
      return { success: false, recordsInserted, recordsFailed: 1, error: message };
    }
  }

  async syncMessages(workspaceId: string, startDate: Date, endDate: Date): Promise<SyncResult> {
    if (await isRealMode(workspaceId, "botmaker")) {
      return this.syncMessagesReal(workspaceId, startDate, endDate);
    }
    return this.syncMessagesMock(workspaceId, startDate);
  }

  private async syncMessagesReal(workspaceId: string, startDate: Date, endDate: Date): Promise<SyncResult> {
    let recordsInserted = 0, recordsFailed = 0;
    try {
      const conn = await getBotmakerConnection(workspaceId);
      if (!conn) return { success: false, recordsInserted: 0, recordsFailed: 0, error: "Botmaker no conectado para este workspace" };

      const sessions = await listSessions(conn.accessToken, startDate.toISOString(), endDate.toISOString(), 6, conn.baseUrl);
      for (const s of sessions) {
        const sessionId = String(s.id || "");
        if (!sessionId) continue;
        const msgs: BmMessage[] = s.messages || [];
        for (let i = 0; i < msgs.length; i++) {
          try {
            const m = msgs[i];
            // /sessions no trae id de mensaje → id determinístico (idempotente) por sesión+índice.
            const normalized: NormalizedMessageInput = {
              providerMessageId: `${sessionId}::${i}`,
              conversationId: sessionId,
              senderType: m.from === "user" ? "user" : m.from === "agent" ? "agent" : "bot",
              messageType: m.content?.type || "text",
              // TODO: intent / isFallback no vienen en /sessions (requieren endpoint NLU).
              sentAt: toMs(m.creationTime) != null ? new Date(toMs(m.creationTime) as number) : new Date(),
            };
            await prisma.normalizedMessage.upsert({
              where: { providerMessageId: normalized.providerMessageId },
              create: { workspaceId, provider: "botmaker", ...normalized },
              update: { ...normalized },
            });
            recordsInserted++;
          } catch {
            recordsFailed++;
          }
        }
      }
      return { success: true, recordsInserted, recordsFailed };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("[BotmakerAnalyticsAdapter] syncMessagesReal:", message);
      return { success: false, recordsInserted, recordsFailed: recordsFailed + 1, error: message };
    }
  }

  private async syncMessagesMock(workspaceId: string, startDate: Date): Promise<SyncResult> {
    let recordsInserted = 0;
    try {
      const rawPayload: BotmakerRawMessage[] = [
        { id: `bm_msg_${startDate.getTime()}`, chatId: `bm_chat_${startDate.getTime()}`, from: "user", text: "Hola, necesito ayuda", date: startDate.toISOString(), type: "text", intent: "soporte", isFallback: false },
      ];
      await prisma.rawProviderEvent.create({
        data: { workspaceId, provider: "botmaker", externalId: `sync_msgs_${startDate.getTime()}`, payload: JSON.parse(JSON.stringify(rawPayload)) },
      });
      for (const raw of rawPayload) {
        const normalized = this.normalizeRawData(raw, "messages") as NormalizedMessageInput;
        if (!normalized.providerMessageId) continue;
        await prisma.normalizedMessage.upsert({
          where: { providerMessageId: normalized.providerMessageId },
          create: { workspaceId, provider: "botmaker", ...normalized },
          update: { ...normalized },
        });
        recordsInserted++;
      }
      return { success: true, recordsInserted, recordsFailed: 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("[BotmakerAnalyticsAdapter] syncMessagesMock:", message);
      return { success: false, recordsInserted, recordsFailed: 1, error: message };
    }
  }

  // Reportes sin endpoint confirmado en el repo → mock no-op + TODO exacto.
  async syncAgents(): Promise<SyncResult> { return { success: true, recordsInserted: 0, recordsFailed: 0 }; } // TODO: GET /agents (sin confirmar)
  async syncServices(): Promise<SyncResult> { return { success: true, recordsInserted: 0, recordsFailed: 0 }; }
  async syncClients(): Promise<SyncResult> { return { success: true, recordsInserted: 0, recordsFailed: 0 }; }
  async syncCampaigns(): Promise<SyncResult> { return { success: true, recordsInserted: 0, recordsFailed: 0 }; } // TODO: endpoint de campañas/HSM (sin confirmar)
  async syncFunnels(): Promise<SyncResult> { return { success: true, recordsInserted: 0, recordsFailed: 0 }; }
  async syncCustomReports(): Promise<SyncResult> { return { success: true, recordsInserted: 0, recordsFailed: 0 }; }

  async processWebhookEvent(payload: unknown): Promise<void> {
    // TODO: verificar firma del webhook (secret) ANTES de confiar en el payload.
    const event = (payload || {}) as { action?: string };
    console.log("[BotmakerAnalyticsAdapter] webhook recibido:", event.action || "desconocido");
    // TODO: resolver workspaceId desde la config de la integración + upsert idempotente.
  }
}

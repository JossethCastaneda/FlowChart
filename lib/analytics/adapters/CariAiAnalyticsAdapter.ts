import {
  AnalyticsProviderAdapter,
  ProviderCredentials,
  ProviderMetadata,
  SyncResult,
  NormalizedConversationInput,
  NormalizedRecord,
} from "./AnalyticsProviderAdapter";
import prisma from "../../prisma";
import { isRealMode } from "../mode";
import { getCariCredentials, fetchCariReport, validateCariCredential } from "@/lib/crm/cari";
import { cdmxRange, parseWallClock } from "@/lib/crm/timezone";

// ============================================================================
// Adaptador Cari AI — Report API v2 (https://cari.ai/reportapiv2/v1).
// Endpoints REALES confirmados en el repo (lib/crm/cari.ts):
//   POST /createtoken { credentials } → { cariSec }
//   POST /{report}   (header CariSec)  body { date_from, date_to, page, limit }
//   Fechas "YYYY-MM-DD HH:MM:SS" CDMX · paginación page/limit · end_of_registers=1.
//   Cada grupo de reportes tiene su PROPIA credencial (mapa) — provider "cari".
//
// MODO configurable por integración (config.mode): "mock" (default) | "real".
//
// CONFIRMADO e implementado: testConnection (createtoken), captura de raw del
// reporte `conversaciones` en modo real.
// PENDIENTE (no confirmado en el repo → TODO exacto, sin inventar):
//   - Campo id de conversación y canal en el reporte `conversaciones` (necesarios
//     para el upsert idempotente per-fila → hoy se captura raw, no se normaliza).
//   - Endpoints/paginación de ReportesAgentes, ReportesServicio (per-fila),
//     ReportesClientes y ReportesPersonalizados.
//   - Mapeo de `indicadoresAtencion` (agregado diario) → AnalyticsDailyMetric.
// ============================================================================

interface CariRawConversation {
  id_conversacion?: string;
  canal?: string;
  estado?: string;
  atendido_por?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  mensajes_usuario?: number;
  mensajes_bot?: number;
  csat?: number;
  etiquetas?: string[];
}

export class CariAiAnalyticsAdapter implements AnalyticsProviderAdapter {
  getProviderMetadata(): ProviderMetadata {
    return {
      provider: "cari_ai",
      displayName: "Cari AI",
      authType: "credential_string",
      reportTypes: ["ReportesPersonalizados", "ReportesAgentes", "ReportesConversaciones", "ReportesServicio", "ReportesClientes"],
      docUrl: "https://cari.ai/reportapiv2/docshow/39",
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
      throw new Error("El token de Cari AI es requerido");
    }
    const token = credentials.accessToken as string;
    if (token === "fail") {
      console.error("[CariAiAnalyticsAdapter] testConnection: credenciales rechazadas");
      throw new Error("Credenciales inválidas para Cari AI");
    }
    // Validación REAL contra /createtoken solo si el llamador opta (credentials.live).
    if (credentials.live === true) {
      const ok = await validateCariCredential(token);
      if (!ok) throw new Error("Credenciales inválidas para Cari AI");
    }
    return true;
  }

  mapProviderChannel(raw: unknown): string {
    const v = String(raw || "").toLowerCase();
    if (v.includes("whats")) return "whatsapp";
    if (v.includes("web")) return "webchat";
    if (v.includes("face")) return "facebook";
    if (v.includes("insta")) return "instagram";
    return v || "web";
  }

  mapProviderStatus(raw: unknown): string {
    const v = String(raw || "").toLowerCase();
    if (v === "cerrada" || v === "closed") return "closed";
    if (v === "abandonada") return "abandoned";
    if (v === "transferida") return "transferred";
    return "active";
  }

  mapProviderOutcome(raw: unknown): string {
    const v = String(raw || "").toLowerCase();
    if (v === "bot") return "resolved";
    if (v === "agente" || v === "agent") return "transferred";
    return "unclassified";
  }

  mapProviderTags(raw: unknown): string[] {
    return Array.isArray(raw) ? raw.map((t) => String(t)) : [];
  }

  normalizeRawData(rawPayload: unknown, reportType: string): NormalizedRecord {
    if (reportType === "conversations") {
      const raw = (rawPayload || {}) as CariRawConversation;
      const attendedBy = String(raw.atendido_por || "").toLowerCase();
      const isBot = attendedBy === "bot";
      const normalized: NormalizedConversationInput = {
        providerConversationId: String(raw.id_conversacion || ""),
        channel: this.mapProviderChannel(raw.canal),
        conversationStartedAt: raw.fecha_inicio ? new Date(raw.fecha_inicio) : new Date(),
        conversationEndedAt: raw.fecha_fin ? new Date(raw.fecha_fin) : null,
        status: this.mapProviderStatus(raw.estado),
        // bot-only NO implica éxito automático; las reglas de outcome del tenant refinan.
        outcome: this.mapProviderOutcome(raw.atendido_por),
        resolvedBy: isBot ? "bot" : attendedBy ? "agent" : null,
        wasBotOnly: isBot,
        wasHandoff: !isBot && attendedBy !== "",
        totalUserMessages: raw.mensajes_usuario || 0,
        totalBotMessages: raw.mensajes_bot || 0,
        csatScore: typeof raw.csat === "number" ? raw.csat : null,
        tags: this.mapProviderTags(raw.etiquetas),
        syncedAt: new Date(),
      };
      return normalized;
    }
    return (rawPayload || {}) as Record<string, unknown>;
  }

  // ── Sincronización ───────────────────────────────────────────────────────
  async syncConversations(workspaceId: string, startDate: Date, endDate: Date): Promise<SyncResult> {
    if (await isRealMode(workspaceId, "cari_ai")) {
      return this.syncConversationsReal(workspaceId, startDate, endDate);
    }
    return this.syncConversationsMock(workspaceId, startDate, endDate);
  }

  /**
   * Modo real: usa la conexión Cari confirmada (provider "cari") y el endpoint
   * confirmado `conversaciones`. Guarda el raw payload. La normalización per-fila
   * queda como TODO porque el repo no confirma el campo id de conversación.
   */
  private async syncConversationsReal(workspaceId: string, startDate: Date, endDate: Date): Promise<SyncResult> {
    let recordsInserted = 0;
    let recordsFailed = 0;
    try {
      const creds = await getCariCredentials(workspaceId);
      if (!creds?.conversaciones) {
        return { success: false, recordsInserted: 0, recordsFailed: 0, error: "Cari AI no conectado (falta credencial de conversaciones)" };
      }
      const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
      const range = cdmxRange(days);
      
      // 1. Fetch conversations
      const rows = await fetchCariReport(creds.conversaciones, "conversaciones", range);

      // Raw payload intocable
      await prisma.rawProviderEvent.create({
        data: { workspaceId, provider: "cari_ai", externalId: `conversaciones_${range.fromLocal}`, payload: JSON.parse(JSON.stringify(rows)) },
      });

      // Normalizar per-fila si tenemos id_conversacion y canal
      for (const raw of rows) {
        if (raw.id_conversacion && raw.canal) {
          try {
            const normalized = this.normalizeRawData(raw, "conversations") as NormalizedConversationInput;
            await prisma.normalizedConversation.upsert({
              where: { providerConversationId: normalized.providerConversationId },
              create: { workspaceId, provider: "cari_ai", ...normalized },
              update: { ...normalized },
            });
            recordsInserted++;
          } catch (e) {
            recordsFailed++;
          }
        }
      }

      // 2. Fetch daily metrics (indicadoresAtencion) -> AnalyticsDailyMetric
      if (creds.servicio) {
        const indicadores = await fetchCariReport(creds.servicio, "indicadoresAtencion", range);
        for (const ind of indicadores) {
          const parsedDate = parseWallClock(ind.fecha);
          if (!parsedDate) continue;
          
          const t = typeof ind.total_conversaciones === "number" ? ind.total_conversaciones : parseFloat(String(ind.total_conversaciones ?? 0));
          if (!isNaN(t)) {
            // Utilizamos botId "cari_bot" como fallback si no hay bot específico
            await prisma.analyticsDailyMetric.upsert({
              where: { workspaceId_projectId_date_provider_botId_channel_metricKey: { workspaceId, projectId: null, date: new Date(parsedDate.iso), provider: "cari_ai", botId: "", channel: "", metricKey: "total_conversations" } },
              create: { workspaceId, date: new Date(parsedDate.iso), provider: "cari_ai", botId: "", channel: "", metricKey: "total_conversations", metricValue: t },
              update: { metricValue: t }
            });
          }
        }
      }

      // 3. Fetch errores/frases -> DataQualityIssue
      if (creds.conversaciones) {
        const frases = await fetchCariReport(creds.conversaciones, "frasesSinRespuesta", range, { status: 0 });
        for (const f of frases) {
          const phrase = String(f.frase_sin_respuesta || "").trim().slice(0, 100);
          if (phrase) {
            await prisma.dataQualityIssue.create({
              data: {
                workspaceId, provider: "cari_ai", issueType: "unanswered_phrase", severity: "warning", details: phrase
              }
            });
          }
        }
      }

      return { success: true, recordsInserted, recordsFailed };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("[CariAiAnalyticsAdapter] syncConversationsReal:", message);
      return { success: false, recordsInserted, recordsFailed: recordsFailed + 1, error: message };
    }
  }

  private async syncConversationsMock(workspaceId: string, startDate: Date, endDate: Date): Promise<SyncResult> {
    let recordsInserted = 0;
    try {
      const rawPayload: CariRawConversation[] = [
        {
          id_conversacion: `cari_${startDate.getTime()}_${endDate.getTime()}`,
          canal: "whatsapp",
          estado: "cerrada",
          atendido_por: "bot",
          fecha_inicio: startDate.toISOString(),
          fecha_fin: endDate.toISOString(),
          mensajes_usuario: 5,
          mensajes_bot: 6,
          csat: 5,
          etiquetas: ["soporte"],
        },
      ];
      await prisma.rawProviderEvent.create({
        data: { workspaceId, provider: "cari_ai", externalId: `sync_conversations_${startDate.getTime()}`, payload: JSON.parse(JSON.stringify(rawPayload)) },
      });
      for (const raw of rawPayload) {
        const normalized = this.normalizeRawData(raw, "conversations") as NormalizedConversationInput;
        if (!normalized.providerConversationId) continue;
        await prisma.normalizedConversation.upsert({
          where: { providerConversationId: normalized.providerConversationId },
          create: { workspaceId, provider: "cari_ai", ...normalized },
          update: { ...normalized },
        });
        recordsInserted++;
      }
      return { success: true, recordsInserted, recordsFailed: 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("[CariAiAnalyticsAdapter] syncConversationsMock:", message);
      return { success: false, recordsInserted, recordsFailed: 1, error: message };
    }
  }

  // Reportes sin esquema per-fila confirmado → mock no-op + TODO exacto.
  async syncMessages(): Promise<SyncResult> { return { success: true, recordsInserted: 0, recordsFailed: 0 }; }
  async syncAgents(): Promise<SyncResult> { return { success: true, recordsInserted: 0, recordsFailed: 0 }; } // TODO: ReportesAgentes (endpoint/paginación)
  async syncServices(): Promise<SyncResult> { return { success: true, recordsInserted: 0, recordsFailed: 0 }; } // TODO: ReportesServicio (per-fila)
  async syncClients(): Promise<SyncResult> { return { success: true, recordsInserted: 0, recordsFailed: 0 }; } // TODO: ReportesClientes
  async syncCampaigns(): Promise<SyncResult> { return { success: true, recordsInserted: 0, recordsFailed: 0 }; }
  async syncFunnels(): Promise<SyncResult> { return { success: true, recordsInserted: 0, recordsFailed: 0 }; }
  async syncCustomReports(): Promise<SyncResult> { return { success: true, recordsInserted: 0, recordsFailed: 0 }; } // TODO: ReportesPersonalizados (IDs custom)

  async processWebhookEvent(): Promise<void> {
    // Cari AI usa pull (reportes), no webhooks en el setup estándar.
  }
}

// lib/analytics/bot-metrics.ts

/**
 * Motor Genérico de Analítica Conversacional
 * 
 * Este módulo provee el algoritmo estándar para extraer métricas de negocio 
 * a partir de un flujo conversacional estandarizado. Cualquier CRM custom que 
 * se conecte vía API debe adaptar sus payloads a esta estructura genérica (GenericSession).
 */

export interface GenericMessage {
  from: "user" | "bot" | "agent";
  creationTimeMs: number;
  text?: string;
  intent?: string; // Intención detectada (ej. "quiero_comprar")
}

export interface GenericEvent {
  name: "conversation-close" | "handoff-requested" | "purchase" | "lead-capture" | string;
  creationTimeMs: number;
  metadata?: Record<string, any>;
}

export interface GenericSession {
  id: string;
  contactId: string;
  channelId?: string; // "whatsapp", "messenger", "instagram", etc.
  creationTimeMs: number;
  messages: GenericMessage[];
  events: GenericEvent[];
}

export interface AdvancedBotMetrics {
  totalSessions: number;
  uniqueUsers: number;
  
  // 1. Tasa de Retención / Drop-off
  dropOffRate: number; // % de sesiones donde el último mensaje es del bot
  
  // 2. Tasa de Resolución (Bot Containment Rate)
  containmentRate: number; // % de sesiones cerradas sin agente
  
  // 3. Tasa de Transferencia (Human Handoff Rate)
  handoffRate: number; // % de sesiones que pidieron o pasaron a agente
  
  // 4. Tiempo Promedio de Resolución (TTR)
  avgResolutionTimeSec: number; // Segundos promedio hasta el cierre/transferencia
  
  // 5. Reconocimiento de Intenciones
  intentRecognitionRate: number; // % de mensajes de usuario mapeados a un intent
  topIntents: { intent: string; count: number }[];
  
  // 6. Tasa de Conversión (Eventos de Éxito)
  conversionRate: number; // % de sesiones con evento "purchase" o "lead-capture"
  
  // Volumen y tiempos base
  totalUserMessages: number;
  totalBotMessages: number;
  avgFirstResponseTimeSec: number;
}

/**
 * Algoritmo principal para calcular métricas conversacionales avanzadas.
 */
export function computeAdvancedBotMetrics(sessions: GenericSession[]): AdvancedBotMetrics {
  const metrics: AdvancedBotMetrics = {
    totalSessions: sessions.length,
    uniqueUsers: 0,
    dropOffRate: 0,
    containmentRate: 0,
    handoffRate: 0,
    avgResolutionTimeSec: 0,
    intentRecognitionRate: 0,
    topIntents: [],
    conversionRate: 0,
    totalUserMessages: 0,
    totalBotMessages: 0,
    avgFirstResponseTimeSec: 0,
  };

  if (sessions.length === 0) return metrics;

  const uniqueContacts = new Set<string>();
  
  let dropOffSessions = 0;
  let resolvedByBotSessions = 0;
  let handoffSessions = 0;
  let totalResolutionTimeSec = 0;
  let resolutionTimeCount = 0;
  
  let userMessagesWithIntent = 0;
  const intentCounts: Record<string, number> = {};
  
  let convertedSessions = 0;
  
  let firstResponseTimeSecSum = 0;
  let firstResponseCount = 0;

  for (const session of sessions) {
    uniqueContacts.add(session.contactId);
    
    // Sort messages and events by time
    const msgs = [...session.messages].sort((a, b) => a.creationTimeMs - b.creationTimeMs);
    const evts = [...session.events].sort((a, b) => a.creationTimeMs - b.creationTimeMs);
    
    // -- Drop-off Analysis --
    if (msgs.length > 0) {
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg.from === "bot") {
        dropOffSessions++;
      }
    }
    
    // -- Handoff & Containment Analysis --
    let hasHandoff = evts.some(e => e.name === "handoff-requested" || e.name === "agent-assigned");
    let hasAgentMsg = msgs.some(m => m.from === "agent");
    let isHandoff = hasHandoff || hasAgentMsg;
    
    if (isHandoff) {
      handoffSessions++;
    } else {
      // Si hay un evento de cierre y nunca hubo agente, el bot lo contuvo.
      const isClosed = evts.some(e => e.name === "conversation-close");
      if (isClosed) resolvedByBotSessions++;
    }
    
    // -- Resolution Time Analysis --
    const closeEvt = evts.find(e => e.name === "conversation-close");
    if (closeEvt && closeEvt.creationTimeMs >= session.creationTimeMs) {
      totalResolutionTimeSec += (closeEvt.creationTimeMs - session.creationTimeMs) / 1000;
      resolutionTimeCount++;
    }
    
    // -- Conversions --
    const isConverted = evts.some(e => e.name === "purchase" || e.name === "lead-capture" || e.name === "conversion");
    if (isConverted) {
      convertedSessions++;
    }
    
    // -- Message & Intent Analysis --
    let firstUserAt: number | null = null;
    let firstBotAt: number | null = null;
    
    for (const msg of msgs) {
      if (msg.from === "user") {
        metrics.totalUserMessages++;
        if (firstUserAt === null) firstUserAt = msg.creationTimeMs;
        
        if (msg.intent) {
          userMessagesWithIntent++;
          intentCounts[msg.intent] = (intentCounts[msg.intent] || 0) + 1;
        }
      } else if (msg.from === "bot" || msg.from === "agent") {
        if (msg.from === "bot") metrics.totalBotMessages++;
        if (firstBotAt === null && firstUserAt !== null && msg.creationTimeMs >= firstUserAt) {
          firstBotAt = msg.creationTimeMs;
        }
      }
    }
    
    if (firstUserAt !== null && firstBotAt !== null) {
      firstResponseTimeSecSum += (firstBotAt - firstUserAt) / 1000;
      firstResponseCount++;
    }
  }

  const n = metrics.totalSessions;
  
  metrics.uniqueUsers = uniqueContacts.size;
  metrics.dropOffRate = (dropOffSessions / n) * 100;
  metrics.containmentRate = (resolvedByBotSessions / n) * 100;
  metrics.handoffRate = (handoffSessions / n) * 100;
  metrics.conversionRate = (convertedSessions / n) * 100;
  
  metrics.avgResolutionTimeSec = resolutionTimeCount > 0 ? totalResolutionTimeSec / resolutionTimeCount : 0;
  metrics.avgFirstResponseTimeSec = firstResponseCount > 0 ? firstResponseTimeSecSum / firstResponseCount : 0;
  metrics.intentRecognitionRate = metrics.totalUserMessages > 0 ? (userMessagesWithIntent / metrics.totalUserMessages) * 100 : 0;
  
  metrics.topIntents = Object.entries(intentCounts)
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
    
  return metrics;
}

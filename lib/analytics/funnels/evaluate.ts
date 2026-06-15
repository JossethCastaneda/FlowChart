// ============================================================================
// Evaluación de funnels CONFIGURABLES por pasos/condiciones (spec §24 / goal §14).
// Mantiene el funnel canónico bot→resolución como fallback (ver
// kpis/aggregations.aggregateFunnel) para proyectos sin funnel definido.
//
// FUNCIÓN PURA: recibe la definición de pasos + conversaciones (con sus mensajes)
// ya cargadas y devuelve, por paso, conversión, drop-off y tiempo entre pasos.
//
// Nota PII: el texto crudo del mensaje está hasheado (messageTextHash). Por eso
// la condición `message_text` se evalúa contra `topic`/`intent` (no-PII) como
// proxy, nunca contra el texto en claro.
// ============================================================================

export type FunnelConditionType = "intent" | "event" | "message_text" | "tag" | "status";

export interface FunnelStepDef {
  name: string;
  orderIndex: number;
  conditionType: FunnelConditionType;
  conditionValue: string;
}

export interface FunnelMessage {
  intent?: string | null;
  topic?: string | null;
  messageType?: string | null;
  senderType?: string | null;
  isFallback?: boolean | null;
  sentAt: Date | string;
}

export interface FunnelConversation {
  status: string;
  outcome?: string | null;
  resolvedBy?: string | null;
  wasBotOnly?: boolean | null;
  wasHandoff?: boolean | null;
  tags?: string[];
  conversationStartedAt: Date | string;
  closedAt?: Date | string | null;
  messages?: FunnelMessage[];
}

export interface FunnelStepResult {
  name: string;
  orderIndex: number;
  count: number;
  /** % respecto al paso anterior (100 en el primero). */
  conversionFromPrev: number;
  /** % respecto al primer paso. */
  conversionFromStart: number;
  /** Conversaciones perdidas respecto al paso anterior. */
  dropOff: number;
  /** Tiempo promedio (segundos) desde que se cumplió el paso anterior. */
  avgTimeFromPrevSeconds: number | null;
}

function ts(d: Date | string): number {
  return (typeof d === "string" ? new Date(d) : d).getTime();
}

function lc(s: string | null | undefined): string {
  return (s ?? "").toString().trim().toLowerCase();
}

/**
 * Devuelve el timestamp (ms) en el que la conversación cumple POR PRIMERA VEZ la
 * condición del paso a partir de `notBefore`, o null si no la cumple.
 */
function matchStep(
  conv: FunnelConversation,
  step: FunnelStepDef,
  notBefore: number
): number | null {
  const value = lc(step.conditionValue);
  const msgs = (conv.messages ?? [])
    .map((m) => ({ ...m, _t: ts(m.sentAt) }))
    .filter((m) => m._t >= notBefore)
    .sort((a, b) => a._t - b._t);

  switch (step.conditionType) {
    case "intent": {
      const hit = msgs.find((m) => lc(m.intent) === value || (value && lc(m.intent).includes(value)));
      return hit ? hit._t : null;
    }
    case "message_text": {
      // Proxy no-PII: topic/intent (el texto está hasheado).
      const hit = msgs.find(
        (m) => (value && lc(m.topic).includes(value)) || (value && lc(m.intent).includes(value))
      );
      return hit ? hit._t : null;
    }
    case "event": {
      // Eventos derivados de señales de la conversación/mensajes.
      const start = ts(conv.conversationStartedAt);
      const end = conv.closedAt ? ts(conv.closedAt) : start;
      if (value === "handoff" || value === "transfer") return conv.wasHandoff ? Math.max(end, notBefore) : null;
      if (value === "fallback") {
        const hit = msgs.find((m) => m.isFallback);
        return hit ? hit._t : null;
      }
      if (value === "bot_message") {
        const hit = msgs.find((m) => lc(m.senderType) === "bot");
        return hit ? hit._t : null;
      }
      if (value === "agent_message") {
        const hit = msgs.find((m) => lc(m.senderType) === "agent");
        return hit ? hit._t : null;
      }
      // Evento genérico = messageType
      const hit = msgs.find((m) => lc(m.messageType) === value);
      return hit ? hit._t : null;
    }
    case "tag": {
      const has = (conv.tags ?? []).some((tg) => lc(tg) === value || lc(tg).includes(value));
      return has ? Math.max(ts(conv.conversationStartedAt), notBefore) : null;
    }
    case "status": {
      const matchesStatus = lc(conv.status) === value || lc(conv.outcome) === value;
      if (!matchesStatus) return null;
      // El estado final se alcanza al cierre (o al último mensaje / inicio).
      const end = conv.closedAt ? ts(conv.closedAt) : msgs.length ? msgs[msgs.length - 1]._t : ts(conv.conversationStartedAt);
      return Math.max(end, notBefore);
    }
    default:
      return null;
  }
}

/**
 * Evalúa un funnel ordenado sobre las conversaciones. Una conversación "pasa" el
 * paso i solo si pasó 0..i en orden temporal (cada paso ocurre en/después del
 * anterior). Devuelve métricas por paso. Si no hay pasos, devuelve [].
 */
export function evaluateConfiguredFunnel(
  steps: FunnelStepDef[],
  conversations: FunnelConversation[]
): FunnelStepResult[] {
  const ordered = [...steps].sort((a, b) => a.orderIndex - b.orderIndex);
  if (ordered.length === 0) return [];

  const counts = new Array(ordered.length).fill(0);
  // Suma de deltas y nº de muestras para el tiempo entre pasos.
  const deltaSum = new Array(ordered.length).fill(0);
  const deltaN = new Array(ordered.length).fill(0);

  for (const conv of conversations) {
    let cursor = -Infinity;
    let prevTime: number | null = null;
    for (let i = 0; i < ordered.length; i++) {
      const matchedAt = matchStep(conv, ordered[i], cursor === -Infinity ? 0 : cursor);
      if (matchedAt == null) break;
      counts[i] += 1;
      if (prevTime != null && matchedAt >= prevTime) {
        deltaSum[i] += (matchedAt - prevTime) / 1000;
        deltaN[i] += 1;
      }
      prevTime = matchedAt;
      cursor = matchedAt;
    }
  }

  const first = counts[0] || 0;
  return ordered.map((s, i) => {
    const prev = i === 0 ? counts[0] : counts[i - 1];
    return {
      name: s.name,
      orderIndex: s.orderIndex,
      count: counts[i],
      conversionFromPrev: i === 0 ? 100 : prev > 0 ? (counts[i] / prev) * 100 : 0,
      conversionFromStart: first > 0 ? (counts[i] / first) * 100 : 0,
      dropOff: i === 0 ? 0 : Math.max(0, prev - counts[i]),
      avgTimeFromPrevSeconds: deltaN[i] > 0 ? deltaSum[i] / deltaN[i] : null,
    };
  });
}

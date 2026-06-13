import { Prisma } from "@prisma/client";
import type { ProjectScope } from "./project-scope";

// ============================================================================
// Filtros globales + construcción de WHERE multi-tenant (spec §17, §36).
// REGLA DE SEGURIDAD: workspaceId SIEMPRE proviene del contexto autenticado y
// NUNCA de query params. buildConversationWhere lo fija de forma no negociable;
// cualquier `workspaceId` que venga en la URL se ignora.
// ============================================================================

export interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
  provider?: string;
  channel?: string;
  botId?: string;
  agentId?: string;
  campaignId?: string;
  serviceId?: string;
  queueName?: string;
  outcome?: string;
  resolvedBy?: string;
  status?: string;
  tag?: string;
  search?: string;
}

function pick(sp: URLSearchParams, key: string): string | undefined {
  const v = sp.get(key);
  return v && v !== "all" && v !== "" ? v : undefined;
}

export function parseFilters(sp: URLSearchParams): AnalyticsFilters {
  const now = new Date();
  const days = parseInt(sp.get("days") || "28", 10);
  const safeDays = Number.isFinite(days) && days > 0 && days <= 365 ? days : 28;

  const endDate = sp.get("endDate") ? new Date(sp.get("endDate") as string) : now;
  const startDate = sp.get("startDate")
    ? new Date(sp.get("startDate") as string)
    : new Date(now.getTime() - safeDays * 24 * 60 * 60 * 1000);

  return {
    startDate,
    endDate,
    // Nota: "platform" es alias histórico de provider en el front.
    provider: pick(sp, "provider") || pick(sp, "platform"),
    channel: pick(sp, "channel"),
    botId: pick(sp, "botId"),
    agentId: pick(sp, "agentId"),
    campaignId: pick(sp, "campaignId"),
    serviceId: pick(sp, "serviceId"),
    queueName: pick(sp, "queueName"),
    outcome: pick(sp, "outcome"),
    resolvedBy: pick(sp, "resolvedBy"),
    status: pick(sp, "status"),
    tag: pick(sp, "tag"),
    search: pick(sp, "search"),
  };
}

/**
 * Construye el WHERE de Prisma para NormalizedConversation. El primer argumento
 * (workspaceId) es obligatorio y se aplica siempre: aislamiento multi-tenant.
 *
 * Si se pasa `scope` (alcance de proyecto), se restringen `provider` y `channel`
 * a los configurados en el proyecto:
 *   - Siempre se aplica `provider IN scope.providers` y `channel IN scope.channels`,
 *     incluso si la lista está vacía (lista vacía → 0 resultados): así un proyecto
 *     sin proveedor o sin canales configurados nunca filtra datos de otros.
 *   - Un filtro `provider`/`channel` solicitado por query solo se respeta si está
 *     DENTRO del alcance; si no, se ignora y se mantiene la restricción del proyecto
 *     (defensa contra intentos de leer canales/proveedores no configurados).
 */
export function buildConversationWhere(
  workspaceId: string,
  f: AnalyticsFilters,
  scope?: ProjectScope | null
): Prisma.NormalizedConversationWhereInput {
  const where: Prisma.NormalizedConversationWhereInput = {
    workspaceId,
    conversationStartedAt: { gte: f.startDate, lte: f.endDate },
  };
  if (scope) {
    where.provider = { in: scope.providers };
    where.channel = { in: scope.channels };
  }
  if (f.provider && (!scope || scope.providers.includes(f.provider))) where.provider = f.provider;
  if (f.channel && (!scope || scope.channels.includes(f.channel))) where.channel = f.channel;
  if (f.botId) where.botId = f.botId;
  if (f.agentId) where.agentId = f.agentId;
  if (f.campaignId) where.campaignId = f.campaignId;
  if (f.serviceId) where.serviceId = f.serviceId;
  if (f.queueName) where.queueName = f.queueName;
  if (f.outcome) where.outcome = f.outcome;
  if (f.resolvedBy) where.resolvedBy = f.resolvedBy;
  if (f.status) where.status = f.status;
  if (f.tag) where.tags = { has: f.tag };
  return where;
}

/** Restringe un WHERE de NormalizedMessage al alcance del proyecto (por provider). */
export function applyScopeToMessageWhere(
  where: Prisma.NormalizedMessageWhereInput,
  scope?: ProjectScope | null
): Prisma.NormalizedMessageWhereInput {
  if (scope) where.provider = { in: scope.providers };
  return where;
}

export interface Pagination { page: number; pageSize: number; skip: number; take: number }

export function parsePagination(sp: URLSearchParams): Pagination {
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(sp.get("pageSize") || "25", 10) || 25));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/**
 * Agentes de módulo de Sodare + orquestador ejecutivo.
 *
 * Cada SUBAGENTE analiza los datos REALES de un módulo del workspace (colector
 * Prisma workspace-scoped → contexto textual) y produce hallazgos estructurados.
 * El SINTETIZADOR los combina en un plan de acción priorizado. Todo corre con
 * la IA contratada en el catálogo (inyectada vía AgentRuntime).
 *
 * Regla de oro (igual que Aria): los agentes EXPLICAN cifras provistas; nunca
 * las inventan. Cada colector declara sus números en el input del subagente.
 */

import { z } from "zod";
import prisma from "@/lib/prisma";
import type { AgentDef, SubagentOutcome, SubagentTask } from "./core";

// ── Salida común de los subagentes de módulo ────────────────────────────────

// Tolerante con la salida del LLM: si excede el límite, se TRUNCA (no se rechaza).
export const ModuleFindingsZod = z.object({
  hallazgos: z.array(z.string()).transform((a) => a.slice(0, 6)),
  recomendaciones: z.array(z.string()).transform((a) => a.slice(0, 5)),
  prioridad: z.enum(["alta", "media", "baja"]),
});
export type ModuleFindings = z.infer<typeof ModuleFindingsZod>;

const MODULE_FINDINGS_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    hallazgos: {
      type: "array",
      items: { type: "string" },
      description: "Observaciones concretas basadas SOLO en las cifras provistas.",
    },
    recomendaciones: {
      type: "array",
      items: { type: "string" },
      description: "Acciones accionables para el equipo, en imperativo.",
    },
    prioridad: {
      type: "string",
      enum: ["alta", "media", "baja"],
      description: "Urgencia de atender este módulo esta semana.",
    },
  },
  required: ["hallazgos", "recomendaciones", "prioridad"],
};

function moduleAgent(key: string, name: string, role: string): AgentDef<ModuleFindings> {
  return {
    key,
    name,
    system:
      `Eres el agente de ${name} de Sodare (SaaS de marketing). ${role} ` +
      "Analiza ÚNICAMENTE las cifras del contexto; NUNCA inventes métricas ni nombres. " +
      "Si no hay datos, dilo en hallazgos y recomienda cómo empezar. Responde en español, " +
      "conciso y de negocio.",
    jsonSchema: MODULE_FINDINGS_SCHEMA,
    parse: (raw) => ModuleFindingsZod.parse(raw),
    maxTokens: 900,
  };
}

// ── Colectores por módulo (datos reales, workspace-scoped, baratos) ─────────

async function collectCrecimiento(workspaceId: string): Promise<string> {
  const [models, totalPred, highPred] = await Promise.all([
    prisma.ariaModel.findMany({
      where: { dataset: { workspaceId } },
      orderBy: { auc: "desc" },
      take: 10,
      select: { algorithm: true, status: true, auc: true, dataset: { select: { name: true, rowCount: true } } },
    }),
    prisma.ariaPrediction.count({ where: { model: { dataset: { workspaceId } } } }),
    prisma.ariaPrediction.count({ where: { model: { dataset: { workspaceId } }, priority: "High" } }),
  ]);
  const lines = models.map((m) =>
    m.status === "ready" && m.auc != null
      ? `- ${m.dataset.name}: ${m.algorithm} AUC ${m.auc.toFixed(3)} (${m.dataset.rowCount} filas)`
      : `- ${m.dataset.name}: ${m.status} (sin métricas)`,
  );
  return `Modelos predictivos: ${models.length}. Leads analizados: ${totalPred} (${highPred} de alta intención).\n${lines.join("\n")}`;
}

async function collectProyectos(workspaceId: string): Promise<string> {
  const projects = await prisma.project.findMany({
    where: { workspaceId },
    select: { status: true, client: true, dateEnd: true },
  });
  const byStatus = new Map<string, number>();
  for (const p of projects) byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
  const clients = new Set(projects.map((p) => (p.client ?? "").trim()).filter(Boolean));
  const statusLine = [...byStatus.entries()].map(([s, n]) => `${s}: ${n}`).join(", ") || "sin proyectos";
  return `Proyectos: ${projects.length} (${statusLine}). Clientes distintos: ${clients.size}.`;
}

async function collectOps(workspaceId: string): Promise<string> {
  const now = new Date();
  const [open, overdue, p0] = await Promise.all([
    prisma.task.count({ where: { workspaceId, status: { not: "Done" } } }),
    prisma.task.count({ where: { workspaceId, status: { not: "Done" }, dueDate: { lt: now } } }),
    prisma.task.count({ where: { workspaceId, status: { not: "Done" }, priority: "P0" } }),
  ]);
  return `Tareas abiertas: ${open}. Vencidas: ${overdue}. Críticas (P0) abiertas: ${p0}.`;
}

async function collectPublisher(workspaceId: string): Promise<string> {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [scheduled7d, drafts, failed] = await Promise.all([
    prisma.scheduledPost.count({
      where: { workspaceId, status: "Scheduled", scheduledAt: { gte: now, lte: in7 } },
    }),
    prisma.scheduledPost.count({ where: { workspaceId, status: "Draft" } }),
    prisma.scheduledPost.count({ where: { workspaceId, status: "Failed" } }),
  ]);
  return `Posts programados próximos 7 días: ${scheduled7d}. Borradores: ${drafts}. Fallidos: ${failed}.`;
}

async function collectInbox(workspaceId: string): Promise<string> {
  const [open, unread, unassigned] = await Promise.all([
    prisma.inboxConversation.count({ where: { workspaceId, status: { not: "closed" } } }),
    prisma.inboxConversation.count({ where: { workspaceId, unread: true } }),
    prisma.inboxConversation.count({ where: { workspaceId, status: { not: "closed" }, assignedTo: null } }),
  ]);
  return `Conversaciones abiertas: ${open}. Sin leer: ${unread}. Sin asignar: ${unassigned}.`;
}

// ── Registro de subagentes ──────────────────────────────────────────────────

export interface ModuleSubagent {
  def: AgentDef<ModuleFindings>;
  collect: (workspaceId: string) => Promise<string>;
}

export const MODULE_SUBAGENTS: ModuleSubagent[] = [
  {
    def: moduleAgent(
      "agente_crecimiento",
      "Crecimiento (Aria)",
      "Evalúas la salud de los modelos predictivos y el aprovechamiento de los leads scoreados.",
    ),
    collect: collectCrecimiento,
  },
  {
    def: moduleAgent(
      "agente_proyectos",
      "Proyectos",
      "Evalúas el portafolio de proyectos y clientes: carga, estatus y riesgos de entrega.",
    ),
    collect: collectProyectos,
  },
  {
    def: moduleAgent(
      "agente_ops",
      "Ops (tareas)",
      "Evalúas la operación del equipo: backlog, tareas vencidas y críticas.",
    ),
    collect: collectOps,
  },
  {
    def: moduleAgent(
      "agente_publisher",
      "Publisher (contenido)",
      "Evalúas el pipeline de publicación: cadencia programada, borradores estancados y fallos.",
    ),
    collect: collectPublisher,
  },
  {
    def: moduleAgent(
      "agente_inbox",
      "Inbox (conversaciones)",
      "Evalúas la atención a clientes: conversaciones abiertas, sin leer y sin asignar.",
    ),
    collect: collectInbox,
  },
];

/** Construye las tareas de subagentes con su contexto real (colector tolerante a fallos). */
export async function buildModuleTasks(workspaceId: string): Promise<SubagentTask<ModuleFindings>[]> {
  return Promise.all(
    MODULE_SUBAGENTS.map(async (s) => {
      let context: string;
      try {
        context = await s.collect(workspaceId);
      } catch {
        context = "No fue posible leer los datos de este módulo (error interno).";
      }
      return {
        def: s.def,
        input: `Datos reales del módulo hoy:\n${context}\n\nGenera hallazgos, recomendaciones y prioridad.`,
      };
    }),
  );
}

// ── Sintetizador (plan ejecutivo) ───────────────────────────────────────────

export const ActionPlanZod = z.object({
  resumenEjecutivo: z.string(),
  accionesPrioritarias: z
    .array(z.object({ modulo: z.string(), accion: z.string(), impacto: z.string() }))
    .transform((a) => a.slice(0, 8)),
  riesgos: z.array(z.string()).transform((a) => a.slice(0, 5)),
});
export type ActionPlan = z.infer<typeof ActionPlanZod>;

export const synthesisAgent: AgentDef<ActionPlan> = {
  key: "orquestador_ejecutivo",
  name: "Orquestador ejecutivo",
  system:
    "Eres el orquestador ejecutivo de Sodare. Recibes los hallazgos de los agentes de cada " +
    "módulo del workspace y los sintetizas en UN plan de acción semanal priorizado. Usa SOLO " +
    "la información provista (no inventes cifras); prioriza por impacto de negocio; responde " +
    "en español claro y accionable.",
  jsonSchema: {
    type: "object",
    properties: {
      resumenEjecutivo: { type: "string", description: "Estado del workspace en 2-3 frases." },
      accionesPrioritarias: {
        type: "array",
        items: {
          type: "object",
          properties: {
            modulo: { type: "string" },
            accion: { type: "string" },
            impacto: { type: "string" },
          },
          required: ["modulo", "accion", "impacto"],
        },
      },
      riesgos: { type: "array", items: { type: "string" } },
    },
    required: ["resumenEjecutivo", "accionesPrioritarias", "riesgos"],
  },
  parse: (raw) => ActionPlanZod.parse(raw),
  maxTokens: 1500,
};

/** Serializa los hallazgos de los subagentes para el prompt del sintetizador. */
export function synthesisInput(outcomes: SubagentOutcome<ModuleFindings>[]): string {
  const blocks = outcomes.map((o) => {
    if (!o.ok || !o.data) return `## ${o.agentName}\n(Sin datos: el agente no pudo analizar este módulo.)`;
    return (
      `## ${o.agentName} — prioridad ${o.data.prioridad}\n` +
      `Hallazgos:\n${o.data.hallazgos.map((h) => `- ${h}`).join("\n")}\n` +
      `Recomendaciones:\n${o.data.recomendaciones.map((r) => `- ${r}`).join("\n")}`
    );
  });
  return `Hallazgos de los agentes de módulo:\n\n${blocks.join("\n\n")}`;
}

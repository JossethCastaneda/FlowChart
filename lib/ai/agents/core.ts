/**
 * Framework de agentes de Sodare sobre la capa LLM multi-proveedor.
 *
 * Un AGENTE = prompt de sistema + salida estructurada (JSON Schema + Zod) que
 * corre con la IA CONTRATADA del workspace (el modelo del catálogo). Un
 * ORQUESTADOR ejecuta subagentes en paralelo — cada uno analiza los datos
 * reales de un módulo — y un agente sintetizador combina sus hallazgos en un
 * plan accionable. Así la IA seleccionada "cobra vida" en todos los módulos.
 *
 * El proveedor se INYECTA (no se resuelve aquí) para que el framework sea puro
 * y testeable; las rutas lo resuelven una vez con getWorkspaceAiProvider.
 */

import type { LLMAttachment, LLMProvider } from "../types";
import { logger } from "@/lib/logger";

export interface AgentDef<T> {
  /** Identificador estable (telemetría y UI). */
  key: string;
  /** Nombre visible del agente. */
  name: string;
  /** Prompt de sistema: rol, reglas y formato del agente. */
  system: string;
  /** JSON Schema estándar de la salida (la capa lo traduce por proveedor). */
  jsonSchema: Record<string, unknown>;
  /** Validación runtime (típicamente zodSchema.parse). */
  parse: (raw: unknown) => T;
  maxTokens?: number;
}

export interface AgentRuntime {
  provider: LLMProvider;
  model: string;
  signal?: AbortSignal;
}

export interface AgentRunResult<T> {
  agentKey: string;
  agentName: string;
  data: T;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** Ejecuta un agente con la IA inyectada y devuelve su salida validada. */
export async function runAgent<T>(
  rt: AgentRuntime,
  def: AgentDef<T>,
  input: string,
  attachments?: LLMAttachment[],
): Promise<AgentRunResult<T>> {
  const result = await rt.provider.completeStructured<T>({
    model: rt.model,
    system: def.system,
    messages: [{ role: "user", content: input }],
    ...(attachments?.length ? { attachments } : {}),
    schemaName: def.key,
    jsonSchema: def.jsonSchema,
    parse: def.parse,
    maxTokens: def.maxTokens ?? 1500,
    signal: rt.signal,
  });
  return {
    agentKey: def.key,
    agentName: def.name,
    data: result.data,
    model: result.model,
    provider: result.provider,
    usage: result.usage,
  };
}

export interface SubagentTask<T> {
  def: AgentDef<T>;
  input: string;
}

export interface SubagentOutcome<T> {
  agentKey: string;
  agentName: string;
  ok: boolean;
  data?: T;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Ejecuta subagentes EN PARALELO. Un subagente que falla no tumba al resto:
 * su error se reporta y el sintetizador trabaja con los que sí respondieron.
 */
export async function runSubagents<T>(
  rt: AgentRuntime,
  tasks: SubagentTask<T>[],
): Promise<SubagentOutcome<T>[]> {
  const settled = await Promise.allSettled(tasks.map((t) => runAgent(rt, t.def, t.input)));
  return settled.map((s, i) => {
    const def = tasks[i].def;
    if (s.status === "fulfilled") {
      return { 
        agentKey: def.key, 
        agentName: def.name, 
        ok: true, 
        data: s.value.data,
        usage: s.value.usage
      };
    }
    const message = s.reason instanceof Error ? s.reason.message : String(s.reason);
    logger.warn("[AGENTS] subagente falló", { agent: def.key, error: message });
    return { agentKey: def.key, agentName: def.name, ok: false, error: message };
  });
}

/**
 * Patrón orquestador: subagentes en paralelo → sintetizador con TODOS los
 * hallazgos. `describeOutcome` serializa la salida de cada subagente para el
 * prompt del sintetizador.
 */
export async function orchestrate<S, F>(
  rt: AgentRuntime,
  subtasks: SubagentTask<S>[],
  synthesizer: AgentDef<F>,
  buildSynthesisInput: (outcomes: SubagentOutcome<S>[]) => string,
): Promise<{ final: AgentRunResult<F>; outcomes: SubagentOutcome<S>[] }> {
  const outcomes = await runSubagents(rt, subtasks);
  if (!outcomes.some((o) => o.ok)) {
    throw new Error("Todos los subagentes fallaron; no hay hallazgos que sintetizar.");
  }
  const final = await runAgent(rt, synthesizer, buildSynthesisInput(outcomes));
  return { final, outcomes };
}

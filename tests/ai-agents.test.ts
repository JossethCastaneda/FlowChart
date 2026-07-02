/**
 * Tests del framework de agentes (lib/ai/agents): ejecución con proveedor
 * inyectado, fan-out paralelo tolerante a fallos, orquestación y el formato
 * del input de síntesis. Sin red ni DB: proveedor stub y prisma mockeado.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {} }));

import { z } from "zod";
import type { LLMProvider } from "@/lib/ai/types";
import { runAgent, runSubagents, orchestrate, type AgentDef } from "@/lib/ai/agents/core";
import { synthesisInput, ModuleFindingsZod, type ModuleFindings } from "@/lib/ai/agents/sodare-agents";

const EchoZod = z.object({ eco: z.string() });

function stubProvider(
  respond: (opts: { schemaName: string; content: string }) => unknown,
): LLMProvider {
  return {
    id: "gemini",
    defaultModel: "stub-model",
    isConfigured: () => true,
    complete: async () => ({ text: "", model: "stub-model", provider: "gemini" }),
    completeStructured: async (opts) => {
      const raw = respond({
        schemaName: opts.schemaName,
        content: opts.messages[opts.messages.length - 1]?.content ?? "",
      });
      return { text: JSON.stringify(raw), model: opts.model ?? "stub-model", provider: "gemini", data: opts.parse(raw) };
    },
  };
}

const echoAgent: AgentDef<z.infer<typeof EchoZod>> = {
  key: "eco",
  name: "Agente Eco",
  system: "Repite.",
  jsonSchema: { type: "object", properties: { eco: { type: "string" } }, required: ["eco"] },
  parse: (raw) => EchoZod.parse(raw),
};

describe("runAgent", () => {
  it("ejecuta con el modelo inyectado y devuelve la salida validada", async () => {
    const provider = stubProvider(({ content }) => ({ eco: content.toUpperCase() }));
    const r = await runAgent({ provider, model: "modelo-contratado" }, echoAgent, "hola");
    expect(r.data.eco).toBe("HOLA");
    expect(r.model).toBe("modelo-contratado");
    expect(r.agentKey).toBe("eco");
  });

  it("propaga el error de validación si el LLM responde fuera de schema", async () => {
    const provider = stubProvider(() => ({ otra: "cosa" }));
    await expect(runAgent({ provider, model: "m" }, echoAgent, "hola")).rejects.toThrow();
  });
});

describe("runSubagents", () => {
  it("corre en paralelo y un subagente fallido no tumba a los demás", async () => {
    const provider = stubProvider(({ content }) => {
      if (content.includes("BOOM")) throw new Error("upstream 500");
      return { eco: "ok" };
    });
    const outcomes = await runSubagents({ provider, model: "m" }, [
      { def: echoAgent, input: "normal" },
      { def: { ...echoAgent, key: "eco2", name: "Eco 2" }, input: "BOOM" },
      { def: { ...echoAgent, key: "eco3", name: "Eco 3" }, input: "normal" },
    ]);
    expect(outcomes.map((o) => o.ok)).toEqual([true, false, true]);
    expect(outcomes[1].error).toContain("upstream 500");
    expect(outcomes[2].data?.eco).toBe("ok");
  });
});

describe("orchestrate", () => {
  it("sintetiza con los hallazgos de los subagentes exitosos", async () => {
    const seen: string[] = [];
    const provider = stubProvider(({ schemaName, content }) => {
      if (schemaName === "sintesis") {
        seen.push(content);
        return { eco: "plan final" };
      }
      return { eco: `hallazgo de ${content}` };
    });
    const synth: AgentDef<z.infer<typeof EchoZod>> = { ...echoAgent, key: "sintesis", name: "Síntesis" };
    const { final, outcomes } = await orchestrate(
      { provider, model: "m" },
      [
        { def: echoAgent, input: "modulo-A" },
        { def: { ...echoAgent, key: "eco2", name: "Eco 2" }, input: "modulo-B" },
      ],
      synth,
      (outs) => outs.map((o) => `${o.agentName}: ${o.data?.eco ?? "falló"}`).join("\n"),
    );
    expect(final.data.eco).toBe("plan final");
    expect(outcomes).toHaveLength(2);
    expect(seen[0]).toContain("hallazgo de modulo-A");
    expect(seen[0]).toContain("hallazgo de modulo-B");
  });

  it("lanza error si TODOS los subagentes fallan (nada que sintetizar)", async () => {
    const provider = stubProvider(() => {
      throw new Error("caído");
    });
    await expect(
      orchestrate({ provider, model: "m" }, [{ def: echoAgent, input: "x" }], echoAgent, () => ""),
    ).rejects.toThrow(/Todos los subagentes fallaron/);
  });
});

describe("ModuleFindingsZod", () => {
  it("trunca (no rechaza) cuando el LLM excede los límites de items", () => {
    const out = ModuleFindingsZod.parse({
      hallazgos: Array.from({ length: 9 }, (_, i) => `h${i}`),
      recomendaciones: Array.from({ length: 7 }, (_, i) => `r${i}`),
      prioridad: "media",
    });
    expect(out.hallazgos).toHaveLength(6);
    expect(out.recomendaciones).toHaveLength(5);
  });
});

describe("synthesisInput", () => {
  it("serializa hallazgos ok y marca los módulos caídos", () => {
    const finding: ModuleFindings = ModuleFindingsZod.parse({
      hallazgos: ["12 tareas vencidas"],
      recomendaciones: ["Repriorizar el backlog"],
      prioridad: "alta",
    });
    const text = synthesisInput([
      { agentKey: "agente_ops", agentName: "Ops (tareas)", ok: true, data: finding },
      { agentKey: "agente_inbox", agentName: "Inbox", ok: false, error: "timeout" },
    ]);
    expect(text).toContain("## Ops (tareas) — prioridad alta");
    expect(text).toContain("- 12 tareas vencidas");
    expect(text).toContain("- Repriorizar el backlog");
    expect(text).toContain("## Inbox\n(Sin datos");
  });
});

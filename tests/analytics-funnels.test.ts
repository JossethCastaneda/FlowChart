import { describe, it, expect } from "vitest";
import { evaluateConfiguredFunnel, type FunnelStepDef, type FunnelConversation } from "../lib/analytics/funnels/evaluate";

const steps: FunnelStepDef[] = [
  { name: "Saludo", orderIndex: 0, conditionType: "intent", conditionValue: "saludo" },
  { name: "Cotización", orderIndex: 1, conditionType: "intent", conditionValue: "cotizar" },
  { name: "Resuelto", orderIndex: 2, conditionType: "status", conditionValue: "resolved" },
];

function conv(over: Partial<FunnelConversation>): FunnelConversation {
  return {
    status: "closed", outcome: "resolved", conversationStartedAt: "2026-06-01T10:00:00Z",
    closedAt: "2026-06-01T10:10:00Z", messages: [], ...over,
  };
}

describe("evaluateConfiguredFunnel", () => {
  it("devuelve [] sin pasos", () => {
    expect(evaluateConfiguredFunnel([], [conv({})])).toEqual([]);
  });

  it("cuenta avance secuencial y calcula conversión/drop-off", () => {
    const conversations: FunnelConversation[] = [
      // pasa los 3 pasos
      conv({
        outcome: "resolved",
        messages: [
          { intent: "saludo", sentAt: "2026-06-01T10:00:00Z" },
          { intent: "cotizar", sentAt: "2026-06-01T10:02:00Z" },
        ],
      }),
      // solo paso 1 (saludo), no cotiza
      conv({
        outcome: "abandoned", status: "abandoned",
        messages: [{ intent: "saludo", sentAt: "2026-06-01T10:00:00Z" }],
      }),
      // no entra (sin saludo)
      conv({ messages: [{ intent: "otro", sentAt: "2026-06-01T10:00:00Z" }] }),
    ];
    const res = evaluateConfiguredFunnel(steps, conversations);
    expect(res[0].count).toBe(2); // saludo
    expect(res[1].count).toBe(1); // cotizar
    expect(res[2].count).toBe(1); // resolved
    expect(res[0].conversionFromPrev).toBe(100);
    expect(res[1].conversionFromPrev).toBe(50); // 1/2
    expect(res[1].dropOff).toBe(1);
    expect(res[2].conversionFromStart).toBe(50); // 1/2 del primer paso
  });

  it("respeta el orden temporal: un paso debe ocurrir en/después del anterior", () => {
    // cotizar ANTES que saludo → no debe contar como avance secuencial
    const conversations = [
      conv({
        messages: [
          { intent: "cotizar", sentAt: "2026-06-01T10:00:00Z" },
          { intent: "saludo", sentAt: "2026-06-01T10:05:00Z" },
        ],
      }),
    ];
    const res = evaluateConfiguredFunnel(steps, conversations);
    expect(res[0].count).toBe(1); // saludo a las 10:05
    expect(res[1].count).toBe(0); // no hay cotizar DESPUÉS de saludo
  });

  it("calcula tiempo promedio entre pasos en segundos", () => {
    const conversations = [
      conv({
        messages: [
          { intent: "saludo", sentAt: "2026-06-01T10:00:00Z" },
          { intent: "cotizar", sentAt: "2026-06-01T10:02:00Z" }, // +120s
        ],
      }),
    ];
    const res = evaluateConfiguredFunnel(steps, conversations);
    expect(res[1].avgTimeFromPrevSeconds).toBe(120);
  });

  it("soporta condiciones por tag y por evento handoff", () => {
    const tagSteps: FunnelStepDef[] = [
      { name: "VIP", orderIndex: 0, conditionType: "tag", conditionValue: "vip" },
      { name: "Handoff", orderIndex: 1, conditionType: "event", conditionValue: "handoff" },
    ];
    const conversations = [conv({ tags: ["VIP"], wasHandoff: true })];
    const res = evaluateConfiguredFunnel(tagSteps, conversations);
    expect(res[0].count).toBe(1);
    expect(res[1].count).toBe(1);
  });
});

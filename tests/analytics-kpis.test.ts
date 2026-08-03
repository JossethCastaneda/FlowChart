import { describe, it, expect } from "vitest";
import { computeKpis } from "../lib/analytics/kpis/engine";
import { determineConversationOutcome } from "../lib/analytics/kpis/rules";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { NormalizedConversation } from "@prisma/client";

describe("Outcome Rules Engine", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const dummyConv: any = {
    id: "1",
    totalFallbacks: 5,
    wasHandoff: false,
    csatScore: 2,
    status: "closed"
  };

  it("should classify as abandoned if fallback > 4", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const rules: any[] = [{
      id: "r1",
      name: "High Fallback",
      conditions: [{ field: "fallback", operator: "gt", value: 4 }],
      outcome: "abandoned",
      resolvedBy: "bot"
    }];

    const result = determineConversationOutcome(dummyConv, rules);
    expect(result).not.toBeNull();
    expect(result?.outcome).toBe("abandoned");
  });

  it("should return null if no rules match", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const rules: any[] = [{
      id: "r2",
      name: "Handoff",
      conditions: [{ field: "handoff", operator: "eq", value: true }],
      outcome: "transferred",
      resolvedBy: "agent"
    }];

    const result = determineConversationOutcome(dummyConv, rules);
    expect(result).toBeNull();
  });
});

describe("KPI Engine", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  const mockConversations: any[] = [
    {
      id: "c1",
      customerId: "u1",
      status: "closed",
      outcome: "resolved",
      resolvedBy: "bot",
      wasBotOnly: true,
      wasHandoff: false,
      totalUserMessages: 10,
      totalFallbacks: 1,
      csatScore: 5,
      firstResponseTimeSeconds: 10,
      handleTimeSeconds: 120,
      waitingTimeSeconds: 5
    },
    {
      id: "c2",
      customerId: "u2",
      status: "closed",
      outcome: "transferred",
      resolvedBy: "agent",
      wasBotOnly: false,
      wasHandoff: true,
      totalUserMessages: 20,
      totalFallbacks: 5,
      csatScore: 2,
      firstResponseTimeSeconds: 30,
      handleTimeSeconds: 600,
      waitingTimeSeconds: 300
    },
    {
      id: "c3",
      customerId: "u1", // Same user as c1
      status: "abandoned",
      outcome: "abandoned",
      resolvedBy: "bot",
      wasBotOnly: true,
      wasHandoff: false,
      totalUserMessages: 2,
      totalFallbacks: 2,
      csatScore: null,
      firstResponseTimeSeconds: 5,
      handleTimeSeconds: 30,
      waitingTimeSeconds: 2
    }
  ];

  it("should correctly compute Volume KPIs", () => {
    const kpis = computeKpis({ conversations: mockConversations });
    expect(kpis.totalConversations).toBe(3);
    expect(kpis.uniqueUsers).toBe(2); // u1 and u2
  });

  it("should correctly compute Containment & Quality KPIs", () => {
    const kpis = computeKpis({ conversations: mockConversations });
    
    // Contención real: resueltas por bot (1) / cerradas+transferidas+abandonadas (3)
    expect(Math.round(kpis.realContainmentRate)).toBe(33); 
    
    // Bot Only: 2 bot only / 3 totales
    expect(Math.round(kpis.botOnlyRate)).toBe(67);
    
    // Escalamiento: 1 transferida / 3 totales
    expect(Math.round(kpis.escalationRate)).toBe(33);
    
    // Abandono: 1 / 3
    expect(Math.round(kpis.abandonmentRate)).toBe(33);
    
    // Fallback rate: total fallbacks (8) / total user msgs (32) = 25%
    expect(Math.round(kpis.fallbackRate)).toBe(25);
  });

  it("should correctly compute Satisfaction & Time KPIs", () => {
    const kpis = computeKpis({ conversations: mockConversations });
    
    // CSAT: (5 + 2) / 2 = 3.5
    expect(kpis.avgCsat).toBe(3.5);
    
    // FRT: (10 + 30 + 5) / 3 = 15
    expect(kpis.avgFrt).toBe(15);
    
    // AHT: (120 + 600 + 30) / 3 = 250
    expect(kpis.avgAht).toBe(250);
  });

  it("should recalculate outcomes dynamically if rules are provided", () => {
    // Definimos que cualquier fallback > 4 es abandono (c2 debería cambiar de transferred a abandoned)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const rules: any[] = [{
      id: "r1",
      name: "High Fallback = Abandoned",
      conditions: [{ field: "fallback", operator: "gt", value: 4 }],
      outcome: "abandoned",
      resolvedBy: "bot"
    }];

    const kpis = computeKpis({ conversations: mockConversations, rules });
    
    // Originalmente era 1 abandono. Ahora c2 también es abandono -> 2 abandonos.
    expect(Math.round(kpis.abandonmentRate)).toBe(67); // 2/3
  });
});

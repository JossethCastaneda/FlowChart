import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CariAiAnalyticsAdapter } from "../lib/analytics/adapters/CariAiAnalyticsAdapter";
import { BotmakerAnalyticsAdapter } from "../lib/analytics/adapters/BotmakerAnalyticsAdapter";
import type { NormalizedConversationInput, NormalizedMessageInput } from "../lib/analytics/adapters/AnalyticsProviderAdapter";

// Normaliza fixtures de respuesta de proveedor (anonimizados). Cuando lleguen
// respuestas REALES anonimizadas, reemplazan estos JSON y el test sigue validando
// el contrato de normalización sin tocar la lógica.
function loadFixture(rel: string): unknown[] {
  const raw = JSON.parse(readFileSync(join(__dirname, "fixtures/analytics", rel), "utf8"));
  return Array.isArray(raw) ? raw : [];
}

describe("Provider fixtures (anonymized)", () => {
  it("Cari AI: normaliza a la forma canónica", () => {
    const a = new CariAiAnalyticsAdapter();
    const norm = loadFixture("cari-ai/conversations.json").map(
      (r) => a.normalizeRawData(r, "conversations") as NormalizedConversationInput
    );
    expect(norm[0].channel).toBe("whatsapp");
    expect(norm[0].status).toBe("closed");
    expect(norm[0].resolvedBy).toBe("bot");
    expect(norm[1].wasHandoff).toBe(true);
  });

  it("Botmaker: bot-only sin señal NO es resuelto; con tag de éxito SÍ (regla crítica)", () => {
    const b = new BotmakerAnalyticsAdapter();
    const norm = loadFixture("botmaker/conversations.json").map(
      (r) => b.normalizeRawData(r, "conversations") as NormalizedConversationInput
    );
    expect(norm[0].wasBotOnly).toBe(true);
    expect(norm[0].outcome).toBe("unclassified");
    expect(norm[1].outcome).toBe("resolved");
    expect(norm[1].resolvedBy).toBe("bot");
  });

  it("Botmaker: normaliza mensajes e identifica fallback", () => {
    const b = new BotmakerAnalyticsAdapter();
    const norm = loadFixture("botmaker/messages.json").map(
      (r) => b.normalizeRawData(r, "messages") as NormalizedMessageInput
    );
    expect(norm[0].senderType).toBe("user");
    expect(norm[1].isFallback).toBe(true);
  });

  it("Botmaker /sessions (forma REAL): normaliza y respeta bot-only ≠ resuelto", () => {
    const b = new BotmakerAnalyticsAdapter();
    const norm = loadFixture("botmaker/sessions.json").map(
      (r) => b.normalizeRawData(r, "session") as NormalizedConversationInput
    );
    // sess-0001: bot-only + tipificación de éxito → resuelto por bot
    expect(norm[0].wasBotOnly).toBe(true);
    expect(norm[0].outcome).toBe("resolved");
    expect(norm[0].resolvedBy).toBe("bot");
    // sess-0002: tipificación de abandono → abandoned
    expect(norm[1].outcome).toBe("abandoned");
    // sess-0003: bot-only SIN cierre → unclassified (NO resuelto) — regla crítica §2/§3
    expect(norm[2].wasBotOnly).toBe(true);
    expect(norm[2].outcome).toBe("unclassified");
    // sess-0004: con mensaje de agente → handoff, resuelto mixto
    expect(norm[3].wasHandoff).toBe(true);
    expect(norm[3].resolvedBy).toBe("mixed");
    // PII: el contactId nunca se guarda en claro
    expect(norm[0].customerIdentifierHash).toBeTruthy();
    expect(norm[0].customerIdentifierHash).not.toContain("contact-anon-1");
  });

  it("clave de upsert determinística (idempotencia por providerConversationId)", () => {
    const b = new BotmakerAnalyticsAdapter();
    const [s] = loadFixture("botmaker/sessions.json");
    const a = b.normalizeRawData(s, "session") as NormalizedConversationInput;
    const aAgain = b.normalizeRawData(s, "session") as NormalizedConversationInput;
    // El mismo payload produce SIEMPRE la misma clave → upsert idempotente.
    expect(a.providerConversationId).toBe("sess-0001");
    expect(a.providerConversationId).toBe(aAgain.providerConversationId);
  });
});

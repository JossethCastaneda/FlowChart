import { describe, it, expect } from "vitest";
import type { BmSession } from "@/lib/botmaker-api";
import { classifyOutcome } from "@/lib/botmaker/outcomes";
import { computeCaptureFunnel, userSentImage, sessionHasOcrNode } from "@/lib/botmaker/fields";
import { computeBotPerformance, resolveBotId, isTestBot } from "@/lib/botmaker/bot-perf";

// ── helpers ──────────────────────────────────────────────────────────────────
let idc = 0;
const FIELD_TEXT: Record<string, string> = {
  numero: "¿Cuál es tu número a portar? Son 10 dígitos",
  nip: "Ahora dame tu NIP por favor",
  nombre: "¿Cuál es tu nombre completo?",
};

function mkSession(
  botId: string,
  o: { sale?: boolean; fallback?: boolean; agent?: boolean; fields?: string[]; channelId?: string; ts?: number } = {}
): BmSession {
  const ts = o.ts ?? 1_700_000_000_000;
  const messages: NonNullable<BmSession["messages"]> = [
    { from: "user", creationTime: ts, content: { text: "hola" } },
  ];
  for (const f of o.fields ?? []) {
    messages.push({ from: "bot", creationTime: ts + 1, content: { text: FIELD_TEXT[f] || f } });
  }
  if (o.sale) messages.push({ from: "bot", creationTime: ts + 2, content: { text: "¡Felicidades! Tu cambio de compañía fue exitoso." } });
  if (o.agent) messages.push({ from: "agent", creationTime: ts + 3, content: { text: "Hola, soy un asesor." } });

  const events: NonNullable<BmSession["events"]> = [];
  if (botId !== "__none__") events.push({ name: "bot-change", creationTime: ts, info: { currentBotId: botId } });
  if (o.fallback) events.push({ name: "go-to", creationTime: ts + 1, info: { executingIntents: "Mensaje por defecto" } });
  events.push({ name: "conversation-close", creationTime: ts + 5, info: { typification: o.sale ? "Venta_exitosa" : "Dejo_de_contestar" } });

  return {
    id: `s${idc++}`,
    creationTime: ts,
    chat: { chat: { contactId: `c${idc}`, channelId: o.channelId ?? "ch1" } },
    messages,
    events,
  };
}

// ── classifyOutcome (a nivel sesión) ──────────────────────────────────────────
describe("classifyOutcome — combina tipificación + flags de evento", () => {
  it("felicitación del bot → venta aunque no haya tipificación", () => {
    expect(classifyOutcome({ saleByPhrase: true, typ: null, hasAgent: false, hasFallback: false, hasClose: false })).toBe("venta");
  });
  it("tipificación reconocida manda sobre los flags", () => {
    expect(classifyOutcome({ saleByPhrase: false, typ: "Dejo_de_contestar", hasAgent: true, hasFallback: false, hasClose: true })).toBe("no_contesta");
  });
  it("sin tipificación pero pasó a agente → atencion", () => {
    expect(classifyOutcome({ saleByPhrase: false, typ: null, hasAgent: true, hasFallback: false, hasClose: false })).toBe("atencion");
  });
  it("sin tipificación pero hubo fallback → no_entendido", () => {
    expect(classifyOutcome({ saleByPhrase: false, typ: null, hasAgent: false, hasFallback: true, hasClose: false })).toBe("no_entendido");
  });
  it("nada terminal → sin_cierre", () => {
    expect(classifyOutcome({ saleByPhrase: false, typ: null, hasAgent: false, hasFallback: false, hasClose: false })).toBe("sin_cierre");
  });
  it("cerró con tipificación irreconocible → otro", () => {
    expect(classifyOutcome({ saleByPhrase: false, typ: "codigo_raro_xyz", hasAgent: false, hasFallback: false, hasClose: true })).toBe("otro");
  });
});

// ── embudo de captura (prefijo número → NIP → nombre → venta) ──────────────────
describe("computeCaptureFunnel — embudo de prefijo + venta terminal", () => {
  it("cuenta sesiones que alcanzaron cada prefijo y la venta", () => {
    const sessions: BmSession[] = [];
    for (let i = 0; i < 3; i++) sessions.push(mkSession("B1", { fields: ["numero"] }));
    for (let i = 0; i < 2; i++) sessions.push(mkSession("B1", { fields: ["numero", "nip"] }));
    for (let i = 0; i < 5; i++) sessions.push(mkSession("B1", { fields: ["numero", "nip", "nombre"], sale: i < 2 }));

    const f = computeCaptureFunnel(sessions);
    const by = Object.fromEntries(f.map((s) => [s.key, s.count]));
    expect(by.numero).toBe(10); // todas piden número
    expect(by.nip).toBe(7);     // 2 + 5
    expect(by.nombre).toBe(5);  // 5
    expect(by.venta).toBe(2);   // felicitaciones
    // caída número → NIP
    const nip = f.find((s) => s.key === "nip")!;
    expect(nip.dropOff).toBe(3);
    expect(nip.dropOffPct).toBe(30);
  });
});

// ── libro mayor por bot ────────────────────────────────────────────────────────
describe("computeBotPerformance — KPIs por bot + cobertura + exclusión de prueba", () => {
  const botNames = { B1: "Bot Bueno", B2: "Bot Roto", B3: "BOT prueba menu" };
  const sessions: BmSession[] = [];
  for (let i = 0; i < 25; i++) sessions.push(mkSession("B1", { fields: ["numero", "nip", "nombre"], sale: i < 10 }));
  for (let i = 0; i < 25; i++) sessions.push(mkSession("B2", { fields: ["numero"], fallback: true, agent: true, sale: i < 2 }));
  for (let i = 0; i < 8; i++) sessions.push(mkSession("B3", { fields: ["numero"] }));
  for (let i = 0; i < 12; i++) sessions.push(mkSession("__none__", { fields: ["numero"] }));

  const perf = computeBotPerformance(sessions, { botNames });
  const byId = Object.fromEntries(perf.bots.map((b) => [b.botId, b]));

  it("bot sano: conversión correcta, salud ok", () => {
    const b = byId["B1"];
    expect(b.sessions).toBe(25);
    expect(b.sales).toBe(10);
    expect(b.conversionRate).toBe(40);
    expect(b.fallbackRate).toBe(0);
    expect(b.agentRate).toBe(0);
    expect(b.captureCompleteRate).toBe(100); // todas piden hasta "nombre"
    expect(b.health).toBe("ok");
    expect(b.sufficient).toBe(true);
    expect(b.isTest).toBe(false);
  });

  it("bot roto: 100% fallback/agente → salud broken (lo que el promedio ocultaba)", () => {
    const b = byId["B2"];
    expect(b.fallbackRate).toBe(100);
    expect(b.agentRate).toBe(100);
    expect(b.health).toBe("broken");
  });

  it("detecta y marca el bot de prueba; lo reporta en cobertura", () => {
    expect(byId["B3"].isTest).toBe(true);
    expect(perf.testBotIds).toContain("B3");
    expect(perf.coverage.testBotsExcluded).toBe(1);
    expect(perf.coverage.testSessionsExcluded).toBe(8);
  });

  it("bucket no atribuido para sesiones sin bot-change", () => {
    const none = byId["__none__"];
    expect(none.isUnattributed).toBe(true);
    expect(none.sessions).toBe(12);
  });

  it("cobertura de atribución correcta", () => {
    expect(perf.coverage.total).toBe(70);
    expect(perf.coverage.attributed).toBe(58); // 25 + 25 + 8
    expect(perf.coverage.unattributed).toBe(12);
    expect(perf.coverage.coveragePct).toBeCloseTo(82.9, 1);
    expect(perf.coverage.paidTrafficAvailable).toBe(false);
  });

  it("orden por sesiones desc", () => {
    expect(perf.bots[0].sessions).toBeGreaterThanOrEqual(perf.bots[1].sessions);
  });
});

describe("captura del NIP por imagen + OCR", () => {
  it("userSentImage detecta imagen/media del usuario", () => {
    const withImg: BmSession = {
      id: "i1", creationTime: 1, chat: { chat: { contactId: "c", channelId: "ch" } },
      messages: [
        { from: "bot", creationTime: 1, content: { text: "Envíame una foto de tu NIP" } },
        { from: "user", creationTime: 2, content: { type: "image", media: { url: "https://x/y.jpg", type: "image/jpeg" } } },
      ],
      events: [],
    };
    const textOnly: BmSession = {
      id: "t1", creationTime: 1, chat: { chat: { contactId: "c", channelId: "ch" } },
      messages: [{ from: "user", creationTime: 2, content: { text: "1234" } }],
      events: [],
    };
    expect(userSentImage(withImg)).toBe(true);
    expect(userSentImage(textOnly)).toBe(false);
  });

  it("sessionHasOcrNode detecta nodos de legibilidad y vigencia", () => {
    const legible: BmSession = {
      id: "o1", creationTime: 1, chat: { chat: { contactId: "c", channelId: "ch" } },
      messages: [], events: [{ name: "find-intent", creationTime: 1, info: { name: "fulfilled of ¿es Legible?" } }],
    };
    const vigencia: BmSession = {
      id: "o2", creationTime: 1, chat: { chat: { contactId: "c", channelId: "ch" } },
      messages: [], events: [{ name: "go-to", creationTime: 1, info: { name: "incorrect of Fecha Vigencia Nip" } }],
    };
    const none: BmSession = {
      id: "o3", creationTime: 1, chat: { chat: { contactId: "c", channelId: "ch" } },
      messages: [], events: [{ name: "go-to", creationTime: 1, info: { name: "fulfilled of NIP" } }],
    };
    expect(sessionHasOcrNode(legible)).toBe(true);
    expect(sessionHasOcrNode(vigencia)).toBe(true);
    expect(sessionHasOcrNode(none)).toBe(false);
  });

  it("computeBotPerformance marca usesOcrNip por imagen, nodo OCR o nombre", () => {
    const mk = (botId: string, opts: { img?: boolean; ocr?: boolean }): BmSession => ({
      id: `x${idc++}`, creationTime: 1, chat: { chat: { contactId: "c", channelId: "ch" } },
      messages: opts.img
        ? [{ from: "user", creationTime: 2, content: { type: "image", media: { url: "u", type: "image/png" } } }]
        : [{ from: "user", creationTime: 2, content: { text: "hola" } }],
      events: [
        { name: "bot-change", creationTime: 1, info: { currentBotId: botId } },
        ...(opts.ocr ? [{ name: "go-to", creationTime: 2, info: { name: "fulfilled of ¿es Legible?" } }] : []),
      ],
    });
    const sessions: BmSession[] = [];
    // OCR bot por NOMBRE (sin imagen ni nodo)
    for (let i = 0; i < 12; i++) sessions.push(mk("BOCR", {}));
    // bot de texto puro
    for (let i = 0; i < 12; i++) sessions.push(mk("BTXT", {}));
    // bot que recibe imágenes
    for (let i = 0; i < 12; i++) sessions.push(mk("BIMG", { img: i < 6 }));

    const perf = computeBotPerformance(sessions, { botNames: { BOCR: "Bait Pospago OCR", BTXT: "Prepago Sin Dudas", BIMG: "Bot con foto" } });
    const by = Object.fromEntries(perf.bots.map((b) => [b.botId, b]));
    expect(by["BOCR"].usesOcrNip).toBe(true);      // por nombre "OCR"
    expect(by["BTXT"].usesOcrNip).toBe(false);     // texto puro
    expect(by["BIMG"].ocrImageRate).toBe(50);      // 6/12
    expect(by["BIMG"].usesOcrNip).toBe(true);      // por imagen >= 10%
  });
});

describe("resolveBotId / isTestBot", () => {
  it("último bot-change.currentBotId; sin bot-change → __none__", () => {
    expect(resolveBotId(mkSession("BX", {}))).toBe("BX");
    expect(resolveBotId(mkSession("__none__", {}))).toBe("__none__");
  });
  it("detecta nombres de prueba sin marcar bots reales", () => {
    expect(isTestBot("BOT prueba menu")).toBe(true);
    expect(isTestBot("Prueba biometricos")).toBe(true);
    expect(isTestBot("PRUEBA_2")).toBe(true);
    expect(isTestBot("Bait Pospago OCR")).toBe(false);
    expect(isTestBot("Bot Prepago Parque Lira")).toBe(false);
  });
  // C3 (auditoría): los bots biométricos son PRODUCCIÓN, no prueba.
  it("NO excluye bots biométricos de producción", () => {
    expect(isTestBot("Bot Bait Biometricos")).toBe(false);
    expect(isTestBot("Prueba biometricos")).toBe(true); // sigue siendo prueba (por 'prueba')
  });
});

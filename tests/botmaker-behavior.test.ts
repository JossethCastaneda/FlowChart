import { describe, it, expect } from "vitest";
import {
  canonicalMessageType,
  computeMessageTypeBreakdown,
  computeButtonStats,
  computeBotErrors,
  computeTimeToSale,
  computeNipTiming,
  computeFirstMenuReaction,
  computeDataRequestOrderFunnel,
  computeBotBehavior,
  type BmSession,
} from "../lib/botmaker";

// Helper: timestamp a N segundos del epoch base (maneja overflow de segundos).
const t = (s: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, s)).toISOString();

const convo: BmSession = {
  id: "s1",
  creationTime: t(0),
  chat: { chat: { contactId: "c1", channelId: "ch1" } },
  messages: [
    { from: "user", creationTime: t(1), content: { type: "text", text: "hola" } },
    { from: "bot", creationTime: t(2), content: { type: "buttons", text: "Elige", buttons: ["Sí", "No"] } },
    { from: "user", creationTime: t(3), content: { type: "button-click", text: "Sí", selectedButton: "Sí" } },
    { from: "user", creationTime: t(4), content: { type: "image" } },
  ],
};

describe("canonicalMessageType", () => {
  it("mapea los tipos de Botmaker a buckets legibles", () => {
    expect(canonicalMessageType("text")).toBe("texto");
    expect(canonicalMessageType("IMAGE")).toBe("imagen");
    expect(canonicalMessageType("buttons")).toBe("botones");
    expect(canonicalMessageType("button-click")).toBe("boton-elegido");
    expect(canonicalMessageType("carousel")).toBe("carrusel");
    expect(canonicalMessageType("audio")).toBe("audio");
    expect(canonicalMessageType("")).toBe("otro");
  });
});

describe("computeMessageTypeBreakdown", () => {
  it("cuenta tipos y separa por remitente", () => {
    const mt = computeMessageTypeBreakdown([convo]);
    expect(mt.total).toBe(4);
    expect(mt.userTotal).toBe(3);
    expect(mt.botTotal).toBe(1);
    const types = Object.fromEntries(mt.byType.map((x) => [x.type, x.count]));
    expect(types["texto"]).toBe(1);
    expect(types["botones"]).toBe(1);
    expect(types["boton-elegido"]).toBe(1);
    expect(types["imagen"]).toBe(1);
  });

  it("respeta el filtro de canal", () => {
    expect(computeMessageTypeBreakdown([convo], "otro-canal").total).toBe(0);
  });
});

describe("computeButtonStats", () => {
  it("cuenta botones mostrados vs elegidos y CTR por etiqueta", () => {
    const bs = computeButtonStats([convo]);
    expect(bs.shownMessages).toBe(1);
    expect(bs.shownOptions).toBe(2);
    expect(bs.selected).toBe(1);
    const si = bs.topButtons.find((b) => b.label === "Sí");
    const no = bs.topButtons.find((b) => b.label === "No");
    expect(si).toMatchObject({ shown: 1, selected: 1, ctr: 100 });
    expect(no).toMatchObject({ shown: 1, selected: 0, ctr: 0 });
  });
});

describe("computeBotErrors", () => {
  it("agrupa eventos notification-error por tipo", () => {
    const s: BmSession = {
      id: "s2",
      creationTime: t(0),
      chat: { chat: { contactId: "c2", channelId: "ch1" } },
      messages: [],
      events: [
        { name: "notification-error", creationTime: t(5), info: { errorType: "TIMEOUT" } },
        { name: "notification-error", creationTime: t(6), info: { error: "API down" } },
        { name: "conversation-close", creationTime: t(7), info: { typification: "Sin respuesta" } },
      ],
    };
    const be = computeBotErrors([s]);
    expect(be.total).toBe(2);
    expect(be.sessionsWithError).toBe(1);
    const types = Object.fromEntries(be.byType.map((x) => [x.type, x.count]));
    expect(types["TIMEOUT"]).toBe(1);
    expect(types["API down"]).toBe(1);
  });
});

describe("computeTimeToSale (regla felicidades)", () => {
  it("cuenta ventas por mensaje del bot con 'felicidades' y mide el tiempo", () => {
    const sale: BmSession = {
      id: "s3",
      creationTime: t(0),
      chat: { chat: { contactId: "c3", channelId: "ch1" } },
      messages: [
        { from: "user", creationTime: t(1), content: { type: "text", text: "quiero portar" } },
        { from: "bot", creationTime: t(600), content: { type: "text", text: "¡Felicidades! Tu portabilidad fue exitosa." } },
      ],
      events: [],
    };
    const noSale: BmSession = {
      id: "s3b",
      creationTime: t(0),
      chat: { chat: { contactId: "c3b", channelId: "ch1" } },
      messages: [{ from: "bot", creationTime: t(120), content: { type: "text", text: "Gracias por tu consulta." } }],
      events: [],
    };
    const tts = computeTimeToSale([sale, noSale]);
    expect(tts.count).toBe(1);
    expect(tts.conversionRate).toBe(0.5);
    expect(tts.avgSec).toBe(600);
    expect(tts.medianSec).toBe(600);
    const buckets = Object.fromEntries(tts.distribution.map((x) => [x.bucket, x.count]));
    expect(buckets["5–15 min"]).toBe(1);
  });
});

describe("computeNipTiming", () => {
  it("mide prompt → primera entrega válida (numérica) del NIP", () => {
    const s: BmSession = {
      id: "n1",
      creationTime: t(0),
      chat: { chat: { contactId: "n1", channelId: "ch1" } },
      messages: [
        { from: "bot", creationTime: t(10), content: { type: "text", text: "Escribe tu NIP de portabilidad" } },
        { from: "user", creationTime: t(15), content: { type: "text", text: "no lo tengo" } },
        { from: "user", creationTime: t(40), content: { type: "text", text: "1234" } },
      ],
      events: [],
    };
    const nip = computeNipTiming([s]);
    expect(nip.prompted).toBe(1);
    expect(nip.delivered).toBe(1);
    expect(nip.avgSec).toBe(30);
    expect(nip.firstResponseRate).toBe(1);
  });
});

describe("computeFirstMenuReaction (Funnel 1)", () => {
  it("clasifica la primera respuesta al menú: botón / texto / sin respuesta", () => {
    const botClick: BmSession = {
      id: "f1", creationTime: t(0), chat: { chat: { contactId: "f1", channelId: "ch1" } },
      messages: [
        { from: "bot", creationTime: t(1), content: { type: "buttons", text: "Elige", buttons: ["A", "B"] } },
        { from: "user", creationTime: t(2), content: { type: "button-click", text: "A", selectedButton: "A" } },
      ],
      events: [],
    };
    const txt: BmSession = {
      id: "f2", creationTime: t(0), chat: { chat: { contactId: "f2", channelId: "ch1" } },
      messages: [
        { from: "bot", creationTime: t(1), content: { type: "text", text: "Hola" } },
        { from: "user", creationTime: t(2), content: { type: "text", text: "quiero info" } },
      ],
      events: [],
    };
    const none: BmSession = {
      id: "f3", creationTime: t(0), chat: { chat: { contactId: "f3", channelId: "ch1" } },
      messages: [{ from: "bot", creationTime: t(1), content: { type: "text", text: "Hola" } }],
      events: [],
    };
    const fm = computeFirstMenuReaction([botClick, txt, none]);
    expect(fm.total).toBe(3);
    const by = Object.fromEntries(fm.byType.map((x) => [x.type, x.count]));
    expect(by.boton).toBe(1);
    expect(by.texto).toBe(1);
    expect(by.sin_respuesta).toBe(1);
  });
});

describe("computeDataRequestOrderFunnel", () => {
  it("deriva el orden de captura desde eventos set-variable", () => {
    const a: BmSession = {
      id: "s4",
      creationTime: t(0),
      chat: { chat: { contactId: "c4", channelId: "ch1" } },
      messages: [],
      events: [
        { name: "set-variable", creationTime: t(1), info: { variableName: "nombre" } },
        { name: "set-variable", creationTime: t(2), info: { variableName: "telefono" } },
        { name: "set-variable", creationTime: t(3), info: { variableName: "email" } },
      ],
    };
    const b: BmSession = {
      ...a,
      id: "s5",
      events: [
        { name: "set-variable", creationTime: t(1), info: { variableName: "nombre" } },
        { name: "set-variable", creationTime: t(2), info: { variableName: "telefono" } },
      ],
    };
    const f = computeDataRequestOrderFunnel([a, b]);
    expect(f.method).toBe("set-variable");
    expect(f.totalSessions).toBe(2);
    expect(f.steps.map((s) => s.key)).toEqual(["nombre", "telefono", "email"]);
    expect(f.steps[0].reached).toBe(2);
    expect(f.steps[1].reached).toBe(2);
    expect(f.steps[2].reached).toBe(1);
    expect(f.steps[2].dropOff).toBe(1);
  });

  it("usa el fallback heurístico (patrones BAIT) cuando no hay set-variable", () => {
    const h: BmSession = {
      id: "s6",
      creationTime: t(0),
      chat: { chat: { contactId: "c6", channelId: "ch1" } },
      messages: [
        { from: "bot", creationTime: t(1), content: { type: "text", text: "¿Cuál es el número que deseas portar?" } },
        { from: "user", creationTime: t(2), content: { type: "text", text: "5512345678" } },
        { from: "bot", creationTime: t(3), content: { type: "text", text: "Escribe tu NIP" } },
        { from: "bot", creationTime: t(4), content: { type: "text", text: "¿Cuál es tu nombre completo?" } },
      ],
      events: [],
    };
    const f = computeDataRequestOrderFunnel([h]);
    expect(f.method).toBe("heuristic");
    expect(f.steps.map((s) => s.key)).toEqual(["numero", "nip", "nombre"]);
  });

  it("sin señales → method 'none' y pasos vacíos", () => {
    const empty: BmSession = { id: "s7", creationTime: t(0), chat: { chat: { contactId: "c7", channelId: "ch1" } }, messages: [], events: [] };
    const f = computeDataRequestOrderFunnel([empty]);
    expect(f.method).toBe("none");
    expect(f.steps).toEqual([]);
  });
});

describe("computeBotBehavior", () => {
  it("agrega todas las métricas en una sola estructura", () => {
    const sale: BmSession = {
      id: "s3",
      creationTime: t(0),
      chat: { chat: { contactId: "c3", channelId: "ch1" } },
      messages: [
        { from: "user", creationTime: t(1), content: { type: "text", text: "comprar" } },
        { from: "bot", creationTime: t(300), content: { type: "text", text: "¡Felicidades! Listo." } },
      ],
      events: [],
    };
    const bb = computeBotBehavior([convo, sale]);
    expect(bb.sampleSize).toBe(2);
    expect(bb.messageTypes.total).toBeGreaterThan(0);
    expect(bb.buttons.shownMessages).toBe(1);
    expect(bb.timeToSale.count).toBe(1);
    expect(bb.firstMenu.total).toBe(2);
    expect(bb.nip).toBeDefined();
    expect(bb.responseTimes.avgFirstResponseSec).toBeGreaterThanOrEqual(0);
  });
});

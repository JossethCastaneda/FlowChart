import { describe, it, expect } from "vitest";
import type { BmSession } from "@/lib/botmaker-api";
import { computeDashboard } from "@/lib/botmaker/insights";

// C1 (auditoría): sin eventos `fulfilled of`, el éxito de un campo se infiere por
// PROGRESIÓN (si el flujo avanzó a un campo posterior). Solo el campo más profundo
// donde el flujo se estancó cuenta como "failed".
function mk(id: string, nodes: string[]): BmSession {
  const ts = 1_700_000_000_000;
  return {
    id,
    creationTime: ts,
    chat: { chat: { contactId: "c" + id, channelId: "ch" } },
    messages: [{ from: "user", creationTime: ts, content: { text: "hola" } }],
    events: nodes.map((name, i) => ({ name: "go-to", creationTime: ts + i + 1, info: { name } })),
  };
}

const OPTS = {
  from: new Date(1_699_000_000_000).toISOString(),
  to: new Date(1_701_000_000_000).toISOString(),
  timezone: "America/Mexico_City",
  channels: [],
  botNames: {},
  variables: [],
};

describe("breakpoints — éxito inferido por progresión (C1)", () => {
  it("un campo con 'incorrect' pero el flujo AVANZÓ no cuenta como failed", () => {
    // A: incorrect en Numero, luego el flujo llega a NIP (avanzó) → Numero resuelto.
    // B: incorrect en NIP y se estanca ahí → NIP failed.
    const data = computeDashboard(
      [mk("A", ["incorrect of Numero", "fulfilled of NIP"]), mk("B", ["incorrect of NIP"])],
      OPTS as never
    );
    const bp = Object.fromEntries(data.breakpoints.map((b) => [b.field, b]));

    expect(bp["Numero"].failed).toBe(0);        // avanzó → NO failed
    expect(bp["Numero"].okAfterRetry).toBe(1);  // resuelto tras reintento (inferido)
    expect(bp["Numero"].failRate).toBe(0);

    expect(bp["NIP"].failed).toBe(1);           // estancado → failed
    expect(bp["NIP"].okFirstTry).toBe(1);       // la sesión A lo cumplió al primer intento
  });

  it("NO infla el failRate a ~100% cuando no hay eventos fulfilled", () => {
    // 5 sesiones que pasan por Numero (incorrect) y avanzan a NIP: ninguna failed.
    const sessions = Array.from({ length: 5 }, (_, i) =>
      mk("s" + i, ["incorrect of Numero", "go-to NIP", "fulfilled of NIP"])
    );
    const data = computeDashboard(sessions, OPTS as never);
    const numero = data.breakpoints.find((b) => b.field === "Numero");
    expect(numero?.failed).toBe(0);
    expect(numero?.failRate).toBe(0);
  });
});

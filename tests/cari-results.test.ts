import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// computeCariResults solo usa red (fetch) — prisma se importa a nivel de módulo
// en lib/crm/cari.ts pero no se toca en este camino; lo mockeamos para que el
// test no instancie un cliente real.
vi.mock("@/lib/prisma", () => ({ default: {} }));

import { computeCariResults } from "../lib/crm/cari";

/** Mock de la Report API: createtoken + payloads por reporte. */
function mockCariApi(payloads: Record<string, any[]>) {
  return vi.fn(async (url: any, init?: any) => {
    const path = String(url);
    const report = path.split("/").pop()!;
    if (report === "createtoken") {
      return new Response(JSON.stringify({ cariSec: "tok", expiresIn: "2099-01-01 00:00:00" }), { status: 200 });
    }
    const body = JSON.parse(init?.body || "{}");
    expect(body.date_from).toMatch(/^\d{4}-\d{2}-\d{2} 00:00:00$/); // ventana CDMX anclada a medianoche
    expect(body.limit).toBe(2000);
    return new Response(
      JSON.stringify({ end_of_registers: 1, payload: payloads[report] || [] }),
      { status: 200 }
    );
  });
}

const DAY = "2026-06-10";

describe("computeCariResults", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-06-12T18:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("normaliza funnel, razones de abandono, errores del bot y tendencia", async () => {
    vi.stubGlobal("fetch", mockCariApi({
      indicadoresAtencion: [{
        fecha: `${DAY} 00:00:00`,
        total_conversaciones: 100,
        atendidas_por_bot: 60,
        conversaciones_con_transferencia_a_agente: 40,
        "agente._atendidas": 25,
        "cliente._canceladas": 5,
        agentes_no_disponibles: 4,
        "agente._no_atendidas": 3,
        "agente._abandono": 2,
        "cliente._abandono": 1,
      }],
      conversaciones: [
        { abandono_inicio_web: 1, abandono_primera_interaccion: 0, total_de_interacciones: 4 },
        { abandono_inicio_web: 0, abandono_primera_interaccion: 1, total_de_interacciones: 8 },
      ],
      frasesSinRespuesta: [
        { frase_sin_respuesta: "precio del plan", nombre_del_flujo: "Ventas", nodo: "menu", fecha: `${DAY} 10:00:00` },
        { frase_sin_respuesta: "precio del plan", nombre_del_flujo: "Ventas", nodo: "menu", fecha: `${DAY} 11:00:00` },
        { frase_sin_respuesta: "horarios", nombre_del_flujo: "FAQ", nodo: "inicio", fecha: `${DAY} 12:00:00` },
      ],
      errores: [{ tipo: "api", codigo: "500" }],
    }));

    const r = await computeCariResults({ servicio: "credS", conversaciones: "credC" }, 7);

    expect(r.connected).toBe(true);
    expect(r.partial).toBe(false);
    expect(r.range.timezone).toBe("America/Mexico_City");

    // KPIs
    expect(r.kpis.totalConversations).toBe(100);
    expect(r.kpis.botOnly).toBe(60);
    expect(r.kpis.botContainmentPct).toBe(60);
    expect(r.kpis.agentAttended).toBe(25);
    expect(r.kpis.abandoned).toBe(15); // 5+4+3+2+1
    expect(r.kpis.completionPct).toBe(85); // (60+25)/100
    expect(r.kpis.avgInteractions).toBe(6); // (4+8)/2

    // Funnel
    expect(r.funnel[0]).toMatchObject({ key: "total", count: 100, rate: 100 });
    expect(r.funnel[1].count).toBe(98); // 100 - 1 web - 1 primera interacción
    expect(r.funnel[2].count).toBe(85);

    // Razones ordenadas por impacto (canceladas=5 es la mayor)
    expect(r.dropOffReasons[0].key).toBe("canceladas");
    expect(r.dropOffReasons[0].pct).toBe(5);

    // Errores del bot agrupados
    expect(r.botErrors.totalUnanswered).toBe(3);
    expect(r.botErrors.unanswered[0]).toMatchObject({ phrase: "precio del plan", count: 2, flow: "Ventas" });
    expect(r.botErrors.systemErrors).toBe(1);

    // Tendencia diaria en el día CDMX correcto
    const day = r.daily.find((d) => d.day === DAY);
    expect(day).toMatchObject({ total: 100, bot: 60, attended: 25, abandoned: 15 });
    expect(r.daily).toHaveLength(7);

    expect(r.headline).toContain("85%");
  });

  it("marca partial cuando falta una credencial y no revienta", async () => {
    vi.stubGlobal("fetch", mockCariApi({ indicadoresAtencion: [] }));
    const r = await computeCariResults({ servicio: "credS" }, 7); // sin credencial de conversaciones
    expect(r.partial).toBe(true);
    expect(r.kpis.totalConversations).toBe(0);
    expect(r.botErrors.totalUnanswered).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { classifyTypification, bucketTypifications, OUTCOME_ORDER } from "@/lib/botmaker/outcomes";

// Tipificaciones REALES observadas en la muestra de 3500 sesiones (docs/botmaker-bot-patterns-observed.md).
describe("classifyTypification — tipificaciones reales", () => {
  const cases: [string, string][] = [
    // venta (cambio completado) — todas sus variantes deben colapsar a "venta"
    ["Venta_exitosa", "venta"],
    ["venta_cliente", "venta"],
    ["Venta_Bot_Pospago", "venta"],
    ["Venta", "venta"],
    ["venta_referido", "venta"],
    ["Activación", "venta"],
    ["Activacion", "venta"],
    // abandono / silencio
    ["Dejo_de_contestar", "no_contesta"],
    ["No_contesta", "no_contesta"],
    ["Abandona_conversacion", "no_contesta"],
    // ya es cliente (no portable)
    ["ya_es_bait", "ya_cliente"],
    ["Ya_es_bait", "ya_cliente"],
    ["Ya_es_cliente_movistar", "ya_cliente"],
    // atención humana
    ["atención_a_clientes", "atencion"],
    ["Atencion_al_cliente", "atencion"],
    ["Busca_atencion_al_cliente", "atencion"],
    ["gestión_por_llamada", "atencion"],
    // rechazo / no viable comercial
    ["No_le_interesa", "no_interesa"],
    ["no_interesado", "no_interesa"],
    ["no_viable", "no_interesa"],
    // error técnico
    ["Error_ICC", "error_tecnico"],
    ["Falta_NIP", "error_tecnico"],
    ["Menor_de_edad", "error_tecnico"],
    ["Cliente_extrajero", "error_tecnico"], // typo real en los datos (sin la 'n')
    // prospecto / seguimiento
    ["propecto_a_venta", "prospecto"],      // contiene "venta" pero es prospecto
    ["saludos_y_envio_oferta", "prospecto"],
    ["Agenda", "prospecto"],
    ["no_interesado", "no_interesa"],
  ];

  for (const [raw, expected] of cases) {
    it(`"${raw}" → ${expected}`, () => {
      expect(classifyTypification(raw)).toBe(expected);
    });
  }

  it("CRÍTICO: 'No_le_interesa_activar' NO debe contar como venta", () => {
    expect(classifyTypification("No_le_interesa_activar")).toBe("no_interesa");
  });

  it("vacío / nulo → otro", () => {
    expect(classifyTypification("")).toBe("otro");
    expect(classifyTypification(null)).toBe("otro");
    expect(classifyTypification(undefined)).toBe("otro");
  });
});

describe("bucketTypifications — agregación y normalización", () => {
  it("colapsa variantes de venta en un solo bucket con pct correcto", () => {
    const raw = {
      Venta_exitosa: 31,
      venta_cliente: 26,
      Venta_Bot_Pospago: 26,
      Dejo_de_contestar: 105,
      No_contesta: 56,
      ya_es_bait: 69,
    };
    const buckets = bucketTypifications(raw);
    const venta = buckets.find((b) => b.key === "venta");
    const noContesta = buckets.find((b) => b.key === "no_contesta");

    expect(venta?.count).toBe(83); // 31 + 26 + 26
    expect(noContesta?.count).toBe(161); // 105 + 56
    // total = 313 → venta pct = 26.5%
    expect(venta?.pct).toBeCloseTo(26.5, 1);
    // conserva las variantes crudas como muestra ordenada
    expect(venta?.rawSamples[0].name).toBe("Venta_exitosa");
    expect(venta?.rawSamples.length).toBe(3);
  });

  it("respeta el orden de presentación canónico (venta primero)", () => {
    const buckets = bucketTypifications({ Dejo_de_contestar: 10, Venta: 5 });
    expect(buckets[0].key).toBe("venta");
    expect(OUTCOME_ORDER[0]).toBe("venta");
  });
});

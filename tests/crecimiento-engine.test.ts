/**
 * Tests del motor predictivo de Aria (lib/crecimiento/engine).
 *
 * El motor es puro y determinista, así que se verifica matemática real:
 * AUC (Mann–Whitney con empates), split estratificado sembrado, regresión
 * logística sobre datos separables, scorecard WOE, cortes de prioridad y
 * el parser CSV RFC-4180.
 */

import { describe, it, expect } from "vitest";
import {
  computeAuc,
  computeMetrics,
  bestThreshold,
  computePriorityCuts,
  priorityFor,
} from "@/lib/crecimiento/engine/metrics";
import { stratifiedSplit } from "@/lib/crecimiento/engine/split";
import { trainLogReg, predictProbaLogReg, sigmoid } from "@/lib/crecimiento/engine/logreg";
import { buildWoe, predictProbaWoe } from "@/lib/crecimiento/engine/woe";
import { profileColumns, detectTarget, extractTarget } from "@/lib/crecimiento/engine/profiling";
import { parseCsv } from "@/lib/crecimiento/engine/csv";

const toBuf = (s: string): ArrayBuffer => new TextEncoder().encode(s).buffer as ArrayBuffer;

describe("computeAuc", () => {
  it("separación perfecta = 1.0", () => {
    expect(computeAuc([0, 0, 1, 1], [0.1, 0.2, 0.8, 0.9])).toBe(1);
  });

  it("ranking invertido = 0.0", () => {
    expect(computeAuc([0, 0, 1, 1], [0.9, 0.8, 0.2, 0.1])).toBe(0);
  });

  it("scores idénticos (todo empates) = 0.5", () => {
    expect(computeAuc([0, 1, 0, 1], [0.5, 0.5, 0.5, 0.5])).toBe(0.5);
  });

  it("una sola clase = 0.5 (indefinido, no explota)", () => {
    expect(computeAuc([1, 1, 1], [0.1, 0.5, 0.9])).toBe(0.5);
    expect(computeAuc([0, 0], [0.2, 0.7])).toBe(0.5);
  });

  it("caso mixto conocido (empate parcial promedia rangos)", () => {
    // pos={0.8, 0.5}, neg={0.5, 0.2} → pares: (0.8>0.5)=1, (0.8>0.2)=1,
    // (0.5=0.5)=0.5, (0.5>0.2)=1 → AUC = 3.5/4 = 0.875
    expect(computeAuc([0, 1, 0, 1], [0.2, 0.5, 0.5, 0.8])).toBeCloseTo(0.875, 10);
  });
});

describe("computeMetrics / bestThreshold", () => {
  const y = [0, 0, 0, 1, 1, 1];
  const scores = [0.1, 0.2, 0.55, 0.6, 0.8, 0.9];

  it("elige un umbral que maximiza F1 y produce confusión coherente", () => {
    const t = bestThreshold(y, scores);
    const m = computeMetrics(y, scores, t);
    expect(m.f1).toBe(1); // separable en 0.6
    expect(m.confusion.tp).toBe(3);
    expect(m.confusion.fp).toBe(0);
    expect(m.confusion.fn).toBe(0);
    expect(m.confusion.tn).toBe(3);
    expect(m.accuracy).toBe(1);
    expect(m.auc).toBe(1);
  });

  it("la matriz de confusión siempre suma n", () => {
    const m = computeMetrics(y, scores, 0.5);
    const { tp, fp, tn, fn } = m.confusion;
    expect(tp + fp + tn + fn).toBe(y.length);
  });
});

describe("stratifiedSplit", () => {
  // 20% positivos sobre 100 filas
  const y = Array.from({ length: 100 }, (_, i) => (i < 20 ? 1 : 0));

  it("es determinista para la misma semilla", () => {
    const a = stratifiedSplit(y, 0.2, "dataset-abc");
    const b = stratifiedSplit(y, 0.2, "dataset-abc");
    expect(a.train).toEqual(b.train);
    expect(a.test).toEqual(b.test);
  });

  it("particiona sin solaparse y cubre todos los índices", () => {
    const s = stratifiedSplit(y, 0.2, "seed-1");
    const union = [...s.train, ...s.test].sort((x, z) => x - z);
    expect(union).toEqual(Array.from({ length: 100 }, (_, i) => i));
  });

  it("preserva la proporción de clases en el test set", () => {
    const s = stratifiedSplit(y, 0.2, "seed-2");
    expect(s.test).toHaveLength(20);
    const posInTest = s.test.filter((i) => y[i] === 1).length;
    expect(posInTest).toBe(4); // 20% de 20 positivos
  });
});

describe("trainLogReg", () => {
  it("sigmoid es numéricamente estable en extremos", () => {
    expect(sigmoid(1000)).toBeCloseTo(1, 10);
    expect(sigmoid(-1000)).toBeCloseTo(0, 10);
    expect(sigmoid(0)).toBe(0.5);
  });

  it("aprende un problema linealmente separable (AUC alta y determinista)", () => {
    // Feature única: valores bajos → clase 0, altos → clase 1.
    const X = Array.from({ length: 60 }, (_, i) => [i < 30 ? -1 + (i % 5) * 0.1 : 1 + (i % 5) * 0.1]);
    const y = Array.from({ length: 60 }, (_, i) => (i < 30 ? 0 : 1));
    const m1 = trainLogReg(X, y);
    const m2 = trainLogReg(X, y);
    expect(m1.weights).toEqual(m2.weights); // determinista (init en ceros, sin RNG)
    const probs = X.map((x) => predictProbaLogReg(m1, x));
    expect(computeAuc(y, probs)).toBeGreaterThan(0.99);
  });

  it("pondera clases: no colapsa al predecir siempre la mayoritaria", () => {
    // 10% positivos, separables.
    const X = Array.from({ length: 100 }, (_, i) => [i < 90 ? 0 : 3]);
    const y = Array.from({ length: 100 }, (_, i) => (i < 90 ? 0 : 1));
    const m = trainLogReg(X, y);
    const probs = X.map((x) => predictProbaLogReg(m, x));
    expect(computeAuc(y, probs)).toBeGreaterThan(0.99);
    // El positivo debe recibir probabilidad claramente mayor que el negativo.
    expect(probs[99]).toBeGreaterThan(probs[0] + 0.3);
  });
});

describe("buildWoe (scorecard)", () => {
  it("rankea por encima a la categoría con mayor tasa de conversión", () => {
    // 40 filas: canal "referido" convierte 80%, canal "frio" convierte 10%.
    const rows: Record<string, string>[] = [];
    const y: number[] = [];
    for (let i = 0; i < 20; i++) {
      rows.push({ canal: "referido", convertido: i < 16 ? "1" : "0" });
      y.push(i < 16 ? 1 : 0);
    }
    for (let i = 0; i < 20; i++) {
      rows.push({ canal: "frio", convertido: i < 2 ? "1" : "0" });
      y.push(i < 2 ? 1 : 0);
    }
    const profiles = profileColumns(["canal", "convertido"], rows);
    const woe = buildWoe(rows, profiles, y, "convertido");
    const pReferido = predictProbaWoe(woe, { canal: "referido", convertido: "" });
    const pFrio = predictProbaWoe(woe, { canal: "frio", convertido: "" });
    expect(pReferido).toBeGreaterThan(pFrio);
    const probs = rows.map((r) => predictProbaWoe(woe, r));
    expect(computeAuc(y, probs)).toBeGreaterThan(0.8);
  });
});

describe("profiling: detectTarget / extractTarget", () => {
  it("detecta una columna binaria como objetivo y la extrae como 0/1", () => {
    const rows = [
      { edad: "25", convertido: "si" },
      { edad: "40", convertido: "no" },
      { edad: "31", convertido: "si" },
      { edad: "55", convertido: "no" },
    ];
    const profiles = profileColumns(["edad", "convertido"], rows);
    const target = detectTarget(profiles, rows);
    expect(target).toBe("convertido");
    expect(extractTarget(rows, "convertido")).toEqual([1, 0, 1, 0]);
  });
});

describe("computePriorityCuts / priorityFor", () => {
  it("el top ~20% es High y el fondo es Low", () => {
    const probs = Array.from({ length: 100 }, (_, i) => i / 100);
    const cuts = computePriorityCuts(probs);
    expect(priorityFor(0.99, cuts)).toBe("High");
    expect(priorityFor(0.6, cuts)).toBe("Medium");
    expect(priorityFor(0.1, cuts)).toBe("Low");
  });
});

describe("parseCsv", () => {
  it("parsea CSV simple con CRLF", () => {
    const parsed = parseCsv(toBuf("nombre,edad\r\nAna,30\r\nLuis,25\r\n"));
    expect(parsed.headers).toEqual(["nombre", "edad"]);
    expect(parsed.rows).toEqual([
      { nombre: "Ana", edad: "30" },
      { nombre: "Luis", edad: "25" },
    ]);
  });

  it("maneja comillas con comas y comillas escapadas", () => {
    const parsed = parseCsv(toBuf('nota,valor\n"hola, mundo","dijo ""ok"""\n'));
    expect(parsed.rows[0]).toEqual({ nota: "hola, mundo", valor: 'dijo "ok"' });
  });

  it("detecta delimitador punto y coma (exports Excel es-MX)", () => {
    const parsed = parseCsv(toBuf("a;b\n1;2\n"));
    expect(parsed.delimiter).toBe(";");
    expect(parsed.rows[0]).toEqual({ a: "1", b: "2" });
  });

  it("ignora el BOM de UTF-8", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("x,y\n1,2\n")]);
    const parsed = parseCsv(bytes.buffer as ArrayBuffer);
    expect(parsed.headers).toEqual(["x", "y"]);
  });
});

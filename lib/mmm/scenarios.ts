/**
 * ZEFIRUS MMM — Escenarios de simulacion (v2)
 *
 * Escenario A: Redistribuir presupuesto (budget total fijo)
 * Escenario B: Aumentar budget total X% -> forecast de uplift
 * Escenario C: Objetivo inverso -> "quiero $X de ventas, cuanto necesito gastar?"
 */

import type { ChannelConfig, MmmModel, SimResult, Allocation } from "./types";
import { simulateBudget, optimizeBudget } from "./optimizer";
import { hillSaturation } from "./saturation";

// ─── Escenario B: Budget Up ───────────────────────────────────────────────────

/**
 * Simula que el budget total sube X%.
 * Redistribuye el incremento de forma optima entre canales.
 */
export function scenarioBudgetIncrease(
  currentSpend: Record<string, number>,
  increasePct: number,        // ej. 20 = +20%
  model: MmmModel,
  channels: ChannelConfig[],
  baselineOutcome: number,
): { result: SimResult; allocation: Allocation } {
  const totalCurrent = Object.values(currentSpend).reduce((s, v) => s + v, 0);
  const newTotal = totalCurrent * (1 + increasePct / 100);
  const allocation = optimizeBudget(currentSpend, newTotal, channels, model);
  const result = simulateBudget(allocation.recommended, model, channels, baselineOutcome);
  return { result, allocation };
}

// ─── Escenario C: Objetivo Inverso ────────────────────────────────────────────

/**
 * Dado un objetivo de outcome (ventas/leads), calcula el presupuesto total
 * necesario y su distribucion optima. Usa busqueda binaria.
 *
 * Supuesto: el outcome es monotono creciente con el gasto total.
 */
export function scenarioInverseTarget(
  targetOutcome: number,
  currentSpend: Record<string, number>,
  model: MmmModel,
  channels: ChannelConfig[],
  maxBudget = 500_000,
  tolerance = 100,
): { totalBudget: number; allocation: Allocation; achievable: boolean } {

  // Verificar si el objetivo es alcanzable con maxBudget
  const maxAlloc = optimizeBudget(currentSpend, maxBudget, channels, model);
  const maxOutcome = maxAlloc.projectedOutcome;
  if (maxOutcome < targetOutcome) {
    return { totalBudget: maxBudget, allocation: maxAlloc, achievable: false };
  }

  // Biseccion para encontrar el presupuesto minimo
  let lo = 0;
  let hi = maxBudget;
  let bestAlloc = maxAlloc;
  let iterations = 0;

  while (hi - lo > tolerance && iterations < 40) {
    const mid = (lo + hi) / 2;
    const alloc = optimizeBudget(currentSpend, mid, channels, model);
    if (alloc.projectedOutcome >= targetOutcome) {
      hi = mid;
      bestAlloc = alloc;
    } else {
      lo = mid;
    }
    iterations++;
  }

  return { totalBudget: hi, allocation: bestAlloc, achievable: true };
}

// ─── Punto de saturacion por canal ───────────────────────────────────────────

/**
 * Calcula que porcentaje del gasto de cada canal esta "en zona de saturacion"
 * (por encima del 80% del efecto maximo).
 * Returns 0-1 por canal.
 */
export function saturationLevels(
  currentSpend: Record<string, number>,
  channels: ChannelConfig[],
): Record<string, number> {
  const levels: Record<string, number> = {};
  for (const ch of channels.filter(c => c.enabled)) {
    const spend = currentSpend[ch.id] ?? 0;
    const response = hillSaturation(spend, ch.saturationAlpha, ch.saturationK);
    levels[ch.id] = response; // 0-1; > 0.8 = en saturacion
  }
  return levels;
}


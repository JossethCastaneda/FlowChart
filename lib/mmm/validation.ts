import type { ChannelConfig, WeeklyRow } from "./types";

export interface ValidationIssue {
  type: "warning" | "error";
  title: string;
  description: string;
}

function calcCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  const n = x.length;
  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    num += xDiff * yDiff;
    denX += xDiff * xDiff;
    denY += yDiff * yDiff;
  }
  if (denX === 0 || denY === 0) return 0;
  return num / Math.sqrt(denX * denY);
}

export function validateMmmData(rows: WeeklyRow[], channels: ChannelConfig[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const activeRows = rows.filter(r => !r.isOutlier);
  const n = activeRows.length;
  
  if (n < 3) {
    issues.push({ type: "error", title: "Datos insuficientes", description: "Se necesitan al menos 3 semanas activas de datos para modelar." });
    return issues;
  }

  // Check empty outcomes
  const zeroOutcomes = activeRows.filter(r => r.outcome <= 0).length;
  if (zeroOutcomes > n * 0.3) {
    issues.push({ type: "warning", title: "Target con demasiados ceros", description: `El ${Math.round((zeroOutcomes/n)*100)}% de las semanas no tiene ingresos. El modelo asume que hay un baseline orgánico constante.` });
  }

  // Check constant channels and collinearity
  const enabledCh = channels.filter(c => c.enabled);
  for (let i = 0; i < enabledCh.length; i++) {
    const chA = enabledCh[i];
    const spendA = activeRows.map(r => r.spend[chA.id] ?? 0);
    const maxA = Math.max(...spendA);
    const minA = Math.min(...spendA);
    
    if (maxA === 0) {
      issues.push({ type: "error", title: `Canal vacío: ${chA.name}`, description: "El canal está habilitado pero no tiene gasto registrado." });
      continue;
    }
    
    if (maxA === minA) {
      issues.push({ type: "warning", title: `Varianza nula en ${chA.name}`, description: "El gasto de este canal es constante, el modelo no podrá estimar bien su impacto (Robyn/FastMMM penaliza esto)." });
    }

    // Collinearity check
    for (let j = i + 1; j < enabledCh.length; j++) {
      const chB = enabledCh[j];
      const spendB = activeRows.map(r => r.spend[chB.id] ?? 0);
      const corr = calcCorrelation(spendA, spendB);
      if (corr > 0.85) {
        issues.push({ type: "warning", title: `Alta colinealidad`, description: `Los canales ${chA.name} y ${chB.name} tienen una correlación del ${(corr*100).toFixed(0)}%. Ridge Regression ayudará, pero podría afectar la interpretabilidad de la contribución.` });
      }
    }
  }

  return issues;
}

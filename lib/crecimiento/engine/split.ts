/**
 * Split train/test estratificado y determinista (sembrado con el datasetId).
 * Preserva la proporción de clases para que la evaluación sea válida en datos
 * desbalanceados.
 */

import { seededRng, shuffledIndices } from "./rng";

export interface Split {
  train: number[];
  test: number[];
}

export function stratifiedSplit(y: number[], testFrac: number, seed: string): Split {
  const rng = seededRng(seed);
  const posIdx: number[] = [];
  const negIdx: number[] = [];
  y.forEach((v, i) => {
    if (v === 1) posIdx.push(i);
    else negIdx.push(i);
  });

  const shuffle = (arr: number[]): number[] => {
    const order = shuffledIndices(arr.length, rng);
    return order.map((o) => arr[o]);
  };

  const train: number[] = [];
  const test: number[] = [];
  const take = (arr: number[]): void => {
    const shuffled = shuffle(arr);
    const nTest = Math.round(shuffled.length * testFrac);
    shuffled.forEach((v, i) => {
      if (i < nTest) test.push(v);
      else train.push(v);
    });
  };
  take(posIdx);
  take(negIdx);
  return { train, test };
}

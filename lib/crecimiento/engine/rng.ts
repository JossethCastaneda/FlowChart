/**
 * RNG determinista y sembrado (xmur3 + mulberry32).
 *
 * Se usa exclusivamente para barajar/dividir filas de forma reproducible. NO se
 * usa Math.random en ninguna parte del motor: dos cold starts con el mismo
 * datasetId producen exactamente el mismo split y, por tanto, el mismo modelo.
 */

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Crea un generador de números [0,1) determinista a partir de una semilla string. */
export function seededRng(seed: string): () => number {
  const h = xmur3(seed);
  return mulberry32(h());
}

/** Fisher–Yates determinista: devuelve una copia barajada de los índices 0..n-1. */
export function shuffledIndices(n: number, rng: () => number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = idx[i];
    idx[i] = idx[j];
    idx[j] = tmp;
  }
  return idx;
}

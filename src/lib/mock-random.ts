/**
 * Tiny seeded PRNG helpers shared by the mock external API modules
 * (`lib/api/verification.ts`, `lib/api/valuation.ts`). Deriving a stable
 * seed from a string key lets every mock "endpoint" return the same
 * answer for the same input without a database round trip — see
 * `lib/api/verification.ts` for why that matters.
 */

export function hashString(input: string): number {
  let hash = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number) {
  let state = seed;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

export function intBetween(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** A random value in `[min, max)`, biased toward `bias` in `[0, 1]` (0 = min, 1 = max). */
export function floatAround(rng: () => number, center: number, spreadRatio: number): number {
  const offset = (rng() * 2 - 1) * spreadRatio;
  return center * (1 + offset);
}

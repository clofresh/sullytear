/**
 * Seedable RNG for the headless simulator.
 *
 * The main entry point reseeds `deck.ts` via `_setDeckRng` before each
 * game so identical seeds produce identical runs. Kept separate from
 * `src/game/deck.ts` so the production bundle never pulls in sim code.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive a child seed from a parent seed + index — avoids run-to-run
 *  correlation when iterating a single base seed. */
export function childSeed(base: number, index: number): number {
  // Simple splitmix-ish mixing; adequate for differentiating runs.
  let x = (base ^ (index + 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

import { STICKER_REGISTRY } from './registry';
import type { StickerDefId } from './types';

/**
 * Seeded PRNG — mulberry32. Deterministic for a given 32-bit seed.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically roll an offer of 3 distinct sticker def ids for a given
 * (seed, tier). In v1 `tier` is accepted but ignored — all stickers in the
 * registry have equal weight. The `tier` parameter is reserved for future
 * weighting / gating.
 */
export function rollStickerOffer(seed: number, tier: number): StickerDefId[] {
  // Fold tier into the seed so different tiers yield different draws for
  // the same base seed.
  const rng = mulberry32((seed ^ (tier * 0x9e3779b1)) >>> 0);
  // Sort keys explicitly so determinism does not depend on bundler/runtime
  // property insertion order.
  const pool = (Object.keys(STICKER_REGISTRY) as StickerDefId[]).slice().sort();
  // Fisher–Yates partial shuffle; take first 3.
  const n = pool.length;
  const picks = Math.min(3, n);
  for (let i = 0; i < picks; i++) {
    const j = i + Math.floor(rng() * (n - i));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, picks);
}

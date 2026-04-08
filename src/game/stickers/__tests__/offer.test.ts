import { describe, it, expect } from 'vitest';
import { rollStickerOffer } from '../offer';
import { STICKER_REGISTRY } from '../registry';
import type { StickerDefId } from '../types';

describe('rollStickerOffer', () => {
  it('returns 3 unique def ids', () => {
    const ids = rollStickerOffer(12345, 1);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });

  it('only returns ids from the registry', () => {
    const ids = rollStickerOffer(99, 1);
    const known = new Set(Object.keys(STICKER_REGISTRY) as StickerDefId[]);
    for (const id of ids) expect(known.has(id)).toBe(true);
  });

  it('is deterministic for the same seed+tier', () => {
    expect(rollStickerOffer(42, 2)).toEqual(rollStickerOffer(42, 2));
    expect(rollStickerOffer(7, 1)).toEqual(rollStickerOffer(7, 1));
  });

  it('produces different offers for different seeds (usually)', () => {
    const a = rollStickerOffer(1, 1);
    const b = rollStickerOffer(2, 1);
    // Not strictly required, but with 6 ids and 3 picks, should commonly differ.
    expect(a.join(',') === b.join(',')).toBe(false);
  });
});

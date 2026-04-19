import { describe, it, expect } from 'vitest';
import { STICKER_REGISTRY, getStickerDef } from '../registry';

describe('sticker registry', () => {
  it('includes the six v1 defs', () => {
    const ids = Object.keys(STICKER_REGISTRY).sort();
    expect(ids).toEqual(['forge', 'frostbitten', 'sharpened', 'surge', 'vampire', 'volatile']);
  });

  it('every def has a name, description, and validTargetKinds', () => {
    for (const def of Object.values(STICKER_REGISTRY)) {
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.validTargetKinds.length).toBeGreaterThan(0);
    }
  });

  it('getStickerDef throws on unknown id', () => {
    // @ts-expect-error — invalid id
    expect(() => getStickerDef('nope')).toThrow();
  });
});

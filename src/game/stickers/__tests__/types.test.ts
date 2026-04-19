import { describe, it, expect } from 'vitest';
import type { Sticker, StickerTarget } from '../types';
import { foundationId } from '../../pileId';

describe('Sticker types', () => {
  it('accepts each target kind', () => {
    const targets: StickerTarget[] = [
      { kind: 'card', cardId: 'c1' },
      { kind: 'pile', pileId: foundationId(0) },
      { kind: 'hero' },
      { kind: 'monster', scope: 'current' },
      { kind: 'monster', scope: 'next' },
      { kind: 'charge' },
    ];
    expect(targets).toHaveLength(6);
  });

  it('builds a well-formed Sticker instance', () => {
    const s: Sticker = {
      id: 'abc',
      defId: 'sharpened',
      target: { kind: 'card', cardId: 'c1' },
    };
    expect(s.defId).toBe('sharpened');
  });
});

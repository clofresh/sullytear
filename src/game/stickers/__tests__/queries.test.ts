import { describe, it, expect } from 'vitest';
import {
  findCardStickers,
  findPileStickers,
  findHeroStickers,
  findMonsterStickers,
} from '../queries';
import type { Sticker } from '../types';
import { foundationId } from '../../pileId';

const stickers: Sticker[] = [
  { id: '1', defId: 'sharpened', target: { kind: 'card', cardId: 'c1' } },
  { id: '2', defId: 'forge', target: { kind: 'pile', pileId: foundationId(0) } },
  { id: '3', defId: 'vampire', target: { kind: 'hero' } },
  { id: '4', defId: 'frostbitten', target: { kind: 'monster', scope: 'next' } },
];

describe('sticker queries', () => {
  it('finds stickers on a card', () => {
    expect(findCardStickers(stickers, 'c1')).toHaveLength(1);
    expect(findCardStickers(stickers, 'c2')).toHaveLength(0);
  });
  it('finds stickers on a pile by pileId equality', () => {
    expect(findPileStickers(stickers, foundationId(0))).toHaveLength(1);
    expect(findPileStickers(stickers, foundationId(1))).toHaveLength(0);
  });
  it('finds hero stickers', () => {
    expect(findHeroStickers(stickers)).toHaveLength(1);
  });
  it('finds monster stickers by scope', () => {
    expect(findMonsterStickers(stickers, 'next')).toHaveLength(1);
    expect(findMonsterStickers(stickers, 'current')).toHaveLength(0);
  });
});

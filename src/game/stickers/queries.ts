import type { Sticker } from './types';
import type { PileId } from '../types';

export function findCardStickers(stickers: Sticker[], cardId: string): Sticker[] {
  return stickers.filter((s) => s.target.kind === 'card' && s.target.cardId === cardId);
}

export function findPileStickers(stickers: Sticker[], pileId: PileId): Sticker[] {
  return stickers.filter((s) => s.target.kind === 'pile' && s.target.pileId === pileId);
}

export function findHeroStickers(stickers: Sticker[]): Sticker[] {
  return stickers.filter((s) => s.target.kind === 'hero');
}

export function findMonsterStickers(
  stickers: Sticker[],
  scope: 'current' | 'next',
): Sticker[] {
  return stickers.filter((s) => s.target.kind === 'monster' && s.target.scope === scope);
}

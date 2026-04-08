import type { PileId } from '../types';

export type StickerDefId =
  | 'sharpened'
  | 'volatile'
  | 'forge'
  | 'vampire'
  | 'frostbitten'
  | 'surge';

export type StickerTarget =
  | { kind: 'card'; cardId: string }
  | { kind: 'pile'; pileId: PileId }
  | { kind: 'hero' }
  | { kind: 'monster'; scope: 'current' | 'next' }
  | { kind: 'charge' };

export interface Sticker {
  id: string;
  defId: StickerDefId;
  target: StickerTarget;
  usesLeft?: number;
}

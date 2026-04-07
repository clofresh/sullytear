import type { Card } from '../game/types';

export interface PileLayout {
  /** Pixel `top` offset for each card in the pile, parallel to the input. */
  tops: number[];
  /** Total stacking offset of the last card (height = totalOffset + cardHeight). */
  totalOffset: number;
}

/**
 * Compute the vertical layout of a tableau pile. Pure so it can be unit
 * tested without rendering.
 */
export function computePileLayout(
  pile: ReadonlyArray<Card>,
  faceUpOffset: number,
  faceDownOffset: number,
): PileLayout {
  const tops: number[] = [];
  let acc = 0;
  for (let i = 0; i < pile.length; i++) {
    if (i > 0) {
      acc += pile[i - 1].faceUp ? faceUpOffset : faceDownOffset;
    }
    tops.push(acc);
  }
  return { tops, totalOffset: acc };
}

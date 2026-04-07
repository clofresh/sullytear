import type { Rank } from './types';

/**
 * Face cards (Aces and royals) get special combat effects throughout the
 * detector pipeline and the drop-preview system. Centralizing the
 * rank/name table here removes the `[1, 11, 12, 13].includes(rank)`
 * literal that used to live in `combat/types.ts` and `dropPreview.ts`.
 *
 * Note: detectors that branch per-rank (foundation, reveal, faceCardMove)
 * deliberately keep their per-rank `if` ladders — collapsing them into a
 * single table abstraction would obscure the per-tier effect tuning,
 * which is exactly the kind of code humans want to read inline.
 */

export const RANK_ACE: Rank = 1;
export const RANK_JACK: Rank = 11;
export const RANK_QUEEN: Rank = 12;
export const RANK_KING: Rank = 13;

export const FACE_CARD_RANKS: ReadonlySet<Rank> = new Set([
  RANK_ACE,
  RANK_JACK,
  RANK_QUEEN,
  RANK_KING,
]);

export const FACE_NAMES: Readonly<Record<number, string>> = {
  [RANK_ACE]: 'Ace',
  [RANK_JACK]: 'Jack',
  [RANK_QUEEN]: 'Queen',
  [RANK_KING]: 'King',
};

export function isFaceCard(rank: number): boolean {
  return FACE_CARD_RANKS.has(rank as Rank);
}

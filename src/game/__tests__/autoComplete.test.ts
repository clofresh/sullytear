import { describe, it, expect } from 'vitest';
import { getAutoCompleteSequence } from '../autoComplete';
import type { Card, Suit, Rank } from '../types';

const card = (suit: Suit, rank: Rank, faceUp = true): Card => ({
  id: `${suit}-${rank}`,
  suit,
  rank,
  faceUp,
});

describe('getAutoCompleteSequence', () => {
  it('returns no moves for an empty board', () => {
    const empty4: Card[][] = [[], [], [], []];
    const empty7: Card[][] = [[], [], [], [], [], [], []];
    expect(getAutoCompleteSequence(empty7, empty4)).toEqual([]);
  });

  it('moves a single Ace from a tableau pile to the matching foundation', () => {
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    tableau[2] = [card('hearts', 1)];
    const foundations: Card[][] = [[], [], [], []];
    const moves = getAutoCompleteSequence(tableau, foundations);
    expect(moves).toHaveLength(1);
    expect(moves[0].from).toBe('tableau-2');
    expect(moves[0].to.startsWith('foundation-')).toBe(true);
    expect(moves[0].cards).toHaveLength(1);
    expect(moves[0].cards[0].rank).toBe(1);
  });

  it('chains consecutive ranks of the same suit from one tableau pile', () => {
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    tableau[0] = [
      card('clubs', 3),
      card('clubs', 2),
      card('clubs', 1),
    ];
    const foundations: Card[][] = [[], [], [], []];
    const moves = getAutoCompleteSequence(tableau, foundations);
    // Order must be A → 2 → 3
    expect(moves.map(m => m.cards[0].rank)).toEqual([1, 2, 3]);
    // All play onto the same foundation index
    const fIds = new Set(moves.map(m => m.to));
    expect(fIds.size).toBe(1);
  });

  it('does not produce moves when no card can play to a foundation', () => {
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    // 5 with no preceding cards on the foundation
    tableau[4] = [card('spades', 5)];
    const foundations: Card[][] = [[], [], [], []];
    expect(getAutoCompleteSequence(tableau, foundations)).toEqual([]);
  });

  it('does not mutate the input arrays', () => {
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    tableau[1] = [card('diamonds', 1)];
    const foundations: Card[][] = [[], [], [], []];
    const tabSnap = tableau.map(p => p.map(c => c.id));
    const founSnap = foundations.map(p => p.map(c => c.id));
    getAutoCompleteSequence(tableau, foundations);
    expect(tableau.map(p => p.map(c => c.id))).toEqual(tabSnap);
    expect(foundations.map(p => p.map(c => c.id))).toEqual(founSnap);
  });
});

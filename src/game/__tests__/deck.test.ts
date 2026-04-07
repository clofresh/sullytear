import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, dealTableau } from '../deck';

describe('createDeck', () => {
  it('produces 52 unique cards, all face-down', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const ids = new Set(deck.map(c => c.id));
    expect(ids.size).toBe(52);
    expect(deck.every(c => c.faceUp === false)).toBe(true);
  });

  it('contains every rank/suit combination exactly once', () => {
    const deck = createDeck();
    const seen = new Set<string>();
    for (const c of deck) seen.add(`${c.suit}-${c.rank}`);
    expect(seen.size).toBe(52);
  });
});

describe('shuffle', () => {
  it('returns a new array with the same cards', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).not.toBe(deck);
    expect(shuffled).toHaveLength(deck.length);
    expect(new Set(shuffled.map(c => c.id))).toEqual(new Set(deck.map(c => c.id)));
  });

  it('does not mutate the input', () => {
    const deck = createDeck();
    const before = deck.map(c => c.id);
    shuffle(deck);
    expect(deck.map(c => c.id)).toEqual(before);
  });
});

describe('dealTableau', () => {
  it('deals 7 piles of sizes 1..7', () => {
    const { tableau, stock } = dealTableau(createDeck());
    expect(tableau).toHaveLength(7);
    for (let i = 0; i < 7; i++) {
      expect(tableau[i]).toHaveLength(i + 1);
    }
    // 1+2+...+7 = 28; 52 - 28 = 24 left in stock
    expect(stock).toHaveLength(24);
  });

  it('flips only the top card of each pile face-up', () => {
    const { tableau } = dealTableau(createDeck());
    for (let col = 0; col < 7; col++) {
      const pile = tableau[col];
      for (let row = 0; row < pile.length; row++) {
        expect(pile[row].faceUp).toBe(row === pile.length - 1);
      }
    }
  });

  it('leaves the entire stock face-down', () => {
    const { stock } = dealTableau(createDeck());
    expect(stock.every(c => c.faceUp === false)).toBe(true);
  });

  it('does not mutate the input deck', () => {
    const deck = createDeck();
    const before = deck.map(c => c.id);
    dealTableau(deck);
    expect(deck.map(c => c.id)).toEqual(before);
  });
});

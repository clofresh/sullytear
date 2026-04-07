import { describe, it, expect } from 'vitest';
import {
  isFaceCard,
  FACE_CARD_RANKS,
  FACE_NAMES,
  RANK_ACE,
  RANK_JACK,
  RANK_QUEEN,
  RANK_KING,
} from '../faceCard';

describe('isFaceCard', () => {
  it('treats Ace, Jack, Queen, King as face cards', () => {
    for (const r of [RANK_ACE, RANK_JACK, RANK_QUEEN, RANK_KING]) {
      expect(isFaceCard(r)).toBe(true);
    }
  });

  it('rejects every non-face rank', () => {
    for (let r = 2; r <= 10; r++) expect(isFaceCard(r)).toBe(false);
  });
});

describe('FACE_NAMES / FACE_CARD_RANKS', () => {
  it('names every face rank', () => {
    expect(FACE_NAMES[RANK_ACE]).toBe('Ace');
    expect(FACE_NAMES[RANK_JACK]).toBe('Jack');
    expect(FACE_NAMES[RANK_QUEEN]).toBe('Queen');
    expect(FACE_NAMES[RANK_KING]).toBe('King');
  });

  it('FACE_CARD_RANKS contains exactly the four ranks', () => {
    expect(FACE_CARD_RANKS.size).toBe(4);
    expect([...FACE_CARD_RANKS].sort()).toEqual([1, 11, 12, 13]);
  });
});

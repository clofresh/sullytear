import { describe, it, expect } from 'vitest';
import { computePileLayout } from '../tableauLayout';
import type { Card } from '../../game/types';

const card = (id: string, faceUp: boolean): Card => ({
  id,
  rank: 1,
  suit: 'spades',
  faceUp,
});

describe('computePileLayout', () => {
  const FACE_UP = 30;
  const FACE_DOWN = 8; // matches FACE_DOWN_OFFSET in constants

  it('returns zero offsets and zero total for empty pile', () => {
    expect(computePileLayout([], FACE_UP, FACE_DOWN)).toEqual({
      tops: [],
      totalOffset: 0,
    });
  });

  it('places the first card at top 0', () => {
    const layout = computePileLayout([card('1', true)], FACE_UP, FACE_DOWN);
    expect(layout.tops).toEqual([0]);
    expect(layout.totalOffset).toBe(0);
  });

  it('uses face-up offset between two face-up cards', () => {
    const layout = computePileLayout(
      [card('1', true), card('2', true)],
      FACE_UP,
      FACE_DOWN,
    );
    expect(layout.tops).toEqual([0, FACE_UP]);
    expect(layout.totalOffset).toBe(FACE_UP);
  });

  it('uses face-down offset for face-down predecessors', () => {
    const layout = computePileLayout(
      [card('1', false), card('2', false), card('3', true)],
      FACE_UP,
      FACE_DOWN,
    );
    expect(layout.tops).toEqual([0, FACE_DOWN, FACE_DOWN * 2]);
    expect(layout.totalOffset).toBe(FACE_DOWN * 2);
  });

  it('mixes offsets according to each predecessor face state', () => {
    const layout = computePileLayout(
      [card('1', false), card('2', true), card('3', true)],
      FACE_UP,
      FACE_DOWN,
    );
    expect(layout.tops).toEqual([0, FACE_DOWN, FACE_DOWN + FACE_UP]);
    expect(layout.totalOffset).toBe(FACE_DOWN + FACE_UP);
  });
});

import { describe, it, expect } from 'vitest';
import {
  getMaxSnapDistance,
  findClosestValidTarget,
  resolveDropTarget,
} from '../dropTarget';

describe('getMaxSnapDistance', () => {
  it('returns Infinity for stock drags', () => {
    expect(getMaxSnapDistance(true, 80)).toBe(Infinity);
  });
  it('returns 1.2 * cardWidth for non-stock drags', () => {
    expect(getMaxSnapDistance(false, 80)).toBeCloseTo(96);
  });
});

describe('findClosestValidTarget', () => {
  const rects: Record<string, { x: number; y: number }> = {
    'tableau-0': { x: 0, y: 0 },
    'tableau-1': { x: 100, y: 0 },
    'foundation-0': { x: 500, y: 500 },
  };
  const getPileCenter = (id: string) => rects[id] ?? null;

  it('returns the closest valid target within snap distance', () => {
    const valid = new Set(['tableau-0', 'tableau-1']);
    expect(findClosestValidTarget({ x: 90, y: 5 }, valid, 50, getPileCenter)).toBe(
      'tableau-1',
    );
  });

  it('returns null when no targets are within snap distance', () => {
    const valid = new Set(['foundation-0']);
    expect(findClosestValidTarget({ x: 0, y: 0 }, valid, 50, getPileCenter)).toBeNull();
  });

  it('skips piles whose center cannot be found', () => {
    const valid = new Set(['tableau-0', 'missing']);
    expect(findClosestValidTarget({ x: 0, y: 0 }, valid, 10, getPileCenter)).toBe(
      'tableau-0',
    );
  });

  it('returns null for empty target set', () => {
    expect(findClosestValidTarget({ x: 0, y: 0 }, new Set(), 100, getPileCenter)).toBeNull();
  });
});

describe('resolveDropTarget', () => {
  const center = (id: string) => {
    const map: Record<string, { x: number; y: number }> = {
      'tableau-1': { x: 100, y: 0 },
      'waste': { x: 200, y: 0 },
    };
    return map[id] ?? null;
  };

  it('uses elementsAtPoint when a pile is hit and is not the source', () => {
    const target = resolveDropTarget({
      point: { x: 0, y: 0 },
      dragSourcePileId: 'tableau-0',
      validTargets: new Set(),
      cardWidth: 80,
      elementsAtPoint: () => ['tableau-1'],
      getPileCenter: center,
    });
    expect(target).toBe('tableau-1');
  });

  it('ignores the source pile from elementsAtPoint and falls through', () => {
    const target = resolveDropTarget({
      point: { x: 100, y: 0 },
      dragSourcePileId: 'tableau-0',
      validTargets: new Set(['tableau-1']),
      cardWidth: 80,
      elementsAtPoint: () => ['tableau-0'],
      getPileCenter: center,
    });
    expect(target).toBe('tableau-1');
  });

  it('falls back to closest-valid when elementsAtPoint returns nothing', () => {
    const target = resolveDropTarget({
      point: { x: 110, y: 0 },
      dragSourcePileId: 'tableau-0',
      validTargets: new Set(['tableau-1']),
      cardWidth: 80,
      elementsAtPoint: () => [],
      getPileCenter: center,
    });
    expect(target).toBe('tableau-1');
  });

  it('snaps stock drags to waste from arbitrary distance', () => {
    const target = resolveDropTarget({
      point: { x: 9999, y: 9999 },
      dragSourcePileId: 'stock',
      validTargets: new Set(['waste']),
      cardWidth: 80,
      elementsAtPoint: () => [],
      getPileCenter: center,
    });
    expect(target).toBe('waste');
  });

  it('returns null when nothing matches', () => {
    const target = resolveDropTarget({
      point: { x: 0, y: 0 },
      dragSourcePileId: 'tableau-0',
      validTargets: new Set(),
      cardWidth: 80,
      elementsAtPoint: () => [],
      getPileCenter: center,
    });
    expect(target).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { parsePileId, tableauId, foundationId } from '../pileId';

describe('parsePileId', () => {
  it('parses stock and waste', () => {
    expect(parsePileId('stock')).toEqual({ kind: 'stock' });
    expect(parsePileId('waste')).toEqual({ kind: 'waste' });
  });

  it('parses tableau ids and extracts the index', () => {
    expect(parsePileId('tableau-0')).toEqual({ kind: 'tableau', index: 0 });
    expect(parsePileId('tableau-6')).toEqual({ kind: 'tableau', index: 6 });
  });

  it('parses foundation ids and extracts the index', () => {
    expect(parsePileId('foundation-0')).toEqual({ kind: 'foundation', index: 0 });
    expect(parsePileId('foundation-3')).toEqual({ kind: 'foundation', index: 3 });
  });

  it('returns null for unknown shapes', () => {
    expect(parsePileId('garbage')).toBeNull();
    expect(parsePileId('tableau-')).toBeNull();
    expect(parsePileId('foundation-x')).toBeNull();
    expect(parsePileId('')).toBeNull();
  });
});

describe('tableauId / foundationId', () => {
  it('round-trips through parsePileId', () => {
    for (let i = 0; i < 7; i++) {
      const id = tableauId(i);
      expect(id).toBe(`tableau-${i}`);
      expect(parsePileId(id)).toEqual({ kind: 'tableau', index: i });
    }
    for (let i = 0; i < 4; i++) {
      const id = foundationId(i);
      expect(id).toBe(`foundation-${i}`);
      expect(parsePileId(id)).toEqual({ kind: 'foundation', index: i });
    }
  });
});

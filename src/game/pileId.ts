import type { PileId } from './types';

/**
 * Type-safe parsing/construction of pile ids. Replaces the
 * `parseInt(id.split('-')[1])` pattern and the `as PileId` casts.
 */

export type ParsedPileId =
  | { kind: 'stock' }
  | { kind: 'waste' }
  | { kind: 'tableau'; index: number }
  | { kind: 'foundation'; index: number };

export function parsePileId(id: string): ParsedPileId | null {
  if (id === 'stock') return { kind: 'stock' };
  if (id === 'waste') return { kind: 'waste' };

  const dash = id.indexOf('-');
  if (dash < 0) return null;
  const prefix = id.slice(0, dash);
  const rest = id.slice(dash + 1);
  if (rest === '') return null;
  const index = Number(rest);
  if (!Number.isInteger(index) || index < 0) return null;

  if (prefix === 'tableau') return { kind: 'tableau', index };
  if (prefix === 'foundation') return { kind: 'foundation', index };
  return null;
}

export function tableauId(index: number): PileId {
  return `tableau-${index}` as PileId;
}

export function foundationId(index: number): PileId {
  return `foundation-${index}` as PileId;
}

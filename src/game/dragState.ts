import type { Card } from './types';

// Shared mutable drag state — written by GameBoard, read by Tableau/Foundation
export const dragState = {
  active: false,
  cards: [] as Card[],
  sourcePileId: '',
  pointerX: 0,
  pointerY: 0,
};

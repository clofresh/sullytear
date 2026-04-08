export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Color = 'red' | 'black';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface CombatSnapshot {
  heroHp: number;
  heroMaxHp: number;
  heroArmor: number;
  heroDefense: number;
  monsterHp: number;
  monsterMaxHp: number;
  monsterThreat: number;
  monsterThreatMax: number;
  empowerMultiplier: number;
  empowered: boolean;
  poisonTurns: number;
  combatResult: 'none' | 'victory' | 'defeat';
}

export interface Snapshot {
  stock: Card[];
  waste: Card[];
  tableau: Card[][];
  foundations: Card[][];
  moves: number;
  stockCycleCount: number;
  combat: CombatSnapshot | null;
}

export interface GameState {
  stock: Card[];
  waste: Card[];
  tableau: Card[][];
  foundations: Card[][];
  drawMode: 1 | 3;
  moves: number;
  startTime: number | null;
  isWon: boolean;
  undoStack: Snapshot[];
  gameId: number;
  stockCycleCount: number;
}

export interface MovePayload {
  cards: Card[];
  from: PileId;
  fromIndex: number;
  to: PileId;
}

export type PileId =
  | 'stock'
  | 'waste'
  | `tableau-${number}`
  | `foundation-${number}`;

export interface GameActions {
  newGame: (drawMode?: 1 | 3) => void;
  drawFromStock: () => void;
  moveCards: (payload: MovePayload) => void;
  undo: () => void;
  autoComplete: () => void;
}

export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export function getColor(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function getRankLabel(rank: Rank): string {
  switch (rank) {
    case 1: return 'A';
    case 11: return 'J';
    case 12: return 'Q';
    case 13: return 'K';
    default: return String(rank);
  }
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, GameActions, Snapshot, MovePayload, Card } from './types';
import { createDeck, shuffle, dealTableau } from './deck';
import { canMoveToTableau, canMoveToFoundation, isWin } from './rules';
import { parsePileId } from './pileId';

// Combat-store bridge. combatStore.ts registers callbacks here at import
// time, avoiding a circular static import (combatStore already imports
// useGameStore). Until registered, undo behaves as it always did and just
// restores solitaire state.
type CombatBridge = {
  snapshot: () => NonNullable<Snapshot['combat']>;
  restore: (snap: NonNullable<Snapshot['combat']>) => void;
};
let combatBridge: CombatBridge | null = null;
export function registerCombatBridge(bridge: CombatBridge): void {
  combatBridge = bridge;
}

/** @internal Exported for benchmarking only — see takeSnapshot.bench.ts. */
export function takeSnapshot(state: GameState): Snapshot {
  return {
    stock: state.stock.map(c => ({ ...c })),
    waste: state.waste.map(c => ({ ...c })),
    tableau: state.tableau.map(pile => pile.map(c => ({ ...c }))),
    foundations: state.foundations.map(pile => pile.map(c => ({ ...c }))),
    moves: state.moves,
    stockCycleCount: state.stockCycleCount,
    combat: combatBridge ? combatBridge.snapshot() : null,
  };
}

export interface PreDealtDeal {
  tableau: Card[][];
  stock: Card[];
}

export function buildDeal(): PreDealtDeal {
  const deck = shuffle(createDeck());
  return dealTableau(deck);
}

function createInitialState(
  drawMode: 1 | 3 = 1,
  preDealt?: PreDealtDeal,
): Omit<GameState, 'gameId'> {
  const { tableau, stock } = preDealt ?? buildDeal();
  return {
    stock,
    waste: [],
    tableau,
    foundations: [[], [], [], []],
    drawMode,
    moves: 0,
    startTime: null,
    isWon: false,
    undoStack: [],
    stockCycleCount: 0,
  };
}

function parsePile(pileId: string, state: GameState): Card[] {
  const parsed = parsePileId(pileId);
  if (!parsed) return [];
  switch (parsed.kind) {
    case 'stock': return state.stock;
    case 'waste': return state.waste;
    case 'tableau': return state.tableau[parsed.index];
    case 'foundation': return state.foundations[parsed.index];
  }
}

function setPile(pileId: string, cards: Card[], state: GameState): Partial<GameState> {
  const parsed = parsePileId(pileId);
  if (!parsed) return {};
  switch (parsed.kind) {
    case 'stock': return { stock: cards };
    case 'waste': return { waste: cards };
    case 'tableau': {
      const tableau = [...state.tableau];
      tableau[parsed.index] = cards;
      return { tableau };
    }
    case 'foundation': {
      const foundations = [...state.foundations];
      foundations[parsed.index] = cards;
      return { foundations };
    }
  }
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      gameId: 1,

      newGame: (drawMode?: 1 | 3, preDealt?: PreDealtDeal) => {
        const mode = drawMode ?? get().drawMode;
        set({
          ...createInitialState(mode, preDealt),
          gameId: get().gameId + 1,
        });
      },

      drawFromStock: () => {
        const state = get();
        const snapshot = takeSnapshot(state);

        if (state.stock.length === 0) {
          // Reset: move waste back to stock
          if (state.waste.length === 0) return;
          const newStock = [...state.waste].reverse().map(c => ({ ...c, faceUp: false }));
          set({
            stock: newStock,
            waste: [],
            moves: state.moves + 1,
            startTime: state.startTime ?? Date.now(),
            undoStack: [...state.undoStack, snapshot].slice(-50),
            stockCycleCount: state.stockCycleCount + 1,
          });
          return;
        }

        const count = Math.min(state.drawMode, state.stock.length);
        const newStock = [...state.stock];
        const drawn = newStock.splice(newStock.length - count, count).map(c => ({ ...c, faceUp: true }));
        set({
          stock: newStock,
          waste: [...state.waste, ...drawn],
          moves: state.moves + 1,
          startTime: state.startTime ?? Date.now(),
          undoStack: [...state.undoStack, snapshot].slice(-50),
        });
      },

      moveCards: (payload: MovePayload) => {
        const state = get();
        const { from, fromIndex, to } = payload;

        const sourcePile = [...parsePile(from, state)];
        const targetPile = [...parsePile(to, state)];
        const movingCards = sourcePile.slice(fromIndex);

        // Validate
        if (to.startsWith('foundation-')) {
          if (movingCards.length !== 1) return;
          if (!canMoveToFoundation(movingCards[0], targetPile)) return;
        } else if (to.startsWith('tableau-')) {
          if (!canMoveToTableau(movingCards, targetPile)) return;
        } else {
          return; // Can't move to stock or waste
        }

        const snapshot = takeSnapshot(state);
        const newSource = sourcePile.slice(0, fromIndex);

        // Flip top card of source tableau if needed
        if (from.startsWith('tableau-') && newSource.length > 0) {
          const top = newSource[newSource.length - 1];
          if (!top.faceUp) {
            newSource[newSource.length - 1] = { ...top, faceUp: true };
          }
        }

        const newTarget = [...targetPile, ...movingCards];

        const updates: Partial<GameState> = {
          ...setPile(from, newSource, state),
          moves: state.moves + 1,
          startTime: state.startTime ?? Date.now(),
          undoStack: [...state.undoStack, snapshot].slice(-50),
        };

        // Need to apply source changes first, then target on top
        const intermediateState = { ...state, ...updates };
        const targetUpdates = setPile(to, newTarget, intermediateState);

        const finalUpdates = { ...updates, ...targetUpdates };

        // Check for win
        const newFoundations = finalUpdates.foundations ?? state.foundations;
        if (isWin(newFoundations)) {
          finalUpdates.isWon = true;
        }

        set(finalUpdates);
      },

      undo: () => {
        const state = get();
        if (state.undoStack.length === 0) return;
        const stack = [...state.undoStack];
        const snapshot = stack.pop()!;
        set({
          stock: snapshot.stock,
          waste: snapshot.waste,
          tableau: snapshot.tableau,
          foundations: snapshot.foundations,
          moves: snapshot.moves,
          undoStack: stack,
          isWon: false,
          stockCycleCount: snapshot.stockCycleCount,
        });
        if (snapshot.combat && combatBridge) {
          combatBridge.restore(snapshot.combat);
        }
      },

      autoComplete: () => {
        // This is called repeatedly by the UI hook to move one card at a time
        const state = get();
        for (let t = 0; t < 7; t++) {
          const pile = state.tableau[t];
          if (pile.length === 0) continue;
          const topCard = pile[pile.length - 1];
          for (let f = 0; f < 4; f++) {
            if (canMoveToFoundation(topCard, state.foundations[f])) {
              get().moveCards({
                cards: [topCard],
                from: `tableau-${t}`,
                fromIndex: pile.length - 1,
                to: `foundation-${f}`,
              });
              return;
            }
          }
        }
      },
    }),
    {
      name: 'solitaire-game',
      partialize: (state) => ({
        stock: state.stock,
        waste: state.waste,
        tableau: state.tableau,
        foundations: state.foundations,
        drawMode: state.drawMode,
        moves: state.moves,
        startTime: state.startTime,
        gameId: state.gameId,
        isWon: state.isWon,
        stockCycleCount: state.stockCycleCount,
      }),
    }
  )
);

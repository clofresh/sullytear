import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../store';
import { useCombatStore } from '../combatStore';
import { _withSuppressedEvents } from '../orchestrator';
import type { Card, Rank, Suit } from '../types';

function makeCard(suit: Suit, rank: Rank, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp };
}

/**
 * Apply a partial gameStore state without triggering combatStore events.
 * Mirrors the helper used by combatStore.test.ts.
 */
function setup(partial: Partial<Parameters<typeof useGameStore.setState>[0]>) {
  _withSuppressedEvents(() => {
    useGameStore.setState(partial as Parameters<typeof useGameStore.setState>[0]);
  });
}

function emptyTableau(): Card[][] {
  return [[], [], [], [], [], [], []];
}

function emptyFoundations(): Card[][] {
  return [[], [], [], []];
}

function resetAll() {
  _withSuppressedEvents(() => {
    useGameStore.getState().newGame();
  });
  useCombatStore.getState().resetCombat();
}

describe('gameStore', () => {
  beforeEach(() => {
    resetAll();
  });

  describe('newGame', () => {
    it('deals 28 tableau cards across 7 columns', () => {
      useGameStore.getState().newGame();
      const state = useGameStore.getState();
      const total = state.tableau.reduce((sum, p) => sum + p.length, 0);
      expect(total).toBe(28);
      expect(state.tableau.map(p => p.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('leaves 24 cards in stock and 0 in waste', () => {
      useGameStore.getState().newGame();
      const state = useGameStore.getState();
      expect(state.stock.length).toBe(24);
      expect(state.waste.length).toBe(0);
    });

    it('only the top card of each tableau column is face-up', () => {
      useGameStore.getState().newGame();
      const state = useGameStore.getState();
      state.tableau.forEach(pile => {
        if (pile.length === 0) return;
        expect(pile[pile.length - 1].faceUp).toBe(true);
        for (let i = 0; i < pile.length - 1; i++) {
          expect(pile[i].faceUp).toBe(false);
        }
      });
    });

    it('clears foundations, undoStack, and isWon', () => {
      setup({ isWon: true, undoStack: [{} as never] });
      useGameStore.getState().newGame();
      const state = useGameStore.getState();
      expect(state.isWon).toBe(false);
      expect(state.undoStack).toEqual([]);
      expect(state.foundations).toEqual(emptyFoundations());
    });

    it('increments gameId', () => {
      const before = useGameStore.getState().gameId;
      useGameStore.getState().newGame();
      expect(useGameStore.getState().gameId).toBe(before + 1);
    });

    it('honors a draw-mode override', () => {
      useGameStore.getState().newGame(3);
      expect(useGameStore.getState().drawMode).toBe(3);
      useGameStore.getState().newGame(1);
      expect(useGameStore.getState().drawMode).toBe(1);
    });
  });

  describe('drawFromStock', () => {
    it('moves drawMode cards from stock to waste face-up', () => {
      setup({
        stock: [makeCard('hearts', 5, false), makeCard('hearts', 6, false), makeCard('hearts', 7, false)],
        waste: [],
        drawMode: 1,
      });
      useGameStore.getState().drawFromStock();
      const state = useGameStore.getState();
      expect(state.stock.length).toBe(2);
      expect(state.waste.length).toBe(1);
      expect(state.waste[0]).toMatchObject({ suit: 'hearts', rank: 7, faceUp: true });
    });

    it('draws three cards in drawMode 3', () => {
      setup({
        stock: [
          makeCard('hearts', 2, false),
          makeCard('hearts', 3, false),
          makeCard('hearts', 4, false),
          makeCard('hearts', 5, false),
        ],
        waste: [],
        drawMode: 3,
      });
      useGameStore.getState().drawFromStock();
      const state = useGameStore.getState();
      expect(state.stock.length).toBe(1);
      expect(state.waste.length).toBe(3);
      expect(state.waste.every(c => c.faceUp)).toBe(true);
    });

    it('draws fewer than drawMode when stock is short', () => {
      setup({
        stock: [makeCard('hearts', 2, false), makeCard('hearts', 3, false)],
        waste: [],
        drawMode: 3,
      });
      useGameStore.getState().drawFromStock();
      const state = useGameStore.getState();
      expect(state.stock.length).toBe(0);
      expect(state.waste.length).toBe(2);
    });

    it('cycles waste back to stock face-down and increments stockCycleCount', () => {
      setup({
        stock: [],
        waste: [makeCard('hearts', 2), makeCard('hearts', 3), makeCard('hearts', 4)],
        stockCycleCount: 0,
      });
      useGameStore.getState().drawFromStock();
      const state = useGameStore.getState();
      expect(state.waste.length).toBe(0);
      expect(state.stock.length).toBe(3);
      expect(state.stock.every(c => !c.faceUp)).toBe(true);
      // Stock is reversed waste
      expect(state.stock[0].rank).toBe(4);
      expect(state.stock[2].rank).toBe(2);
      expect(state.stockCycleCount).toBe(1);
    });

    it('is a no-op when both stock and waste are empty', () => {
      setup({ stock: [], waste: [], moves: 5 });
      useGameStore.getState().drawFromStock();
      expect(useGameStore.getState().moves).toBe(5);
    });

    it('increments moves and pushes a snapshot to undoStack', () => {
      setup({
        stock: [makeCard('hearts', 5, false)],
        waste: [],
        moves: 0,
        undoStack: [],
      });
      useGameStore.getState().drawFromStock();
      const state = useGameStore.getState();
      expect(state.moves).toBe(1);
      expect(state.undoStack.length).toBe(1);
    });
  });

  describe('moveCards', () => {
    it('moves a single card tableau → foundation when valid', () => {
      setup({
        tableau: [[makeCard('hearts', 1)], [], [], [], [], [], []],
        foundations: emptyFoundations(),
      });
      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 1)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'foundation-0',
      });
      const state = useGameStore.getState();
      expect(state.foundations[0]).toHaveLength(1);
      expect(state.foundations[0][0].rank).toBe(1);
      expect(state.tableau[0]).toEqual([]);
    });

    it('rejects an invalid foundation move', () => {
      setup({
        tableau: [[makeCard('hearts', 5)], [], [], [], [], [], []],
        foundations: emptyFoundations(),
      });
      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 5)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'foundation-0',
      });
      // 5 of hearts cannot go to empty foundation (only Aces)
      expect(useGameStore.getState().foundations[0]).toEqual([]);
      expect(useGameStore.getState().tableau[0]).toHaveLength(1);
    });

    it('moves an alternating-color sequence tableau → tableau', () => {
      setup({
        tableau: [
          [makeCard('hearts', 12), makeCard('clubs', 11)], // Q♥ J♣
          [makeCard('spades', 13)],                         // K♠
          [], [], [], [], [],
        ],
        foundations: emptyFoundations(),
      });
      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 12), makeCard('clubs', 11)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });
      const state = useGameStore.getState();
      expect(state.tableau[0]).toEqual([]);
      expect(state.tableau[1]).toHaveLength(3);
      expect(state.tableau[1].map(c => c.rank)).toEqual([13, 12, 11]);
    });

    it('rejects a same-color tableau move', () => {
      setup({
        tableau: [
          [makeCard('hearts', 11)], // J♥
          [makeCard('diamonds', 12)], // Q♦
          [], [], [], [], [],
        ],
      });
      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 11)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });
      expect(useGameStore.getState().tableau[1]).toHaveLength(1);
      expect(useGameStore.getState().tableau[0]).toHaveLength(1);
    });

    it('flips the newly exposed source-pile card face-up', () => {
      setup({
        tableau: [
          [makeCard('clubs', 7, false), makeCard('hearts', 1)], // facedown 7♣ then A♥
          [], [], [], [], [], [],
        ],
        foundations: emptyFoundations(),
      });
      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 1)],
        from: 'tableau-0',
        fromIndex: 1,
        to: 'foundation-0',
      });
      const state = useGameStore.getState();
      expect(state.tableau[0]).toHaveLength(1);
      expect(state.tableau[0][0].faceUp).toBe(true);
    });

    it('rejects multi-card moves to a foundation', () => {
      setup({
        tableau: [
          [makeCard('hearts', 1), makeCard('clubs', 2)],
          [], [], [], [], [], [],
        ],
        foundations: emptyFoundations(),
      });
      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 1), makeCard('clubs', 2)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'foundation-0',
      });
      // No move should happen
      expect(useGameStore.getState().tableau[0]).toHaveLength(2);
      expect(useGameStore.getState().foundations[0]).toEqual([]);
    });

    it('sets isWon when all 4 foundations reach 13', () => {
      const fullFoundation = (suit: Suit) =>
        Array.from({ length: 13 }, (_, i) => makeCard(suit, (i + 1) as Rank));
      // 3 foundations already complete; final A→K just needs the King
      const almostFullSpades = fullFoundation('spades').slice(0, 12);
      setup({
        foundations: [
          fullFoundation('hearts'),
          fullFoundation('diamonds'),
          fullFoundation('clubs'),
          almostFullSpades,
        ],
        tableau: [[makeCard('spades', 13)], [], [], [], [], [], []],
      });
      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 13)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'foundation-3',
      });
      expect(useGameStore.getState().isWon).toBe(true);
    });
  });

  describe('undo', () => {
    it('restores the prior snapshot and clears isWon', () => {
      setup({
        tableau: [[makeCard('hearts', 1)], [], [], [], [], [], []],
        foundations: emptyFoundations(),
      });
      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 1)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'foundation-0',
      });
      // Confirm move happened
      expect(useGameStore.getState().foundations[0]).toHaveLength(1);

      useGameStore.getState().undo();
      const state = useGameStore.getState();
      expect(state.foundations[0]).toEqual([]);
      expect(state.tableau[0]).toHaveLength(1);
      expect(state.isWon).toBe(false);
    });

    it('is a no-op when undoStack is empty', () => {
      setup({
        tableau: emptyTableau(),
        undoStack: [],
        moves: 0,
      });
      useGameStore.getState().undo();
      expect(useGameStore.getState().moves).toBe(0);
    });

    it('caps undoStack at 50 snapshots', () => {
      // Push 60 moves to verify the cap
      setup({
        stock: Array.from({ length: 60 }, (_, i) => makeCard('hearts', ((i % 13) + 1) as Rank, false)),
        waste: [],
        drawMode: 1,
        undoStack: [],
      });
      for (let i = 0; i < 60; i++) {
        useGameStore.getState().drawFromStock();
      }
      expect(useGameStore.getState().undoStack.length).toBe(50);
    });
  });

  describe('autoComplete', () => {
    it('moves one foundation-eligible top card per call', () => {
      setup({
        tableau: [
          [makeCard('hearts', 1)],
          [makeCard('clubs', 1)],
          [], [], [], [], [],
        ],
        foundations: emptyFoundations(),
      });
      useGameStore.getState().autoComplete();
      const state = useGameStore.getState();
      // Exactly one Ace moved
      const moved = state.foundations.flat().length;
      expect(moved).toBe(1);
    });

    it('does nothing when no top cards are eligible', () => {
      setup({
        tableau: [
          [makeCard('hearts', 5)],
          [makeCard('clubs', 9)],
          [], [], [], [], [],
        ],
        foundations: emptyFoundations(),
      });
      useGameStore.getState().autoComplete();
      expect(useGameStore.getState().foundations.flat()).toEqual([]);
    });
  });
});

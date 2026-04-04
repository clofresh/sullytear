import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../store';
import { useCombatStore, _resetTracking, _withSuppressedEvents } from '../combatStore';
import type { Card, Rank, Suit } from '../types';

function makeCard(suit: Suit, rank: Rank, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp };
}

/**
 * Set game state without triggering combat events, then reset tracking.
 */
function setupGameState(partial: Parameters<typeof useGameStore.setState>[0]) {
  _withSuppressedEvents(() => {
    useGameStore.setState(partial);
  });
}

function resetAll() {
  _withSuppressedEvents(() => {
    useGameStore.getState().newGame();
  });
  useCombatStore.getState().resetCombat();
  _resetTracking();
}

describe('Combat Store', () => {
  beforeEach(() => {
    resetAll();
  });

  describe('Foundation placement deals damage', () => {
    it('deals damage equal to card rank when placing on foundation', () => {
      const initialMonsterHp = useCombatStore.getState().monsterMaxHp;

      setupGameState({
        tableau: [
          [makeCard('hearts', 1)],
          [], [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 1)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'foundation-0',
      });

      // Ace = rank 1 damage
      expect(useCombatStore.getState().monsterHp).toBe(initialMonsterHp - 1);
    });
  });

  describe('Stock cycle deals monster attack damage', () => {
    it('deals monsterAttackDamage to hero when stock cycles', () => {
      const initialHeroHp = useCombatStore.getState().heroMaxHp;
      const attackDmg = useCombatStore.getState().monsterAttackDamage;

      setupGameState({
        stock: [makeCard('hearts', 5, false)],
        waste: [],
        stockCycleCount: 0,
      });

      // Draw the one card (stock → waste)
      useGameStore.getState().drawFromStock();
      // Now stock is empty — draw again to trigger cycle
      useGameStore.getState().drawFromStock();

      // Hero takes monster attack damage from the cycle
      // No unused draw chip damage because the cycle resets waste (doesn't grow it)
      expect(useCombatStore.getState().heroHp).toBe(initialHeroHp - attackDmg);
    });
  });

  describe('Unused stock draw chip damage (#13)', () => {
    it('deals 1 damage when waste card is not used before next draw', () => {
      const initialHeroHp = useCombatStore.getState().heroMaxHp;

      setupGameState({
        stock: [makeCard('clubs', 3, false), makeCard('clubs', 4, false)],
        waste: [],
        stockCycleCount: 0,
      });

      // Draw first card
      useGameStore.getState().drawFromStock();
      // Don't use it — draw again
      useGameStore.getState().drawFromStock();

      // Hero should take 1 chip damage from unused draw
      expect(useCombatStore.getState().heroHp).toBe(initialHeroHp - 1);
    });

    it('does NOT deal chip damage when waste card was used', () => {
      const initialHeroHp = useCombatStore.getState().heroMaxHp;

      setupGameState({
        stock: [makeCard('clubs', 3, false), makeCard('clubs', 4, false)],
        waste: [makeCard('hearts', 1)],
        foundations: [[], [], [], []],
        tableau: [[], [], [], [], [], [], []],
        stockCycleCount: 0,
      });

      // Move the waste card (Ace) to foundation
      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 1)],
        from: 'waste',
        fromIndex: 0,
        to: 'foundation-0',
      });

      // Now draw — previous waste card was consumed, so no chip damage
      useGameStore.getState().drawFromStock();

      // Hero should NOT have taken chip damage
      // Ace heal +3 but capped at max, so still at max
      expect(useCombatStore.getState().heroHp).toBe(initialHeroHp);
    });
  });

  describe('Face card special effects (#20)', () => {
    it('Jack placement sets poisonTurns to 3', () => {
      const foundationPile: Card[] = [];
      for (let r = 1; r <= 10; r++) {
        foundationPile.push(makeCard('hearts', r as Rank));
      }

      setupGameState({
        tableau: [
          [makeCard('hearts', 11)],
          [], [], [], [], [], [],
        ],
        foundations: [foundationPile, [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 11)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'foundation-0',
      });

      expect(useCombatStore.getState().poisonTurns).toBe(3);
    });

    it('poison ticks deal 2 damage on each stock draw', () => {
      useCombatStore.getState().setPoisonTurns(3);
      const monsterHpBefore = useCombatStore.getState().monsterHp;

      setupGameState({
        stock: [
          makeCard('clubs', 2, false),
          makeCard('clubs', 3, false),
          makeCard('clubs', 4, false),
        ],
        waste: [],
        stockCycleCount: 0,
      });

      // Draw 3 times — each should tick poison
      useGameStore.getState().drawFromStock();
      useGameStore.getState().drawFromStock();
      useGameStore.getState().drawFromStock();

      // 3 poison ticks × 2 damage = 6 total poison damage
      expect(useCombatStore.getState().poisonTurns).toBe(0);
      expect(useCombatStore.getState().monsterHp).toBe(monsterHpBefore - 6);
    });

    it('Queen placement heals hero 5 HP', () => {
      useCombatStore.getState().dealDamageToHero(20);
      const heroHpBefore = useCombatStore.getState().heroHp; // 30

      const foundationPile: Card[] = [];
      for (let r = 1; r <= 11; r++) {
        foundationPile.push(makeCard('hearts', r as Rank));
      }

      setupGameState({
        tableau: [
          [makeCard('hearts', 12)],
          [], [], [], [], [], [],
        ],
        foundations: [foundationPile, [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 12)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'foundation-0',
      });

      // Queen heals hero 5 + column clear heals 5 = +10
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 5 + 5);
    });

    it('King placement sets empowered, next placement deals double', () => {
      const foundationPile: Card[] = [];
      for (let r = 1; r <= 12; r++) {
        foundationPile.push(makeCard('hearts', r as Rank));
      }

      setupGameState({
        tableau: [
          [makeCard('hearts', 13)],
          [makeCard('diamonds', 1)],
          [], [], [], [], [],
        ],
        foundations: [foundationPile, [], [], []],
      });

      const monsterHpBefore = useCombatStore.getState().monsterHp;

      // Place King
      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 13)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'foundation-0',
      });

      expect(useCombatStore.getState().empowered).toBe(true);
      const hpAfterKing = useCombatStore.getState().monsterHp;
      expect(hpAfterKing).toBe(monsterHpBefore - 13);

      // Place Ace on foundation-1 — should deal double (2 instead of 1)
      useGameStore.getState().moveCards({
        cards: [makeCard('diamonds', 1)],
        from: 'tableau-1',
        fromIndex: 0,
        to: 'foundation-1',
      });

      expect(useCombatStore.getState().empowered).toBe(false);
      // Ace damage doubled: 1 * 2 = 2
      expect(useCombatStore.getState().monsterHp).toBe(hpAfterKing - 2);
    });
  });

  describe('Ace heal (#18)', () => {
    it('heals hero 3 HP when Ace placed on foundation', () => {
      useCombatStore.getState().dealDamageToHero(10);
      const heroHpBefore = useCombatStore.getState().heroHp; // 40

      setupGameState({
        tableau: [
          [makeCard('hearts', 1)],
          [], [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 1)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'foundation-0',
      });

      // Ace heals 3 + column clear heals 5 = +8
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 3 + 5);
    });
  });

  describe('Tableau column clear heals hero (#17)', () => {
    it('heals hero 5 HP when a tableau column is cleared', () => {
      useCombatStore.getState().dealDamageToHero(15);
      const heroHpBefore = useCombatStore.getState().heroHp; // 35

      // Place a card in a non-empty column so clearing it can be detected
      // Column 0 has one card, column 1 has a valid target
      setupGameState({
        tableau: [
          [makeCard('spades', 5)], // move to column 1 (which has a 6 of hearts)
          [makeCard('hearts', 6)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 5)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });

      // Column clear heals 5
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 5);
    });
  });

  describe('Undo', () => {
    it('reverses foundation damage on undo', () => {
      const monsterHpBefore = useCombatStore.getState().monsterMaxHp;

      setupGameState({
        tableau: [
          [makeCard('hearts', 1)],
          [], [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 1)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'foundation-0',
      });

      expect(useCombatStore.getState().monsterHp).toBe(monsterHpBefore - 1);

      useGameStore.getState().undo();

      expect(useCombatStore.getState().monsterHp).toBe(monsterHpBefore);
    });

    it('reverses Ace heal on undo', () => {
      useCombatStore.getState().dealDamageToHero(10);
      const heroHpBefore = useCombatStore.getState().heroHp; // 40

      setupGameState({
        tableau: [
          [makeCard('hearts', 1)],
          [], [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 1)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'foundation-0',
      });

      // Ace healed 3 + column clear healed 5 = +8
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 8);

      useGameStore.getState().undo();

      // Undo reverses: Ace heal (-3), column clear heal (-5), net back to original
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore);
    });
  });

  describe('Victory and Defeat', () => {
    it('sets victory when monster HP reaches 0', () => {
      useCombatStore.getState().dealDamageToMonster(
        useCombatStore.getState().monsterMaxHp
      );
      expect(useCombatStore.getState().combatResult).toBe('victory');
    });

    it('sets defeat when hero HP reaches 0', () => {
      useCombatStore.getState().dealDamageToHero(
        useCombatStore.getState().heroMaxHp
      );
      expect(useCombatStore.getState().combatResult).toBe('defeat');
    });
  });

  describe('resetCombat', () => {
    it('clears all state including poison and empowered', () => {
      useCombatStore.getState().setPoisonTurns(3);
      useCombatStore.getState().setEmpowered(true);
      useCombatStore.getState().dealDamageToHero(20);
      useCombatStore.getState().dealDamageToMonster(30);

      useCombatStore.getState().resetCombat();

      const state = useCombatStore.getState();
      expect(state.poisonTurns).toBe(0);
      expect(state.empowered).toBe(false);
      expect(state.heroHp).toBe(state.heroMaxHp);
      expect(state.monsterHp).toBe(state.monsterMaxHp);
      expect(state.combatResult).toBe('none');
    });
  });
});

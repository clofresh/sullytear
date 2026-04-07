import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../store';
import { useCombatStore } from '../combatStore';
import { _resetTracking, _withSuppressedEvents, hasPlayTriggered } from '../orchestrator';
import type { Card, Rank, Suit } from '../types';

function makeCard(suit: Suit, rank: Rank, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp };
}

/**
 * Set game state without triggering combat events, then reset tracking.
 */
function setupGameState(partial: Partial<Parameters<typeof useGameStore.setState>[0]>) {
  _withSuppressedEvents(() => {
    useGameStore.setState(partial as Parameters<typeof useGameStore.setState>[0]);
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

      // Draw the one card (stock → waste) — 5 damage (rank)
      useGameStore.getState().drawFromStock();
      // Now stock is empty — draw again to trigger cycle — monster attack damage
      useGameStore.getState().drawFromStock();

      // Hero takes 5 (rank) + monsterAttackDamage (cycle)
      expect(useCombatStore.getState().heroHp).toBe(initialHeroHp - 5 - attackDmg);
    });
  });

  describe('Stock draw damages hero', () => {
    it('deals card rank damage per stock draw', () => {
      const initialHeroHp = useCombatStore.getState().heroMaxHp;

      setupGameState({
        stock: [makeCard('clubs', 3, false), makeCard('clubs', 4, false)],
        waste: [],
        stockCycleCount: 0,
      });

      // Draw twice — first draws the top card (4), then (3) → 4 + 3 = 7 damage
      useGameStore.getState().drawFromStock();
      useGameStore.getState().drawFromStock();

      expect(useCombatStore.getState().heroHp).toBe(initialHeroHp - 7);
    });
  });

  describe('Waste card to tableau damages monster', () => {
    it('deals damage equal to card rank when waste card moved to tableau', () => {
      const initialMonsterHp = useCombatStore.getState().monsterMaxHp;

      // Waste has a 5♠, tableau-0 has a 6♥ (valid target: black 5 on red 6)
      setupGameState({
        stock: [],
        waste: [makeCard('spades', 5)],
        tableau: [
          [makeCard('hearts', 6)],
          [], [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
        stockCycleCount: 0,
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 5)],
        from: 'waste',
        fromIndex: 0,
        to: 'tableau-0',
      });

      // 5♠ rank = 5 damage
      expect(useCombatStore.getState().monsterHp).toBe(initialMonsterHp - 5);
    });

    it('does NOT double-count when waste card goes to foundation', () => {
      const initialMonsterHp = useCombatStore.getState().monsterMaxHp;

      setupGameState({
        stock: [],
        waste: [makeCard('hearts', 1)],
        tableau: [[], [], [], [], [], [], []],
        foundations: [[], [], [], []],
        stockCycleCount: 0,
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('hearts', 1)],
        from: 'waste',
        fromIndex: 0,
        to: 'foundation-0',
      });

      // Only foundation damage (rank 1), no extra waste damage
      expect(useCombatStore.getState().monsterHp).toBe(initialMonsterHp - 1);
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

    it('King placement sets empowerMultiplier to 2.0, next placement deals double', () => {
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

      expect(useCombatStore.getState().empowerMultiplier).toBe(2.0);
      const hpAfterKing = useCombatStore.getState().monsterHp;
      expect(hpAfterKing).toBe(monsterHpBefore - 13);

      // Place Ace on foundation-1 — should deal double (1 * 2 = 2)
      useGameStore.getState().moveCards({
        cards: [makeCard('diamonds', 1)],
        from: 'tableau-1',
        fromIndex: 0,
        to: 'foundation-1',
      });

      expect(useCombatStore.getState().empowerMultiplier).toBe(1.0);
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

  describe('Reveal face-down card deals chip damage (#8)', () => {
    it('deals 2 damage when a face-down card is revealed', () => {
      const monsterHpBefore = useCombatStore.getState().monsterMaxHp;

      // Column 0: face-down 7♥, face-up 5♠. Column 1: face-up 6♥.
      // Moving 5♠ to column 1 reveals the 7♥.
      setupGameState({
        tableau: [
          [makeCard('hearts', 7, false), makeCard('spades', 5)],
          [makeCard('hearts', 6)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 5)],
        from: 'tableau-0',
        fromIndex: 1,
        to: 'tableau-1',
      });

      // Monster took 2 chip damage from reveal
      expect(useCombatStore.getState().monsterHp).toBe(monsterHpBefore - 2);
    });

    it('undo reverses reveal damage', () => {
      const monsterHpBefore = useCombatStore.getState().monsterMaxHp;

      setupGameState({
        tableau: [
          [makeCard('hearts', 7, false), makeCard('spades', 5)],
          [makeCard('hearts', 6)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 5)],
        from: 'tableau-0',
        fromIndex: 1,
        to: 'tableau-1',
      });

      expect(useCombatStore.getState().monsterHp).toBe(monsterHpBefore - 2);

      useGameStore.getState().undo();

      expect(useCombatStore.getState().monsterHp).toBe(monsterHpBefore);
    });
  });

  describe('Combo attack — 3+ card runs (#11)', () => {
    it('deals 2 × cards moved when moving 3+ cards', () => {
      const monsterHpBefore = useCombatStore.getState().monsterMaxHp;

      // Column 0: 8♥, 7♠, 6♥ (descending, alternating color). Column 1: 9♠.
      // Moving all 3 cards to column 1 triggers a combo.
      setupGameState({
        tableau: [
          [makeCard('hearts', 8), makeCard('spades', 7), makeCard('hearts', 6)],
          [makeCard('spades', 9)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [
          makeCard('hearts', 8),
          makeCard('spades', 7),
          makeCard('hearts', 6),
        ],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });

      // Combo damage: 2 × 3 = 6, plus column clear heal (hero side, not monster)
      expect(useCombatStore.getState().monsterHp).toBe(monsterHpBefore - 6);
    });

    it('does NOT trigger combo when moving 2 cards', () => {
      const monsterHpBefore = useCombatStore.getState().monsterMaxHp;

      setupGameState({
        tableau: [
          [makeCard('spades', 7), makeCard('hearts', 6)],
          [makeCard('hearts', 8)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 7), makeCard('hearts', 6)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });

      // No combo damage (only 2 cards)
      expect(useCombatStore.getState().monsterHp).toBe(monsterHpBefore);
    });

    it('undo reverses combo damage', () => {
      const monsterHpBefore = useCombatStore.getState().monsterMaxHp;

      setupGameState({
        tableau: [
          [makeCard('hearts', 8), makeCard('spades', 7), makeCard('hearts', 6)],
          [makeCard('spades', 9)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [
          makeCard('hearts', 8),
          makeCard('spades', 7),
          makeCard('hearts', 6),
        ],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });

      expect(useCombatStore.getState().monsterHp).toBe(monsterHpBefore - 6);

      useGameStore.getState().undo();

      expect(useCombatStore.getState().monsterHp).toBe(monsterHpBefore);
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
    it('clears all state including poison and empowerMultiplier', () => {
      useCombatStore.getState().setPoisonTurns(3);
      useCombatStore.getState().setEmpowerMultiplier(2.0);
      useCombatStore.getState().dealDamageToHero(20);
      useCombatStore.getState().dealDamageToMonster(30);

      useCombatStore.getState().resetCombat();

      const state = useCombatStore.getState();
      expect(state.poisonTurns).toBe(0);
      expect(state.empowerMultiplier).toBe(1.0);
      expect(state.heroHp).toBe(state.heroMaxHp);
      expect(state.monsterHp).toBe(state.monsterMaxHp);
      expect(state.combatResult).toBe('none');
    });
  });

  describe('Face card reveal effects (tier 1)', () => {
    it('revealing a face-down Jack sets poisonTurns to 1', () => {
      setupGameState({
        tableau: [
          [makeCard('hearts', 11, false), makeCard('spades', 5)],
          [makeCard('hearts', 6)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      // Move 5♠ to column 1 (black 5 on red 6), revealing the Jack
      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 5)],
        from: 'tableau-0',
        fromIndex: 1,
        to: 'tableau-1',
      });

      expect(useCombatStore.getState().poisonTurns).toBe(1);
    });

    it('revealing a face-down Queen heals hero 2 HP', () => {
      useCombatStore.getState().dealDamageToHero(10);
      const heroHpBefore = useCombatStore.getState().heroHp;

      setupGameState({
        tableau: [
          [makeCard('hearts', 12, false), makeCard('spades', 5)],
          [makeCard('hearts', 6)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 5)],
        from: 'tableau-0',
        fromIndex: 1,
        to: 'tableau-1',
      });

      // Queen reveal heals 2
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 2);
    });

    it('revealing a face-down King sets empowerMultiplier to 1.25', () => {
      setupGameState({
        tableau: [
          [makeCard('hearts', 13, false), makeCard('spades', 5)],
          [makeCard('hearts', 6)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 5)],
        from: 'tableau-0',
        fromIndex: 1,
        to: 'tableau-1',
      });

      expect(useCombatStore.getState().empowerMultiplier).toBe(1.25);
    });

    it('revealing a face-down Ace heals hero 1 HP', () => {
      useCombatStore.getState().dealDamageToHero(10);
      const heroHpBefore = useCombatStore.getState().heroHp;

      setupGameState({
        tableau: [
          [makeCard('hearts', 1, false), makeCard('spades', 5)],
          [makeCard('hearts', 6)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 5)],
        from: 'tableau-0',
        fromIndex: 1,
        to: 'tableau-1',
      });

      // Ace reveal heals 1
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 1);
    });

    it('revealing a non-face card does NOT trigger face card effects', () => {
      const heroHpBefore = useCombatStore.getState().heroHp;

      setupGameState({
        tableau: [
          [makeCard('hearts', 7, false), makeCard('spades', 5)],
          [makeCard('hearts', 6)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 5)],
        from: 'tableau-0',
        fromIndex: 1,
        to: 'tableau-1',
      });

      // No heal, no poison
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore);
      expect(useCombatStore.getState().poisonTurns).toBe(0);
    });

    it('undo reverses reveal face card effects (Queen heal)', () => {
      useCombatStore.getState().dealDamageToHero(10);
      const heroHpBefore = useCombatStore.getState().heroHp;

      setupGameState({
        tableau: [
          [makeCard('hearts', 12, false), makeCard('spades', 5)],
          [makeCard('hearts', 6)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 5)],
        from: 'tableau-0',
        fromIndex: 1,
        to: 'tableau-1',
      });

      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 2);

      useGameStore.getState().undo();

      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore);
    });
  });

  describe('Face card play effects (tier 2)', () => {
    it('moving a Jack tableau-to-tableau sets poisonTurns to 2', () => {
      // Jack♠ on column 0, valid target 12♥ on column 1 (black Jack on red Queen)
      setupGameState({
        tableau: [
          [makeCard('spades', 11)],
          [makeCard('hearts', 12)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 11)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });

      expect(useCombatStore.getState().poisonTurns).toBe(2);
    });

    it('moving a Queen tableau-to-tableau heals hero 3 HP', () => {
      useCombatStore.getState().dealDamageToHero(10);
      const heroHpBefore = useCombatStore.getState().heroHp;

      // Queen♠ on column 0, King♥ on column 1 (black Queen on red King)
      setupGameState({
        tableau: [
          [makeCard('spades', 12)],
          [makeCard('hearts', 13)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 12)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });

      // Queen play heals 3 + column clear heals 5
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 3 + 5);
    });

    it('moving a King tableau-to-tableau sets empowerMultiplier to 1.5', () => {
      // King♠ on column 0, empty column 1 (Kings can go on empty)
      setupGameState({
        tableau: [
          [makeCard('spades', 13)],
          [],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 13)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });

      expect(useCombatStore.getState().empowerMultiplier).toBe(1.5);
    });

    it('moving an Ace waste-to-tableau heals hero 2 HP', () => {
      useCombatStore.getState().dealDamageToHero(10);
      const heroHpBefore = useCombatStore.getState().heroHp;

      // Ace♠ in waste, 2♥ on column 0 (black Ace on red 2)
      setupGameState({
        stock: [],
        waste: [makeCard('spades', 1)],
        tableau: [
          [makeCard('hearts', 2)],
          [], [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
        stockCycleCount: 0,
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 1)],
        from: 'waste',
        fromIndex: 0,
        to: 'tableau-0',
      });

      // Ace play heals 2 (+ waste-to-tableau deals rank 1 damage to monster)
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 2);
    });

    it('play effect only fires once per card', () => {
      // Jack♠ on column 0, Queen♥ on column 1, King♠ on column 2
      setupGameState({
        tableau: [
          [makeCard('spades', 11)],
          [makeCard('hearts', 12)],
          [makeCard('spades', 13)],
          [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      // Move Jack to column 1
      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 11)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });

      expect(useCombatStore.getState().poisonTurns).toBe(2);

      // Clear poison to test if second move re-triggers
      useCombatStore.getState().setPoisonTurns(0);

      // Move Jack (with Queen) to column 2 — Jack is NOT the bottom card of the group
      // Actually, let's set up a scenario where Jack IS bottom card moving again
      // After first move: column 1 has [Q♥, J♠], column 2 has [K♠]
      // Move just the Jack from column 1 to column 2
      // Wait — Jack under Queen can't be moved alone in Klondike. Let me rethink.
      // Instead: move the whole stack [Q♥, J♠] is not valid on K♠ because Q♥ on K♠ needs alternating color and Q♥ is red, K♠ is black — valid!
      // But in that case, Q♥ is the bottom card, not J♠.
      // Let me use a different setup where Jack can move twice as bottom card.

      // Reset and use a simpler approach
      resetAll();
      setupGameState({
        tableau: [
          [makeCard('spades', 11)],
          [makeCard('hearts', 12)],
          [makeCard('diamonds', 12)],
          [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      // Move Jack to column 1 (under Queen♥ — black on red)
      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 11)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });
      expect(useCombatStore.getState().poisonTurns).toBe(2);
      useCombatStore.getState().setPoisonTurns(0);

      // Move Jack to column 2 (under Queen♦ — black on red)
      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 11)],
        from: 'tableau-1',
        fromIndex: 1,
        to: 'tableau-2',
      });

      // Should NOT re-trigger — play effect already fired for this card
      expect(useCombatStore.getState().poisonTurns).toBe(0);
    });

    it('hasPlayTriggered returns true after play, false before', () => {
      expect(hasPlayTriggered('spades-11')).toBe(false);

      setupGameState({
        tableau: [
          [makeCard('spades', 11)],
          [makeCard('hearts', 12)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 11)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });

      expect(hasPlayTriggered('spades-11')).toBe(true);
    });

    it('hasPlayTriggered returns false after undo', () => {
      setupGameState({
        tableau: [
          [makeCard('spades', 11)],
          [makeCard('hearts', 12)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 11)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });

      expect(hasPlayTriggered('spades-11')).toBe(true);

      useGameStore.getState().undo();

      expect(hasPlayTriggered('spades-11')).toBe(false);
    });

    it('non-face cards do not trigger play effects', () => {
      useCombatStore.getState().dealDamageToHero(20);
      const heroHpBefore = useCombatStore.getState().heroHp; // 30

      setupGameState({
        tableau: [
          [makeCard('spades', 5)],
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

      // Column clear heals 5, but no face card play effect
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 5);
      expect(useCombatStore.getState().poisonTurns).toBe(0);
    });

    it('undo reverses play trigger and allows re-triggering', () => {
      useCombatStore.getState().dealDamageToHero(10);
      const heroHpBefore = useCombatStore.getState().heroHp;

      setupGameState({
        tableau: [
          [makeCard('spades', 12)],
          [makeCard('hearts', 13)],
          [], [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      // Move Queen to column 1
      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 12)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });

      // Queen play heals 3 + column clear heals 5
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 3 + 5);

      useGameStore.getState().undo();

      // Should revert both heals
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore);

      // Move Queen again — should re-trigger since undo removed it from tracking
      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 12)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });

      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 3 + 5);
    });
  });

  describe('Escalating face card effects across tiers', () => {
    it('King: empower escalates 1.25 → 1.5 → 2.0 across reveal, play, foundation', () => {
      // Column 0: face-down King under a face-up 5♠. Column 1: 6♥. Column 2: empty.
      setupGameState({
        tableau: [
          [makeCard('spades', 13, false), makeCard('spades', 5)],
          [makeCard('hearts', 6)],
          [],
          [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      // Step 1: Reveal King (move 5♠ to column 1)
      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 5)],
        from: 'tableau-0',
        fromIndex: 1,
        to: 'tableau-1',
      });
      expect(useCombatStore.getState().empowerMultiplier).toBe(1.25);

      // Step 2: Move King to empty column 2 (play trigger)
      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 13)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-2',
      });
      expect(useCombatStore.getState().empowerMultiplier).toBe(1.5);

      // Step 3: Build foundation to accept King, then place it
      const foundationPile: Card[] = [];
      for (let r = 1; r <= 12; r++) {
        foundationPile.push(makeCard('spades', r as Rank));
      }
      setupGameState({
        tableau: [
          [],
          [makeCard('hearts', 6), makeCard('spades', 5)],
          [makeCard('spades', 13)],
          [], [], [], [],
        ],
        foundations: [foundationPile, [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 13)],
        from: 'tableau-2',
        fromIndex: 0,
        to: 'foundation-0',
      });
      expect(useCombatStore.getState().empowerMultiplier).toBe(2.0);
    });

    it('Jack: poison escalates 1 → 2 → 3 across reveal, play, foundation', () => {
      // Column 0: face-down Jack♠ under face-up 5♠. Column 1: 6♥ (valid target for black 5).
      setupGameState({
        tableau: [
          [makeCard('spades', 11, false), makeCard('spades', 5)],
          [makeCard('hearts', 6)],
          [makeCard('diamonds', 12)],
          [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      // Step 1: Reveal Jack (move 5♠ to 6♥ — black 5 on red 6)
      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 5)],
        from: 'tableau-0',
        fromIndex: 1,
        to: 'tableau-1',
      });
      expect(useCombatStore.getState().poisonTurns).toBe(1);

      // Step 2: Move Jack♠ (black) to Q♦ (red) on column 2
      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 11)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-2',
      });
      expect(useCombatStore.getState().poisonTurns).toBe(2);

      // Step 3: Build foundation and place Jack
      const foundationPile: Card[] = [];
      for (let r = 1; r <= 10; r++) {
        foundationPile.push(makeCard('spades', r as Rank));
      }
      setupGameState({
        tableau: [
          [],
          [makeCard('hearts', 6), makeCard('spades', 5)],
          [makeCard('diamonds', 12), makeCard('spades', 11)],
          [], [], [], [],
        ],
        foundations: [foundationPile, [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 11)],
        from: 'tableau-2',
        fromIndex: 1,
        to: 'foundation-0',
      });
      expect(useCombatStore.getState().poisonTurns).toBe(3);
    });

    it('Queen: total healing across all tiers is 2+3+5=10', () => {
      useCombatStore.getState().dealDamageToHero(30);
      const heroHpBefore = useCombatStore.getState().heroHp; // 20

      // Column 0: face-down Queen under face-up 5♠. Column 1: 6♥.
      setupGameState({
        tableau: [
          [makeCard('spades', 12, false), makeCard('spades', 5)],
          [makeCard('hearts', 6)],
          [makeCard('hearts', 13)],
          [], [], [], [],
        ],
        foundations: [[], [], [], []],
      });

      // Step 1: Reveal Queen (move 5♠ to 6♥)
      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 5)],
        from: 'tableau-0',
        fromIndex: 1,
        to: 'tableau-1',
      });
      // Queen reveal heals 2
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 2);

      // Step 2: Move Queen to column 2 (Q♠ black on K♥ red)
      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 12)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-2',
      });
      // Queen play heals 3 + column clear heals 5
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 2 + 3 + 5);

      // Step 3: Place Queen on foundation
      const foundationPile: Card[] = [];
      for (let r = 1; r <= 11; r++) {
        foundationPile.push(makeCard('spades', r as Rank));
      }
      setupGameState({
        tableau: [
          [],
          [makeCard('hearts', 6), makeCard('spades', 5)],
          [makeCard('hearts', 13), makeCard('spades', 12)],
          [], [], [], [],
        ],
        foundations: [foundationPile, [], [], []],
      });

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 12)],
        from: 'tableau-2',
        fromIndex: 1,
        to: 'foundation-0',
      });
      // Queen foundation heals 5
      // Total: 2 + 3 + 5 (column clear) + 5 = 15 heal (but we're checking against heroHpBefore)
      expect(useCombatStore.getState().heroHp).toBe(heroHpBefore + 2 + 3 + 5 + 5);
    });
  });

  describe('EncounterConfig extensions', () => {
    it('startCombat with heroStartHp sets heroHp to that value', () => {
      useCombatStore.getState().startCombat({
        monsterName: 'Slime',
        monsterMaxHp: 40,
        monsterAttackDamage: 4,
        heroMaxHp: 50,
        heroStartHp: 30,
      });
      const s = useCombatStore.getState();
      expect(s.heroHp).toBe(30);
      expect(s.heroMaxHp).toBe(50);
    });

    it('startCombat without heroStartHp defaults to heroMaxHp', () => {
      useCombatStore.getState().startCombat({
        monsterName: 'Slime',
        monsterMaxHp: 40,
        monsterAttackDamage: 4,
        heroMaxHp: 50,
      });
      expect(useCombatStore.getState().heroHp).toBe(50);
    });

    it('startCombat with monsterId sets monsterId in state', () => {
      useCombatStore.getState().startCombat({
        monsterName: 'Slime',
        monsterId: 'slime',
        monsterMaxHp: 40,
        monsterAttackDamage: 4,
        heroMaxHp: 50,
      });
      expect(useCombatStore.getState().monsterId).toBe('slime');
    });

    it('startCombat without monsterId defaults to dragon', () => {
      useCombatStore.getState().startCombat({
        monsterName: 'Dragon',
        monsterMaxHp: 120,
        monsterAttackDamage: 12,
        heroMaxHp: 50,
      });
      expect(useCombatStore.getState().monsterId).toBe('dragon');
    });
  });
});

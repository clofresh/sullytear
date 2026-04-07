import { describe, it, expect, beforeEach } from 'vitest';
import { getDropPreview } from '../dropPreview';
import { useCombatStore } from '../combatStore';
import { _withSuppressedEvents, _resetTracking } from '../orchestrator';
import { useGameStore } from '../store';
import type { Card, Rank, Suit } from '../types';

function makeCard(suit: Suit, rank: Rank, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp };
}

function resetAll() {
  _withSuppressedEvents(() => {
    useGameStore.getState().newGame();
    // Empty the tableau so source-pile lookups in getDropPreview can never
    // collide with synthetic test cards (e.g. `spades-5`) that happen to
    // share an id with a freshly-dealt card. See issue: flaky dropPreview
    // "Tableau targets" tests.
    useGameStore.setState({
      tableau: [[], [], [], [], [], [], []],
    });
  });
  useCombatStore.getState().resetCombat();
  _resetTracking();
}

describe('getDropPreview', () => {
  beforeEach(() => {
    resetAll();
  });

  describe('Foundation targets', () => {
    it('non-face card shows damage only', () => {
      expect(getDropPreview([makeCard('spades', 5)], 'foundation-0')).toBe('5 dmg');
    });

    it('Ace shows damage + effect description', () => {
      expect(getDropPreview([makeCard('hearts', 1)], 'foundation-0')).toBe('1 dmg · Ace Awakens! Heal 3');
    });

    it('Jack shows damage + effect description', () => {
      expect(getDropPreview([makeCard('hearts', 11)], 'foundation-0')).toBe('11 dmg · Jack Awakens! Poison 3');
    });

    it('Queen shows damage + effect description', () => {
      expect(getDropPreview([makeCard('hearts', 12)], 'foundation-0')).toBe('12 dmg · Queen Awakens! Heal 5');
    });

    it('King shows damage + effect description', () => {
      expect(getDropPreview([makeCard('hearts', 13)], 'foundation-0')).toBe('13 dmg · King Awakens! Empower 2x');
    });

    it('empowered non-face card shows multiplied damage', () => {
      useCombatStore.getState().setEmpowerMultiplier(2.0);
      expect(getDropPreview([makeCard('hearts', 5)], 'foundation-0')).toBe('10 dmg (2x)');
    });

    it('empowered face card shows multiplied damage + effect', () => {
      useCombatStore.getState().setEmpowerMultiplier(1.5);
      expect(getDropPreview([makeCard('hearts', 11)], 'foundation-0')).toBe('17 dmg (1.5x) · Jack Awakens! Poison 3');
    });
  });

  describe('Tableau targets', () => {
    it('non-face card from waste shows damage', () => {
      expect(getDropPreview([makeCard('spades', 5)], 'tableau-0', 'waste')).toBe('5 dmg');
    });

    it('Ace first play shows Rises + effect', () => {
      expect(getDropPreview([makeCard('hearts', 1)], 'tableau-0', 'tableau-1')).toBe('Ace Rises! Heal 2');
    });

    it('Jack first play shows Rises + effect', () => {
      expect(getDropPreview([makeCard('spades', 11)], 'tableau-0', 'tableau-1')).toBe('Jack Rises! Poison 2');
    });

    it('Queen first play shows Rises + effect', () => {
      expect(getDropPreview([makeCard('spades', 12)], 'tableau-0', 'tableau-1')).toBe('Queen Rises! Heal 3');
    });

    it('King first play shows Rises + effect', () => {
      expect(getDropPreview([makeCard('spades', 13)], 'tableau-0', 'tableau-1')).toBe('King Rises! Empower 1.5x');
    });

    it('face card already triggered returns null', () => {
      // Move Queen to trigger play effect, then check preview
      _withSuppressedEvents(() => {
        useGameStore.setState({
          tableau: [
            [makeCard('spades', 12)],
            [makeCard('hearts', 13)],
            [], [], [], [], [],
          ],
          foundations: [[], [], [], []],
        });
      });
      _resetTracking();

      useGameStore.getState().moveCards({
        cards: [makeCard('spades', 12)],
        from: 'tableau-0',
        fromIndex: 0,
        to: 'tableau-1',
      });

      // Now preview for same card should return null (already triggered)
      expect(getDropPreview([makeCard('spades', 12)], 'tableau-2', 'tableau-1')).toBeNull();
    });

    it('non-face card from tableau returns null', () => {
      expect(getDropPreview([makeCard('spades', 5)], 'tableau-0', 'tableau-1')).toBeNull();
    });
  });

  describe('Tableau stack side-effects', () => {
    it('non-face stack that reveals face-down card shows reveal dmg', () => {
      _withSuppressedEvents(() => {
        useGameStore.setState({
          tableau: [
            [makeCard('clubs', 5, false), makeCard('hearts', 10), makeCard('spades', 9)],
            [makeCard('hearts', 11)],
            [], [], [], [], [],
          ],
          foundations: [[], [], [], []],
        });
      });
      _resetTracking();
      expect(
        getDropPreview(
          [makeCard('hearts', 10), makeCard('spades', 9)],
          'tableau-1',
          'tableau-0',
        ),
      ).toBe('+2 dmg Reveal');
    });

    it('non-face stack that clears a column shows clear heal', () => {
      _withSuppressedEvents(() => {
        useGameStore.setState({
          tableau: [
            [makeCard('hearts', 10), makeCard('spades', 9)],
            [makeCard('hearts', 11)],
            [], [], [], [], [],
          ],
          foundations: [[], [], [], []],
        });
      });
      _resetTracking();
      expect(
        getDropPreview(
          [makeCard('hearts', 10), makeCard('spades', 9)],
          'tableau-1',
          'tableau-0',
        ),
      ).toBe('+5 HP Clear');
    });

    it('face card stack with reveal shows Rises + reveal', () => {
      _withSuppressedEvents(() => {
        useGameStore.setState({
          tableau: [
            [makeCard('clubs', 5, false), makeCard('spades', 12), makeCard('hearts', 11)],
            [makeCard('hearts', 13)],
            [], [], [], [], [],
          ],
          foundations: [[], [], [], []],
        });
      });
      _resetTracking();
      expect(
        getDropPreview(
          [makeCard('spades', 12), makeCard('hearts', 11)],
          'tableau-1',
          'tableau-0',
        ),
      ).toBe('Queen Rises! Heal 3 · +2 dmg Reveal');
    });

    it('face card stack with column clear shows Rises + clear', () => {
      _withSuppressedEvents(() => {
        useGameStore.setState({
          tableau: [
            [makeCard('spades', 12), makeCard('hearts', 11)],
            [makeCard('hearts', 13)],
            [], [], [], [], [],
          ],
          foundations: [[], [], [], []],
        });
      });
      _resetTracking();
      expect(
        getDropPreview(
          [makeCard('spades', 12), makeCard('hearts', 11)],
          'tableau-1',
          'tableau-0',
        ),
      ).toBe('Queen Rises! Heal 3 · +5 HP Clear');
    });

    it('non-face stack with no side effects returns null', () => {
      _withSuppressedEvents(() => {
        useGameStore.setState({
          tableau: [
            [makeCard('hearts', 10), makeCard('spades', 9), makeCard('diamonds', 8)],
            [makeCard('hearts', 11)],
            [], [], [], [], [],
          ],
          foundations: [[], [], [], []],
        });
      });
      _resetTracking();
      expect(
        getDropPreview(
          [makeCard('spades', 9), makeCard('diamonds', 8)],
          'tableau-1',
          'tableau-0',
        ),
      ).toBeNull();
    });
  });

  describe('Waste to tableau face card', () => {
    it('Queen from waste shows waste dmg + Rises', () => {
      expect(getDropPreview([makeCard('spades', 12)], 'tableau-0', 'waste')).toBe('12 dmg · Queen Rises! Heal 3');
    });

    it('Jack from waste shows waste dmg + Rises', () => {
      expect(getDropPreview([makeCard('spades', 11)], 'tableau-0', 'waste')).toBe('11 dmg · Jack Rises! Poison 2');
    });
  });

  describe('Waste target (stock draw)', () => {
    it('shows rank-based draw cost', () => {
      expect(getDropPreview([makeCard('spades', 5, false)], 'waste', 'stock')).toBe('5 dmg to you');
    });

    it('shows draw cost + poison when poisoned', () => {
      useCombatStore.getState().setPoisonTurns(2);
      expect(getDropPreview([makeCard('spades', 7, false)], 'waste', 'stock')).toBe('7 + 2 poison dmg to you');
    });

    it('shows cycle cost when stock is empty', () => {
      const monsterAtk = useCombatStore.getState().monsterAttackDamage;
      _withSuppressedEvents(() => {
        useGameStore.setState({ stock: [] });
      });
      expect(getDropPreview([makeCard('spades', 5, false)], 'waste', 'stock')).toBe(`${monsterAtk} dmg to you`);
    });
  });
});

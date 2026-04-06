import { describe, it, expect, beforeEach } from 'vitest';
import { getDropPreview } from '../dropPreview';
import { useCombatStore, _withSuppressedEvents, _resetTracking } from '../combatStore';
import { useGameStore } from '../store';
import type { Card, Rank, Suit } from '../types';

function makeCard(suit: Suit, rank: Rank, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp };
}

function resetAll() {
  _withSuppressedEvents(() => {
    useGameStore.getState().newGame();
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
});

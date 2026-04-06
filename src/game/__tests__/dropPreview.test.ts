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
    it('non-face card shows damage', () => {
      expect(getDropPreview([makeCard('spades', 5)], 'foundation-0')).toBe('-5');
    });

    it('Ace shows damage + Awakens label', () => {
      expect(getDropPreview([makeCard('hearts', 1)], 'foundation-0')).toBe('-1 Ace Awakens!');
    });

    it('Jack shows damage + Awakens label', () => {
      expect(getDropPreview([makeCard('hearts', 11)], 'foundation-0')).toBe('-11 Jack Awakens!');
    });

    it('Queen shows damage + Awakens label', () => {
      expect(getDropPreview([makeCard('hearts', 12)], 'foundation-0')).toBe('-12 Queen Awakens!');
    });

    it('King shows damage + Awakens label', () => {
      expect(getDropPreview([makeCard('hearts', 13)], 'foundation-0')).toBe('-13 King Awakens!');
    });

    it('empowered card shows multiplied damage', () => {
      useCombatStore.getState().setEmpowerMultiplier(2.0);
      expect(getDropPreview([makeCard('hearts', 5)], 'foundation-0')).toBe('-10 (2x!)');
    });
  });

  describe('Tableau targets', () => {
    it('non-face card from waste shows damage', () => {
      expect(getDropPreview([makeCard('spades', 5)], 'tableau-0', 'waste')).toBe('-5');
    });

    it('face card first play shows Rises label', () => {
      expect(getDropPreview([makeCard('spades', 12)], 'tableau-0', 'tableau-1')).toBe('Queen Rises!');
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

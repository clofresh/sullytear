import type { Card } from '../types';
import { isFaceCard } from '../faceCard';

/**
 * Snapshot of game state used by the EventDetector to compare frames.
 * Stored once per `run()` call and threaded through every detector.
 */
export interface GameSnapshot {
  foundationLengths: number[];
  stockCycleCount: number;
  wasteLength: number;
  wasteTopId: string | null;
  tableauLengths: number[];
  tableauEmpty: boolean[];
  faceDownCounts: number[];
  faceDownIds: Set<string>;
  faceCardPiles: Map<string, string>;
  moves: number;
}

/**
 * Subset of CombatActions used by detectors. Keeping this narrow makes
 * each detector trivial to unit-test against an object literal of vi.fn()s.
 */
export interface CombatActionsSlice {
  dealDamageToMonster: (damage: number, label?: string) => void;
  dealDamageToHero: (damage: number) => void;
  addThreat: (amount: number) => void;
  healMonster: (amount: number) => void;
  healHero: (amount: number, label?: string) => void;
  applyPoison: () => void;
  setPoisonTurns: (turns: number) => void;
  setEmpowerMultiplier: (multiplier: number) => void;
  emitFaceCardEvent: (label: string) => void;
  grantArmor: (amount: number, label?: string) => void;
  grantDefense: (percent: number, label?: string) => void;
}

/**
 * Read-only view of combat state that detectors need (e.g. current
 * empowerMultiplier when computing foundation damage).
 */
export interface CombatStateView {
  empowerMultiplier: number;
  poisonTurns: number;
  combatResult: 'none' | 'victory' | 'defeat';
  monsterAttackDamage: number;
  heroHp: number;
}

export interface DetectorContext {
  combat: CombatActionsSlice;
  combatState: () => CombatStateView;
  /**
   * Escape hatch for the few detectors that mutate hero HP directly to
   * undo a heal. Mirrors the existing combatStore.setState calls so the
   * extraction is behaviour-preserving.
   */
  setHeroHp: (hp: number) => void;
  /** Tracks face cards that have already triggered tier-2 effects. */
  playTriggeredCards: Set<string>;
  /**
   * Cumulative reveal counter for the current encounter. Each time it
   * crosses a multiple of 3, the reveal detector grants a +2 armor bonus
   * ("Diligent Play"). Decrements symmetrically on un-reveal for undo.
   */
  revealStreak: { value: number };
}

export interface GameStateLike {
  foundations: Card[][];
  waste: Card[];
  tableau: Card[][];
  stockCycleCount: number;
  moves: number;
}

export function snapshotGame(state: GameStateLike): GameSnapshot {
  return {
    foundationLengths: state.foundations.map(f => f.length),
    stockCycleCount: state.stockCycleCount,
    wasteLength: state.waste.length,
    wasteTopId: state.waste.length > 0 ? state.waste[state.waste.length - 1].id : null,
    tableauLengths: state.tableau.map(t => t.length),
    tableauEmpty: state.tableau.map(t => t.length === 0),
    faceDownCounts: state.tableau.map(t => t.filter(c => !c.faceUp).length),
    faceDownIds: new Set(state.tableau.flat().filter(c => !c.faceUp).map(c => c.id)),
    faceCardPiles: buildFaceCardPiles(state),
    moves: state.moves,
  };
}

export function buildFaceCardPiles(state: { tableau: Card[][]; waste: Card[] }): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < state.tableau.length; i++) {
    for (const card of state.tableau[i]) {
      if (card.faceUp && isFaceCard(card.rank)) {
        map.set(card.id, `tableau-${i}`);
      }
    }
  }
  for (const card of state.waste) {
    if (isFaceCard(card.rank)) {
      map.set(card.id, 'waste');
    }
  }
  return map;
}

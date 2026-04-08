import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../store';
import { useCombatStore } from '../combatStore';
import { useMetaStore } from '../metaStore';
import {
  startEncounter,
  endRunEffects,
  _withSuppressedEvents,
} from '../orchestrator';
import type { EncounterConfig } from '../combatStore';

const config: EncounterConfig = {
  monsterName: 'TestMon',
  monsterId: 'goblin',
  monsterMaxHp: 30,
  monsterAttackDamage: 5,
  monsterThreatMax: 25,
  heroMaxHp: 40,
};

beforeEach(() => {
  // Restore default meta state
  useMetaStore.setState({
    gold: 0,
    totalGold: 0,
    totalMonstersSlain: 0,
    totalRunsCompleted: 0,
    totalRunsStarted: 0,
  });
});

describe('startEncounter', () => {
  it('resets the deck via gameStore.newGame and starts combat with the given config', () => {
    const gameIdBefore = useGameStore.getState().gameId;
    startEncounter(config);
    const game = useGameStore.getState();
    const combat = useCombatStore.getState();

    expect(game.gameId).not.toBe(gameIdBefore);
    expect(combat.monsterName).toBe('TestMon');
    expect(combat.monsterMaxHp).toBe(30);
    expect(combat.heroMaxHp).toBe(40);
    expect(combat.isActive).toBe(true);
  });

  it('does not fire combat events while seeding the deck', () => {
    startEncounter(config);
    const eventIdAfterStart = useCombatStore.getState().eventId;
    // newGame should have run under suppression — eventId should be 0.
    expect(eventIdAfterStart).toBe(0);
  });
});

describe('endRunEffects', () => {
  it('credits gold and records a completed run on victory', () => {
    endRunEffects(42, 'victory');
    const meta = useMetaStore.getState();
    expect(meta.gold).toBeGreaterThanOrEqual(42);
    expect(meta.totalRunsCompleted).toBe(1);
  });

  it('credits gold but does not record a completed run on defeat', () => {
    endRunEffects(7, 'defeat');
    const meta = useMetaStore.getState();
    expect(meta.gold).toBeGreaterThanOrEqual(7);
    expect(meta.totalRunsCompleted).toBe(0);
  });
});

describe('_withSuppressedEvents', () => {
  it('runs the body without firing combat events', () => {
    startEncounter(config);
    const before = useCombatStore.getState().eventId;
    _withSuppressedEvents(() => {
      useGameStore.getState().newGame();
    });
    expect(useCombatStore.getState().eventId).toBe(before);
  });
});

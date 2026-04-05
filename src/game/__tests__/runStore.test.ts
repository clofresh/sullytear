import { describe, it, expect, beforeEach } from 'vitest';
import { useRunStore } from '../runStore';
import { useCombatStore } from '../combatStore';
import { useMetaStore } from '../metaStore';

function resetAll() {
  useRunStore.setState({
    isRunActive: false,
    difficulty: 'normal',
    encounters: [],
    currentEncounterIndex: 0,
    heroMaxHp: 50,
    goldEarned: 0,
    runResult: 'none',
  });
  useCombatStore.getState().resetCombat();
  useMetaStore.setState({
    gold: 0,
    totalGold: 0,
    totalMonstersSlain: 0,
    totalRunsCompleted: 0,
    totalRunsStarted: 0,
  });
}

describe('Run Store', () => {
  beforeEach(() => resetAll());

  describe('startRun', () => {
    it('sets isRunActive to true', () => {
      useRunStore.getState().startRun('normal');
      expect(useRunStore.getState().isRunActive).toBe(true);
    });

    it('creates 5 encounters', () => {
      useRunStore.getState().startRun('normal');
      expect(useRunStore.getState().encounters).toHaveLength(5);
    });

    it('encounters are ordered by ascending tier', () => {
      useRunStore.getState().startRun('normal');
      const encounters = useRunStore.getState().encounters;
      for (let i = 1; i < encounters.length; i++) {
        expect(encounters[i].tier).toBeGreaterThanOrEqual(encounters[i - 1].tier);
      }
    });

    it('sets currentEncounterIndex to 0', () => {
      useRunStore.getState().startRun('normal');
      expect(useRunStore.getState().currentEncounterIndex).toBe(0);
    });

    it('starts combat with first monster', () => {
      useRunStore.getState().startRun('normal');
      const combat = useCombatStore.getState();
      const firstMonster = useRunStore.getState().encounters[0];
      expect(combat.isActive).toBe(true);
      expect(combat.monsterName).toBe(firstMonster.name);
    });

    it('records run started in meta store', () => {
      useRunStore.getState().startRun('normal');
      expect(useMetaStore.getState().totalRunsStarted).toBe(1);
    });

    it('stores difficulty', () => {
      useRunStore.getState().startRun('hard');
      expect(useRunStore.getState().difficulty).toBe('hard');
    });
  });

  describe('advanceEncounter', () => {
    beforeEach(() => {
      useRunStore.getState().startRun('normal');
      // Simulate hero taking some damage
      useCombatStore.getState().dealDamageToHero(10);
    });

    it('increments currentEncounterIndex', () => {
      useRunStore.getState().advanceEncounter();
      expect(useRunStore.getState().currentEncounterIndex).toBe(1);
    });

    it('carries over hero HP with +10 heal (capped at max)', () => {
      const hpBefore = useCombatStore.getState().heroHp; // 40 (50 - 10)
      useRunStore.getState().advanceEncounter();
      const combat = useCombatStore.getState();
      expect(combat.heroHp).toBe(Math.min(hpBefore + 10, 50));
    });

    it('awards gold for defeated monster', () => {
      useRunStore.getState().advanceEncounter();
      expect(useRunStore.getState().goldEarned).toBeGreaterThan(0);
    });

    it('starts combat with next monster', () => {
      const encounters = useRunStore.getState().encounters;
      useRunStore.getState().advanceEncounter();
      const combat = useCombatStore.getState();
      expect(combat.monsterName).toBe(encounters[1].name);
      expect(combat.isActive).toBe(true);
    });

    it('records monster slain in meta store', () => {
      useRunStore.getState().advanceEncounter();
      expect(useMetaStore.getState().totalMonstersSlain).toBe(1);
    });

    it('ends run with victory after final encounter', () => {
      // Advance through all 5 encounters
      for (let i = 0; i < 4; i++) {
        useRunStore.getState().advanceEncounter();
      }
      // Last advance should trigger victory
      useRunStore.getState().advanceEncounter();
      expect(useRunStore.getState().runResult).toBe('victory');
      expect(useRunStore.getState().isRunActive).toBe(false);
    });
  });

  describe('endRun', () => {
    beforeEach(() => {
      useRunStore.getState().startRun('normal');
    });

    it('transfers gold to meta store on victory', () => {
      // Simulate earning some gold
      useRunStore.getState().advanceEncounter();
      const earned = useRunStore.getState().goldEarned;
      expect(earned).toBeGreaterThan(0);

      // End all remaining encounters
      for (let i = 1; i < 4; i++) {
        useRunStore.getState().advanceEncounter();
      }
      useRunStore.getState().advanceEncounter(); // final

      expect(useMetaStore.getState().gold).toBe(useMetaStore.getState().totalGold);
      expect(useMetaStore.getState().gold).toBeGreaterThan(0);
    });

    it('sets isRunActive to false on defeat', () => {
      useRunStore.getState().endRun('defeat');
      expect(useRunStore.getState().isRunActive).toBe(false);
      expect(useRunStore.getState().runResult).toBe('defeat');
    });

    it('transfers partial gold on defeat', () => {
      useRunStore.getState().advanceEncounter(); // beat first monster
      const earned = useRunStore.getState().goldEarned;
      useRunStore.getState().endRun('defeat');
      expect(useMetaStore.getState().gold).toBe(earned);
    });

    it('records run completed on victory', () => {
      // Go through all encounters
      for (let i = 0; i < 5; i++) {
        useRunStore.getState().advanceEncounter();
      }
      expect(useMetaStore.getState().totalRunsCompleted).toBe(1);
    });
  });

  describe('difficulty scaling', () => {
    it('hard difficulty increases monster HP', () => {
      useRunStore.getState().startRun('hard');
      const combat = useCombatStore.getState();
      const firstMonster = useRunStore.getState().encounters[0];
      // Hard multiplier is 1.4x
      expect(combat.monsterMaxHp).toBe(Math.round(firstMonster.maxHp * 1.4));
    });

    it('nightmare difficulty increases monster attack', () => {
      useRunStore.getState().startRun('nightmare');
      const combat = useCombatStore.getState();
      const firstMonster = useRunStore.getState().encounters[0];
      // Nightmare atk multiplier is 1.6x
      expect(combat.monsterAttackDamage).toBe(Math.round(firstMonster.attackDamage * 1.6));
    });
  });
});

import { create } from 'zustand';
import { type Difficulty, DIFFICULTY_CONFIG } from './difficulty';
import { type MonsterDef, MONSTER_ROSTER, buildEncounterConfig } from '../combat/monsters';
import { useCombatStore, _withSuppressedEvents } from './combatStore';
import { useGameStore } from './store';
import { useMetaStore } from './metaStore';

interface RunState {
  isRunActive: boolean;
  difficulty: Difficulty;
  encounters: MonsterDef[];
  currentEncounterIndex: number;
  heroMaxHp: number;
  goldEarned: number;
  runResult: 'none' | 'victory' | 'defeat';
}

interface RunActions {
  startRun: (difficulty: Difficulty) => void;
  advanceEncounter: () => void;
  endRun: (result: 'victory' | 'defeat') => void;
}

function pickEncounters(): MonsterDef[] {
  // Pick first 5 monsters from roster (tiers 1-5)
  return MONSTER_ROSTER.slice(0, 5);
}

function calculateGold(monster: MonsterDef, difficulty: Difficulty, heroHp: number, heroMaxHp: number): number {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const base = monster.goldReward * cfg.goldMultiplier;
  const hpBonus = heroHp > heroMaxHp * 0.75 ? 1.25 : 1.0;
  return Math.round(base * hpBonus);
}

export const useRunStore = create<RunState & RunActions>()((set, get) => ({
  isRunActive: false,
  difficulty: 'normal',
  encounters: [],
  currentEncounterIndex: 0,
  heroMaxHp: 50,
  goldEarned: 0,
  runResult: 'none',

  startRun: (difficulty: Difficulty) => {
    const encounters = pickEncounters();
    const heroMaxHp = 50;
    const config = buildEncounterConfig(encounters[0], difficulty, heroMaxHp);

    set({
      isRunActive: true,
      difficulty,
      encounters,
      currentEncounterIndex: 0,
      heroMaxHp,
      goldEarned: 0,
      runResult: 'none',
    });

    _withSuppressedEvents(() => {
      useGameStore.getState().newGame();
    });
    useCombatStore.getState().startCombat(config);

    useMetaStore.getState().recordRunStarted();
  },

  advanceEncounter: () => {
    const state = get();
    const { difficulty, encounters, currentEncounterIndex, heroMaxHp } = state;

    // Calculate gold for defeated monster
    const heroHp = useCombatStore.getState().heroHp;
    const gold = calculateGold(encounters[currentEncounterIndex], difficulty, heroHp, heroMaxHp);
    const newGoldEarned = state.goldEarned + gold;

    useMetaStore.getState().recordMonsterSlain();

    const nextIndex = currentEncounterIndex + 1;

    if (nextIndex >= encounters.length) {
      // Final encounter beaten — run complete
      set({
        currentEncounterIndex: nextIndex,
        goldEarned: newGoldEarned,
      });
      get().endRun('victory');
      return;
    }

    // Carry over hero HP with +10 heal (capped)
    const carriedHp = Math.min(heroHp + 10, heroMaxHp);
    const config = buildEncounterConfig(encounters[nextIndex], difficulty, heroMaxHp, carriedHp);

    set({
      currentEncounterIndex: nextIndex,
      goldEarned: newGoldEarned,
    });

    _withSuppressedEvents(() => {
      useGameStore.getState().newGame();
    });
    useCombatStore.getState().startCombat(config);
  },

  endRun: (result: 'victory' | 'defeat') => {
    const state = get();
    useMetaStore.getState().addGold(state.goldEarned);
    if (result === 'victory') {
      useMetaStore.getState().recordRunCompleted();
    }
    set({
      isRunActive: false,
      runResult: result,
    });
  },
}));

import { create } from 'zustand';
import { type Difficulty, DIFFICULTY_CONFIG } from './difficulty';
import { type MonsterDef, MONSTER_ROSTER, buildEncounterConfig } from '../combat/monsters';
import {
  startEncounter,
  endRunEffects,
  recordRunStarted,
  recordMonsterSlain,
  getHeroHp,
} from './orchestrator';
import type { Sticker } from './stickers/types';
import type { EncounterConfig } from './combatStore';

/**
 * Apply next-scope monster stickers to a freshly-built EncounterConfig.
 * Mutates `config` in place, returns the ids of stickers that were consumed
 * so the caller can remove them from the run. v1: Frostbitten reduces
 * monsterThreatMax by 4.
 */
function applyNextMonsterStickers(
  config: EncounterConfig,
  stickers: Sticker[],
): string[] {
  const consumed: string[] = [];
  for (const s of stickers) {
    if (s.target.kind !== 'monster' || s.target.scope !== 'next') continue;
    if (s.defId === 'frostbitten') {
      config.monsterThreatMax = Math.max(0, config.monsterThreatMax - 4);
      consumed.push(s.id);
    }
  }
  return consumed;
}

interface RunState {
  isRunActive: boolean;
  difficulty: Difficulty;
  encounters: MonsterDef[];
  currentEncounterIndex: number;
  heroMaxHp: number;
  goldEarned: number;
  lastGoldAwarded: number;
  runResult: 'none' | 'victory' | 'defeat';
  stickers: Sticker[];
}

interface RunActions {
  startRun: (difficulty: Difficulty) => void;
  advanceEncounter: () => void;
  endRun: (result: 'victory' | 'defeat') => void;
  addSticker: (sticker: Sticker) => void;
  removeSticker: (stickerId: string) => void;
  decrementStickerUses: (stickerId: string) => void;
}

function pickEncounters(): MonsterDef[] {
  // Pick first 5 monsters from roster (tiers 1-5)
  return MONSTER_ROSTER.slice(0, 5);
}

export function calculateGold(monster: MonsterDef, difficulty: Difficulty, heroHp: number, heroMaxHp: number): number {
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
  lastGoldAwarded: 0,
  runResult: 'none',
  stickers: [],

  startRun: (difficulty: Difficulty) => {
    const encounters = pickEncounters();
    const heroMaxHp = 50;
    const config = buildEncounterConfig(encounters[0], difficulty, heroMaxHp);

    // Symmetric with advanceEncounter: apply any next-scope monster
    // stickers to the first encounter. In practice this is a no-op
    // because startRun also resets stickers to [], but the call path
    // is kept identical for consistency with advanceEncounter.
    applyNextMonsterStickers(config, get().stickers);

    set({
      isRunActive: true,
      difficulty,
      encounters,
      currentEncounterIndex: 0,
      heroMaxHp,
      goldEarned: 0,
      lastGoldAwarded: 0,
      runResult: 'none',
      stickers: [],
    });

    startEncounter(config);
    recordRunStarted();
  },

  advanceEncounter: () => {
    const state = get();
    const { difficulty, encounters, currentEncounterIndex, heroMaxHp } = state;

    // Calculate gold for defeated monster
    const heroHp = getHeroHp();
    const gold = calculateGold(encounters[currentEncounterIndex], difficulty, heroHp, heroMaxHp);
    const newGoldEarned = state.goldEarned + gold;

    recordMonsterSlain();

    const nextIndex = currentEncounterIndex + 1;

    if (nextIndex >= encounters.length) {
      // Final encounter beaten — run complete
      set({
        currentEncounterIndex: nextIndex,
        goldEarned: newGoldEarned,
        lastGoldAwarded: gold,
      });
      get().endRun('victory');
      return;
    }

    // Carry over hero HP with +10 heal (capped)
    const carriedHp = Math.min(heroHp + 10, heroMaxHp);
    const config = buildEncounterConfig(encounters[nextIndex], difficulty, heroMaxHp, carriedHp);

    // Apply next-scope monster stickers (e.g. Frostbitten) and remove
    // them — they are single-use and target the "next" encounter.
    const consumed = applyNextMonsterStickers(config, state.stickers);
    const remaining = consumed.length > 0
      ? state.stickers.filter((s) => !consumed.includes(s.id))
      : state.stickers;

    set({
      currentEncounterIndex: nextIndex,
      goldEarned: newGoldEarned,
      lastGoldAwarded: gold,
      stickers: remaining,
    });

    startEncounter(config);
  },

  endRun: (result: 'victory' | 'defeat') => {
    const state = get();
    endRunEffects(state.goldEarned, result);
    set({
      isRunActive: false,
      runResult: result,
    });
  },

  addSticker: (sticker: Sticker) => {
    set({ stickers: [...get().stickers, sticker] });
  },

  removeSticker: (stickerId: string) => {
    set({ stickers: get().stickers.filter((s) => s.id !== stickerId) });
  },

  decrementStickerUses: (stickerId: string) => {
    set({
      stickers: get().stickers.flatMap((s) => {
        if (s.id !== stickerId) return [s];
        const next = (s.usesLeft ?? 0) - 1;
        if (next <= 0) return [];
        return [{ ...s, usesLeft: next }];
      }),
    });
  },
}));

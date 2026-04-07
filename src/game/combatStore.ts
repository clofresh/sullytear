import { create } from 'zustand';
import type { CombatSnapshot } from './types';

export const MAX_HERO_DEFENSE = 50;

export interface EncounterConfig {
  monsterName: string;
  monsterId?: string;
  monsterMaxHp: number;
  monsterAttackDamage: number;
  heroMaxHp: number;
  heroStartHp?: number;
  heroStartArmor?: number;
  heroStartDefense?: number;
}

const DEFAULT_ENCOUNTER: EncounterConfig = {
  monsterName: 'Dragon',
  monsterMaxHp: 120,
  monsterAttackDamage: 12,
  heroMaxHp: 50,
};

export interface CombatEvent {
  type: 'hero-attack' | 'monster-attack' | 'hero-heal' | 'poison' | 'empower' | 'face-card';
  damage: number;
  label?: string;
}

interface CombatState {
  heroHp: number;
  heroMaxHp: number;
  heroArmor: number;
  heroDefense: number;
  monsterHp: number;
  monsterMaxHp: number;
  monsterName: string;
  monsterId: string;
  monsterAttackDamage: number;
  isActive: boolean;
  combatResult: 'none' | 'victory' | 'defeat';
  lastEvent: CombatEvent | null;
  eventId: number;
  poisonTurns: number;
  empowered: boolean;
  empowerMultiplier: number;
}

interface CombatActions {
  startCombat: (config?: EncounterConfig) => void;
  dealDamageToMonster: (damage: number, label?: string) => void;
  dealDamageToHero: (damage: number) => void;
  healMonster: (amount: number) => void;
  healHero: (amount: number, label?: string) => void;
  applyPoison: () => void;
  setPoisonTurns: (turns: number) => void;
  setEmpowered: (empowered: boolean) => void;
  setEmpowerMultiplier: (multiplier: number) => void;
  emitFaceCardEvent: (label: string) => void;
  grantArmor: (amount: number, label?: string) => void;
  grantDefense: (percent: number, label?: string) => void;
  resetCombat: () => void;
  snapshotCombat: () => CombatSnapshot;
  restoreCombatSnapshot: (snap: CombatSnapshot) => void;
}

export const useCombatStore = create<CombatState & CombatActions>()((set, get) => ({
  heroHp: DEFAULT_ENCOUNTER.heroMaxHp,
  heroMaxHp: DEFAULT_ENCOUNTER.heroMaxHp,
  heroArmor: 0,
  heroDefense: 0,
  monsterHp: DEFAULT_ENCOUNTER.monsterMaxHp,
  monsterMaxHp: DEFAULT_ENCOUNTER.monsterMaxHp,
  monsterName: DEFAULT_ENCOUNTER.monsterName,
  monsterId: 'dragon',
  monsterAttackDamage: DEFAULT_ENCOUNTER.monsterAttackDamage,
  isActive: true,
  combatResult: 'none',
  lastEvent: null,
  eventId: 0,
  poisonTurns: 0,
  empowered: false,
  empowerMultiplier: 1.0,

  startCombat: (config = DEFAULT_ENCOUNTER) => {
    set({
      heroHp: config.heroStartHp ?? config.heroMaxHp,
      heroMaxHp: config.heroMaxHp,
      heroArmor: config.heroStartArmor ?? 0,
      heroDefense: config.heroStartDefense ?? 0,
      monsterHp: config.monsterMaxHp,
      monsterMaxHp: config.monsterMaxHp,
      monsterName: config.monsterName,
      monsterId: config.monsterId ?? 'dragon',
      monsterAttackDamage: config.monsterAttackDamage,
      isActive: true,
      combatResult: 'none',
      lastEvent: null,
      eventId: 0,
      poisonTurns: 0,
      empowered: false,
      empowerMultiplier: 1.0,
    });
  },

  dealDamageToMonster: (damage: number, label?: string) => {
    const state = get();
    if (state.combatResult !== 'none') return;
    const newHp = Math.max(0, state.monsterHp - damage);
    set({
      monsterHp: newHp,
      lastEvent: { type: label === 'Poison!' ? 'poison' : 'hero-attack', damage, label },
      eventId: state.eventId + 1,
      combatResult: newHp <= 0 ? 'victory' : 'none',
    });
  },

  dealDamageToHero: (damage: number) => {
    const state = get();
    if (state.combatResult !== 'none') return;
    const reduced = Math.max(0, Math.round(damage * (1 - state.heroDefense / 100)));
    const absorbed = Math.min(state.heroArmor, reduced);
    const hpDamage = reduced - absorbed;
    const newArmor = state.heroArmor - absorbed;
    const newHp = Math.max(0, state.heroHp - hpDamage);
    set({
      heroHp: newHp,
      heroArmor: newArmor,
      lastEvent: { type: 'monster-attack', damage: reduced },
      eventId: state.eventId + 1,
      combatResult: newHp <= 0 ? 'defeat' : 'none',
    });
  },

  healMonster: (amount: number) => {
    const state = get();
    set({
      monsterHp: Math.min(state.monsterMaxHp, state.monsterHp + amount),
      combatResult: 'none',
    });
  },

  healHero: (amount: number, label?: string) => {
    const state = get();
    if (state.combatResult !== 'none') return;
    const newHp = Math.min(state.heroMaxHp, state.heroHp + amount);
    set({
      heroHp: newHp,
      lastEvent: { type: 'hero-heal', damage: amount, label },
      eventId: state.eventId + 1,
    });
  },

  applyPoison: () => {
    const state = get();
    if (state.poisonTurns <= 0 || state.combatResult !== 'none') return;
    set({ poisonTurns: state.poisonTurns - 1 });
    state.dealDamageToMonster(2, 'Poison!');
  },

  setPoisonTurns: (turns: number) => {
    set({ poisonTurns: turns });
  },

  setEmpowered: (empowered: boolean) => {
    set({ empowered });
  },

  setEmpowerMultiplier: (multiplier: number) => {
    set({ empowerMultiplier: multiplier, empowered: multiplier > 1.0 });
  },

  emitFaceCardEvent: (label: string) => {
    const state = get();
    set({
      lastEvent: { type: 'face-card', damage: 0, label },
      eventId: state.eventId + 1,
    });
  },

  grantArmor: (amount: number, label?: string) => {
    const state = get();
    if (state.combatResult !== 'none') return;
    set({
      heroArmor: state.heroArmor + amount,
      lastEvent: { type: 'face-card', damage: amount, label },
      eventId: state.eventId + 1,
    });
  },

  grantDefense: (percent: number, label?: string) => {
    const state = get();
    if (state.combatResult !== 'none') return;
    set({
      heroDefense: Math.min(MAX_HERO_DEFENSE, state.heroDefense + percent),
      lastEvent: { type: 'face-card', damage: percent, label },
      eventId: state.eventId + 1,
    });
  },

  resetCombat: () => {
    get().startCombat();
  },

  snapshotCombat: (): CombatSnapshot => {
    const s = get();
    return {
      heroHp: s.heroHp,
      heroMaxHp: s.heroMaxHp,
      heroArmor: s.heroArmor,
      heroDefense: s.heroDefense,
      monsterHp: s.monsterHp,
      monsterMaxHp: s.monsterMaxHp,
      empowerMultiplier: s.empowerMultiplier,
      empowered: s.empowered,
      poisonTurns: s.poisonTurns,
      combatResult: s.combatResult,
    };
  },

  restoreCombatSnapshot: (snap: CombatSnapshot) => {
    set({
      heroHp: snap.heroHp,
      heroMaxHp: snap.heroMaxHp,
      heroArmor: snap.heroArmor,
      heroDefense: snap.heroDefense,
      monsterHp: snap.monsterHp,
      monsterMaxHp: snap.monsterMaxHp,
      empowerMultiplier: snap.empowerMultiplier,
      empowered: snap.empowered,
      poisonTurns: snap.poisonTurns,
      combatResult: snap.combatResult,
    });
  },
}));

// Cross-store wiring (event detection + run orchestration) lives in
// `./orchestrator`. combatStore now exposes only its own state and actions
// — see issue #34.

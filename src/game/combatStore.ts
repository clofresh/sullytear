import { create } from 'zustand';
import { useGameStore } from './store';
import { EventDetector } from './combat/EventDetector';

export interface EncounterConfig {
  monsterName: string;
  monsterId?: string;
  monsterMaxHp: number;
  monsterAttackDamage: number;
  heroMaxHp: number;
  heroStartHp?: number;
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
  resetCombat: () => void;
}

export const useCombatStore = create<CombatState & CombatActions>()((set, get) => ({
  heroHp: DEFAULT_ENCOUNTER.heroMaxHp,
  heroMaxHp: DEFAULT_ENCOUNTER.heroMaxHp,
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
    const newHp = Math.max(0, state.heroHp - damage);
    set({
      heroHp: newHp,
      lastEvent: { type: 'monster-attack', damage },
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

  resetCombat: () => {
    get().startCombat();
  },
}));

// --- Event detection ---
// All per-frame change detection lives in EventDetector. The store keeps
// only the actions that mutate combat state.
const detector = new EventDetector(useGameStore.getState(), {
  combat: {
    dealDamageToMonster: (d, l) => useCombatStore.getState().dealDamageToMonster(d, l),
    dealDamageToHero: (d) => useCombatStore.getState().dealDamageToHero(d),
    healMonster: (a) => useCombatStore.getState().healMonster(a),
    healHero: (a, l) => useCombatStore.getState().healHero(a, l),
    applyPoison: () => useCombatStore.getState().applyPoison(),
    setPoisonTurns: (t) => useCombatStore.getState().setPoisonTurns(t),
    setEmpowerMultiplier: (m) => useCombatStore.getState().setEmpowerMultiplier(m),
    emitFaceCardEvent: (l) => useCombatStore.getState().emitFaceCardEvent(l),
  },
  combatState: () => {
    const s = useCombatStore.getState();
    return {
      empowerMultiplier: s.empowerMultiplier,
      poisonTurns: s.poisonTurns,
      combatResult: s.combatResult,
      monsterAttackDamage: s.monsterAttackDamage,
      heroHp: s.heroHp,
    };
  },
  setHeroHp: (hp) => useCombatStore.setState({ heroHp: hp }),
  isCombatPaused: () => {
    const c = useCombatStore.getState();
    return !c.isActive || c.combatResult !== 'none';
  },
});

useGameStore.subscribe((state) => detector.run(state));

// --- Public helpers ---
//
// `hasPlayTriggered` is a real public API: dropPreview.ts reads it to
// suppress duplicate "Rises!" hints when a face card has already fired
// its tier-2 effect. The other two are test-only utilities for setting
// up gameStore state without firing combat events.

export function hasPlayTriggered(cardId: string): boolean {
  return detector.hasPlayTriggered(cardId);
}

/** @internal — used by tests to reset tracking state between cases. */
export function _resetTracking(): void {
  detector.withSuppressedEvents(() => {}, () => useGameStore.getState());
}

/** @internal — used by tests to apply gameStore state without events. */
export function _withSuppressedEvents(fn: () => void): void {
  detector.withSuppressedEvents(fn, () => useGameStore.getState());
}

import { create } from 'zustand';
import { useGameStore } from './store';

export interface EncounterConfig {
  monsterName: string;
  monsterMaxHp: number;
  monsterAttackDamage: number;
  heroMaxHp: number;
}

const DEFAULT_ENCOUNTER: EncounterConfig = {
  monsterName: 'Dragon',
  monsterMaxHp: 100,
  monsterAttackDamage: 10,
  heroMaxHp: 50,
};

interface CombatEvent {
  type: 'hero-attack' | 'monster-attack';
  damage: number;
}

interface CombatState {
  heroHp: number;
  heroMaxHp: number;
  monsterHp: number;
  monsterMaxHp: number;
  monsterName: string;
  monsterAttackDamage: number;
  isActive: boolean;
  combatResult: 'none' | 'victory' | 'defeat';
  lastEvent: CombatEvent | null;
  eventId: number;
}

interface CombatActions {
  startCombat: (config?: EncounterConfig) => void;
  dealDamageToMonster: (damage: number) => void;
  dealDamageToHero: (damage: number) => void;
  healMonster: (amount: number) => void;
  healHero: (amount: number) => void;
  resetCombat: () => void;
}

export const useCombatStore = create<CombatState & CombatActions>()((set, get) => ({
  heroHp: DEFAULT_ENCOUNTER.heroMaxHp,
  heroMaxHp: DEFAULT_ENCOUNTER.heroMaxHp,
  monsterHp: DEFAULT_ENCOUNTER.monsterMaxHp,
  monsterMaxHp: DEFAULT_ENCOUNTER.monsterMaxHp,
  monsterName: DEFAULT_ENCOUNTER.monsterName,
  monsterAttackDamage: DEFAULT_ENCOUNTER.monsterAttackDamage,
  isActive: true,
  combatResult: 'none',
  lastEvent: null,
  eventId: 0,

  startCombat: (config = DEFAULT_ENCOUNTER) => {
    set({
      heroHp: config.heroMaxHp,
      heroMaxHp: config.heroMaxHp,
      monsterHp: config.monsterMaxHp,
      monsterMaxHp: config.monsterMaxHp,
      monsterName: config.monsterName,
      monsterAttackDamage: config.monsterAttackDamage,
      isActive: true,
      combatResult: 'none',
      lastEvent: null,
      eventId: 0,
    });
  },

  dealDamageToMonster: (damage: number) => {
    const state = get();
    if (state.combatResult !== 'none') return;
    const newHp = Math.max(0, state.monsterHp - damage);
    set({
      monsterHp: newHp,
      lastEvent: { type: 'hero-attack', damage },
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

  healHero: (amount: number) => {
    const state = get();
    set({
      heroHp: Math.min(state.heroMaxHp, state.heroHp + amount),
      combatResult: 'none',
    });
  },

  resetCombat: () => {
    get().startCombat();
  },
}));

// Subscribe to game store changes to detect combat events
let prevFoundationLengths = useGameStore.getState().foundations.map(f => f.length);
let prevStockCycleCount = useGameStore.getState().stockCycleCount;

useGameStore.subscribe((state) => {
  const combat = useCombatStore.getState();
  if (!combat.isActive || combat.combatResult !== 'none') return;

  // Detect foundation changes
  const currentLengths = state.foundations.map(f => f.length);
  for (let i = 0; i < 4; i++) {
    if (currentLengths[i] > prevFoundationLengths[i]) {
      // Card was placed on foundation — deal damage equal to card rank
      const topCard = state.foundations[i][state.foundations[i].length - 1];
      if (topCard) {
        combat.dealDamageToMonster(topCard.rank);
      }
    } else if (currentLengths[i] < prevFoundationLengths[i]) {
      // Card was removed (undo) — heal monster
      // The removed card's rank equals the previous top card rank = currentLength + 1
      // since foundations are built A(1), 2, 3... the removed card rank = prevLength
      const healRank = prevFoundationLengths[i]; // rank equals pile position (A=1, 2=2, etc.)
      combat.healMonster(healRank);
    }
  }
  prevFoundationLengths = currentLengths;

  // Detect stock cycle changes
  if (state.stockCycleCount > prevStockCycleCount) {
    combat.dealDamageToHero(combat.monsterAttackDamage);
  } else if (state.stockCycleCount < prevStockCycleCount) {
    // Undo of a stock cycle — heal hero
    combat.healHero(combat.monsterAttackDamage);
  }
  prevStockCycleCount = state.stockCycleCount;
});

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
  monsterMaxHp: 120,
  monsterAttackDamage: 12,
  heroMaxHp: 50,
};

export interface CombatEvent {
  type: 'hero-attack' | 'monster-attack' | 'hero-heal' | 'poison' | 'empower';
  damage: number;
  label?: string;
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
  poisonTurns: number;
  empowered: boolean;
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
  poisonTurns: 0,
  empowered: false,

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
      poisonTurns: 0,
      empowered: false,
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

  resetCombat: () => {
    get().startCombat();
  },
}));

// --- Tracking variables for subscription-based event detection ---
let prevFoundationLengths: number[] = [];
let prevStockCycleCount = 0;
let prevWasteLength = 0;
let prevWasteTopId: string | null = null;
let prevTableauEmpty: boolean[] = [];
let prevFaceDownCounts: number[] = [];
let prevTableauLengths: number[] = [];
let prevMoves = 0;
let _suppressEvents = false;

function initTracking() {
  const state = useGameStore.getState();
  prevFoundationLengths = state.foundations.map(f => f.length);
  prevStockCycleCount = state.stockCycleCount;
  prevWasteLength = state.waste.length;
  prevWasteTopId = state.waste.length > 0 ? state.waste[state.waste.length - 1].id : null;
  prevTableauEmpty = state.tableau.map(t => t.length === 0);
  prevFaceDownCounts = state.tableau.map(t => t.filter(c => !c.faceUp).length);
  prevTableauLengths = state.tableau.map(t => t.length);
  prevMoves = state.moves;
}

// Export for tests — suppress events during state setup, then reset tracking
export function _resetTracking() {
  _suppressEvents = true;
  initTracking();
  _suppressEvents = false;
}

export function _withSuppressedEvents(fn: () => void) {
  _suppressEvents = true;
  fn();
  initTracking();
  _suppressEvents = false;
}

// Initialize tracking
initTracking();

// Subscribe to game store changes to detect combat events
useGameStore.subscribe((state) => {
  if (_suppressEvents) return;

  const combat = useCombatStore.getState();
  if (!combat.isActive || combat.combatResult !== 'none') {
    // Still update tracking so we don't fire stale events after combat restarts
    prevFoundationLengths = state.foundations.map(f => f.length);
    prevStockCycleCount = state.stockCycleCount;
    prevWasteLength = state.waste.length;
    prevWasteTopId = state.waste.length > 0 ? state.waste[state.waste.length - 1].id : null;
    prevTableauEmpty = state.tableau.map(t => t.length === 0);
    prevFaceDownCounts = state.tableau.map(t => t.filter(c => !c.faceUp).length);
    prevTableauLengths = state.tableau.map(t => t.length);
    return;
  }

  // --- 1. Detect foundation changes ---
  const oldFoundationLengths = [...prevFoundationLengths];
  const currentLengths = state.foundations.map(f => f.length);
  for (let i = 0; i < 4; i++) {
    if (currentLengths[i] > prevFoundationLengths[i]) {
      // Card was placed on foundation
      const topCard = state.foundations[i][state.foundations[i].length - 1];
      if (topCard) {
        let damage = topCard.rank;

        // Empowered: double damage, then clear
        if (combat.empowered) {
          damage *= 2;
          combat.setEmpowered(false);
        }

        combat.dealDamageToMonster(damage);

        // Face card special effects
        if (topCard.rank === 11) {
          // Jack: apply poison (3 turns)
          combat.setPoisonTurns(3);
        } else if (topCard.rank === 12) {
          // Queen: heal hero 5 HP
          combat.healHero(5, 'Queen Heal!');
        } else if (topCard.rank === 13) {
          // King: empower next placement
          combat.setEmpowered(true);
        }

        // Ace: heal hero 3 HP
        if (topCard.rank === 1) {
          combat.healHero(3, 'Ace Blessing!');
        }
      }
    } else if (currentLengths[i] < prevFoundationLengths[i]) {
      // Card was removed (undo) — heal monster
      const healRank = prevFoundationLengths[i];
      combat.healMonster(healRank);

      // Undo Ace heal
      if (healRank === 1) {
        const s = useCombatStore.getState();
        useCombatStore.setState({
          heroHp: Math.max(0, s.heroHp - 3),
        });
      }
      // Undo Queen heal
      if (healRank === 12) {
        const s = useCombatStore.getState();
        useCombatStore.setState({
          heroHp: Math.max(0, s.heroHp - 5),
        });
      }
    }
  }
  prevFoundationLengths = currentLengths;

  // --- 2. Detect stock cycle (waste reset to stock) ---
  if (state.stockCycleCount > prevStockCycleCount) {
    combat.dealDamageToHero(combat.monsterAttackDamage);
  } else if (state.stockCycleCount < prevStockCycleCount) {
    combat.healHero(combat.monsterAttackDamage);
  }
  prevStockCycleCount = state.stockCycleCount;

  // --- 3. Detect draws and waste usage ---
  const currentWasteLength = state.waste.length;

  if (currentWasteLength > prevWasteLength && state.stockCycleCount === prevStockCycleCount) {
    // A draw happened (waste grew, not a stock cycle reset)
    // Every stock draw deals 1 damage to hero
    combat.dealDamageToHero(1);

    // Poison tick on each draw
    if (useCombatStore.getState().poisonTurns > 0) {
      combat.applyPoison();
    }
  } else if (currentWasteLength < prevWasteLength && state.stockCycleCount === prevStockCycleCount) {
    // Waste shrank without a stock cycle — a waste card was played
    // If it went to a foundation, damage is already handled in section 1.
    // If it went to a tableau, deal damage = card rank.
    const foundationGrew = currentLengths.some((len, i) => len > oldFoundationLengths[i]);
    if (!foundationGrew && prevWasteTopId !== null) {
      // Card went to tableau — find it to get its rank
      for (const col of state.tableau) {
        const card = col.find(c => c.id === prevWasteTopId);
        if (card) {
          combat.dealDamageToMonster(card.rank, 'Waste!');
          break;
        }
      }
    }
  }
  prevWasteLength = currentWasteLength;
  prevWasteTopId = state.waste.length > 0 ? state.waste[state.waste.length - 1].id : null;

  // --- 4. Detect tableau column clears ---
  const currentTableauEmpty = state.tableau.map(t => t.length === 0);
  for (let i = 0; i < 7; i++) {
    if (!prevTableauEmpty[i] && currentTableauEmpty[i]) {
      // Column was cleared — heal hero
      combat.healHero(5, 'Column Clear!');
    } else if (prevTableauEmpty[i] && !currentTableauEmpty[i]) {
      // Column was un-cleared (undo) — reverse heal
      const s = useCombatStore.getState();
      if (s.combatResult === 'none') {
        useCombatStore.setState({
          heroHp: Math.max(0, s.heroHp - 5),
        });
      }
    }
  }
  prevTableauEmpty = currentTableauEmpty;

  // --- 5. Detect face-down card reveals (#8) ---
  const currentFaceDownCounts = state.tableau.map(t => t.filter(c => !c.faceUp).length);
  for (let i = 0; i < 7; i++) {
    if (currentFaceDownCounts[i] < prevFaceDownCounts[i]) {
      // A face-down card was revealed — deal 2 chip damage per reveal
      const reveals = prevFaceDownCounts[i] - currentFaceDownCounts[i];
      combat.dealDamageToMonster(2 * reveals, 'Reveal!');
    } else if (currentFaceDownCounts[i] > prevFaceDownCounts[i]) {
      // Undo: card flipped back to face-down — heal monster
      const unreveals = currentFaceDownCounts[i] - prevFaceDownCounts[i];
      combat.healMonster(2 * unreveals);
    }
  }
  prevFaceDownCounts = currentFaceDownCounts;

  // --- 6. Detect combo attacks — 3+ card tableau-to-tableau moves (#11) ---
  const currentTableauLengths = state.tableau.map(t => t.length);
  const isUndo = state.moves < prevMoves;
  if (isUndo) {
    // Undo: find any pile that shrank by 3+ (the target of the original combo)
    for (let i = 0; i < 7; i++) {
      const shrinkage = prevTableauLengths[i] - currentTableauLengths[i];
      if (shrinkage >= 3) {
        combat.healMonster(2 * shrinkage);
      }
    }
  } else {
    // Forward move: find any pile that grew by 3+ (combo target)
    for (let i = 0; i < 7; i++) {
      const growth = currentTableauLengths[i] - prevTableauLengths[i];
      if (growth >= 3) {
        combat.dealDamageToMonster(2 * growth, `Combo x${growth}!`);
      }
    }
  }
  prevTableauLengths = currentTableauLengths;
  prevMoves = state.moves;
});

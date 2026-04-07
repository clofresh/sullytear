import { create } from 'zustand';
import { useGameStore } from './store';

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

// --- Tracking variables for subscription-based event detection ---
let prevFoundationLengths: number[] = [];
let prevStockCycleCount = 0;
let prevWasteLength = 0;
let prevWasteTopId: string | null = null;
let prevTableauEmpty: boolean[] = [];
let prevFaceDownCounts: number[] = [];
let playTriggeredCards = new Set<string>();
// Track which pile each face card was in, for detecting moves
let prevFaceCardPiles: Map<string, string> = new Map(); // cardId -> pileId
let prevFaceDownIds: Set<string> = new Set();
let prevTableauLengths: number[] = [];
let prevMoves = 0;
let _suppressEvents = false;

function buildFaceCardPiles(state: { tableau: import('./types').Card[][]; waste: import('./types').Card[] }): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < state.tableau.length; i++) {
    for (const card of state.tableau[i]) {
      if (card.faceUp && [1, 11, 12, 13].includes(card.rank)) {
        map.set(card.id, `tableau-${i}`);
      }
    }
  }
  for (const card of state.waste) {
    if ([1, 11, 12, 13].includes(card.rank)) {
      map.set(card.id, 'waste');
    }
  }
  return map;
}

function initTracking() {
  const state = useGameStore.getState();
  prevFoundationLengths = state.foundations.map(f => f.length);
  prevStockCycleCount = state.stockCycleCount;
  prevWasteLength = state.waste.length;
  prevWasteTopId = state.waste.length > 0 ? state.waste[state.waste.length - 1].id : null;
  prevTableauEmpty = state.tableau.map(t => t.length === 0);
  prevFaceDownCounts = state.tableau.map(t => t.filter(c => !c.faceUp).length);
  prevFaceDownIds = new Set(state.tableau.flat().filter(c => !c.faceUp).map(c => c.id));
  prevTableauLengths = state.tableau.map(t => t.length);
  prevFaceCardPiles = buildFaceCardPiles(state);
  prevMoves = state.moves;
  playTriggeredCards = new Set<string>();
}

// Export for tests — suppress events during state setup, then reset tracking
export function _hasPlayTriggered(cardId: string): boolean {
  return playTriggeredCards.has(cardId);
}

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
    prevFaceDownIds = new Set(state.tableau.flat().filter(c => !c.faceUp).map(c => c.id));
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
        let damage: number = topCard.rank;

        // Empowered: multiply damage, then clear
        if (combat.empowerMultiplier > 1.0) {
          damage = Math.round(damage * combat.empowerMultiplier);
          combat.setEmpowerMultiplier(1.0);
        }

        combat.dealDamageToMonster(damage);

        // Royal Awakening — Tier 3 (Awakens!)
        if (topCard.rank === 11) {
          combat.setPoisonTurns(3);
          combat.emitFaceCardEvent('Jack Awakens!');
        } else if (topCard.rank === 12) {
          combat.healHero(5);
          combat.emitFaceCardEvent('Queen Awakens!');
        } else if (topCard.rank === 13) {
          combat.setEmpowerMultiplier(2.0);
          combat.emitFaceCardEvent('King Awakens!');
        }

        if (topCard.rank === 1) {
          combat.healHero(3);
          combat.emitFaceCardEvent('Ace Awakens!');
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
    // Damage = sum of ranks of newly drawn cards
    const drawn = currentWasteLength - prevWasteLength;
    let rankSum = 0;
    for (let i = currentWasteLength - drawn; i < currentWasteLength; i++) {
      rankSum += state.waste[i].rank;
    }
    combat.dealDamageToHero(rankSum);

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

  // --- 3b. Detect face card plays (tier 2 effects) ---
  const currentFaceCardPiles = buildFaceCardPiles(state);
  const isUndoMove = state.moves < prevMoves;
  if (isUndoMove) {
    // Undo: find face cards that moved back — remove from triggered set and reverse effects
    for (const [cardId, prevPile] of prevFaceCardPiles) {
      const currentPile = currentFaceCardPiles.get(cardId);
      if (currentPile !== prevPile && playTriggeredCards.has(cardId)) {
        playTriggeredCards.delete(cardId);
        // Find the card to get its rank
        const card = state.tableau.flat().find(c => c.id === cardId) ?? state.waste.find(c => c.id === cardId);
        if (card) {
          if (card.rank === 1) {
            const s = useCombatStore.getState();
            useCombatStore.setState({ heroHp: Math.max(0, s.heroHp - 2) });
          }
          if (card.rank === 11) combat.setPoisonTurns(0);
          if (card.rank === 12) {
            const s = useCombatStore.getState();
            useCombatStore.setState({ heroHp: Math.max(0, s.heroHp - 3) });
          }
          if (card.rank === 13) combat.setEmpowerMultiplier(1.0);
        }
      }
    }
  } else {
    // Forward move: detect face cards that changed piles (not to foundation)
    for (const [cardId, currentPile] of currentFaceCardPiles) {
      if (!currentPile.startsWith('tableau-')) continue;
      const prevPile = prevFaceCardPiles.get(cardId);
      if (prevPile !== undefined && prevPile !== currentPile && !playTriggeredCards.has(cardId)) {
        // Face card moved to a new tableau pile — check if it's the bottom card of the moved group
        const pileIdx = parseInt(currentPile.split('-')[1]);
        const pile = state.tableau[pileIdx];
        const prevLen = prevTableauLengths[pileIdx];
        const growth = pile.length - prevLen;
        if (growth > 0) {
          const bottomOfMoved = pile[pile.length - growth];
          if (bottomOfMoved && bottomOfMoved.id === cardId) {
            playTriggeredCards.add(cardId);
            const card = bottomOfMoved;
            // Royal Awakening — Tier 2 (Rises!)
            if (card.rank === 1) { combat.healHero(2); combat.emitFaceCardEvent('Ace Rises!'); }
            if (card.rank === 11) { combat.setPoisonTurns(2); combat.emitFaceCardEvent('Jack Rises!'); }
            if (card.rank === 12) { combat.healHero(3); combat.emitFaceCardEvent('Queen Rises!'); }
            if (card.rank === 13) { combat.setEmpowerMultiplier(1.5); combat.emitFaceCardEvent('King Rises!'); }
          }
        }
      }
    }
  }
  prevFaceCardPiles = currentFaceCardPiles;

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
  const currentFaceDownIds = new Set(state.tableau.flat().filter(c => !c.faceUp).map(c => c.id));
  for (let i = 0; i < 7; i++) {
    if (currentFaceDownCounts[i] < prevFaceDownCounts[i]) {
      // A face-down card was revealed — deal 2 chip damage per reveal
      const reveals = prevFaceDownCounts[i] - currentFaceDownCounts[i];
      combat.dealDamageToMonster(2 * reveals, 'Reveal!');

      // Royal Awakening — Tier 1 (Stirs...)
      for (const card of state.tableau[i]) {
        if (card.faceUp && prevFaceDownIds.has(card.id)) {
          if (card.rank === 1) { combat.healHero(1); combat.emitFaceCardEvent('Ace Stirs...'); }
          if (card.rank === 11) { combat.setPoisonTurns(1); combat.emitFaceCardEvent('Jack Stirs...'); }
          if (card.rank === 12) { combat.healHero(2); combat.emitFaceCardEvent('Queen Stirs...'); }
          if (card.rank === 13) { combat.setEmpowerMultiplier(1.25); combat.emitFaceCardEvent('King Stirs...'); }
        }
      }
    } else if (currentFaceDownCounts[i] > prevFaceDownCounts[i]) {
      // Undo: card flipped back to face-down — heal monster
      const unreveals = currentFaceDownCounts[i] - prevFaceDownCounts[i];
      combat.healMonster(2 * unreveals);

      // Undo tier 1 face card effects
      for (const card of state.tableau[i]) {
        if (!card.faceUp && !prevFaceDownIds.has(card.id)) {
          // This card was just flipped back to face-down (undo)
          if (card.rank === 1) {
            const s = useCombatStore.getState();
            useCombatStore.setState({ heroHp: Math.max(0, s.heroHp - 1) });
          }
          if (card.rank === 11) combat.setPoisonTurns(0);
          if (card.rank === 12) {
            const s = useCombatStore.getState();
            useCombatStore.setState({ heroHp: Math.max(0, s.heroHp - 2) });
          }
          if (card.rank === 13) combat.setEmpowerMultiplier(1.0);
        }
      }
    }
  }
  prevFaceDownCounts = currentFaceDownCounts;
  prevFaceDownIds = currentFaceDownIds;

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

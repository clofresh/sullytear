import type { GameSnapshot, GameStateLike, DetectorContext, CombatActionsSlice, CombatStateView } from './types';
import { snapshotGame } from './types';
import { detectFoundationChanges } from './detectors/foundationDetector';
import { detectStockCycle } from './detectors/stockCycleDetector';
import { detectWasteUsage } from './detectors/wasteDetector';
import { detectFaceCardMoves } from './detectors/faceCardMoveDetector';
import { detectColumnClears } from './detectors/columnClearDetector';
import { detectReveals } from './detectors/revealDetector';
import { detectCombo } from './detectors/comboDetector';
import type { Sticker } from '../stickers/types';
import {
  findCardStickers,
  findPileStickers,
  findHeroStickers,
} from '../stickers/queries';

export interface EventDetectorDeps {
  combat: CombatActionsSlice;
  combatState: () => CombatStateView;
  setHeroHp: (hp: number) => void;
  /** True if combat is inactive or finished — detectors are skipped, but
   *  tracking snapshots are still updated so we don't fire stale events
   *  on the next frame. */
  isCombatPaused: () => boolean;
  getStickers: () => Sticker[];
}

/**
 * Encapsulates the per-frame combat-event detection that used to live as
 * module-level `let` variables in combatStore.ts. Holds one prev snapshot
 * plus the cross-frame face-card-trigger Set.
 *
 * Lifecycle:
 *   - `init(state)` — capture initial snapshot, clear triggered set.
 *   - `run(state)` — called from the gameStore subscription on every change.
 *   - `withSuppressedEvents(fn)` — used by tests to set up game state
 *     without firing combat events.
 */
export class EventDetector {
  private prev: GameSnapshot;
  private playTriggeredCards = new Set<string>();
  private revealStreak = { value: 0 };
  private suppressed = false;
  private readonly deps: EventDetectorDeps;

  constructor(initialState: GameStateLike, deps: EventDetectorDeps) {
    this.deps = deps;
    this.prev = snapshotGame(initialState);
  }

  init(state: GameStateLike): void {
    this.prev = snapshotGame(state);
    this.playTriggeredCards = new Set<string>();
    this.revealStreak = { value: 0 };
  }

  hasPlayTriggered(cardId: string): boolean {
    return this.playTriggeredCards.has(cardId);
  }

  withSuppressedEvents(fn: () => void, postState: () => GameStateLike): void {
    this.suppressed = true;
    fn();
    this.init(postState());
    this.suppressed = false;
  }

  run(state: GameStateLike): void {
    if (this.suppressed) return;

    // Skip detectors when combat is paused/over, but keep snapshots fresh.
    if (this.deps.isCombatPaused()) {
      this.prev = snapshotGame(state);
      return;
    }

    const next = snapshotGame(state);
    const allStickers = this.deps.getStickers();
    const combat = this.deps.combat;
    const stickersHook: DetectorContext['stickers'] = {
      getAll: () => allStickers,
      foundationDamageBonus: (card, pileId) => {
        let bonus = 0;
        for (const s of findCardStickers(allStickers, card.id)) {
          if (s.defId === 'sharpened') bonus += 3;
        }
        for (const s of findPileStickers(allStickers, pileId)) {
          if (s.defId === 'forge') bonus += 2;
        }
        return bonus;
      },
      onReveal: (card) => {
        for (const s of findCardStickers(allStickers, card.id)) {
          if (s.defId === 'volatile') {
            combat.dealDamageToMonster(card.rank, 'Volatile!');
          }
        }
      },
      onDamageDealt: (amount) => {
        let heal = 0;
        for (const s of findHeroStickers(allStickers)) {
          if (s.defId === 'vampire') {
            heal += Math.max(1, Math.floor(amount * 0.1));
          }
        }
        return heal;
      },
    };
    const ctx: DetectorContext = {
      combat: this.deps.combat,
      combatState: this.deps.combatState,
      setHeroHp: this.deps.setHeroHp,
      playTriggeredCards: this.playTriggeredCards,
      revealStreak: this.revealStreak,
      stickers: stickersHook,
    };

    const { foundationGrew } = detectFoundationChanges(this.prev.foundationLengths, state.foundations, ctx);
    detectStockCycle(this.prev.stockCycleCount, state.stockCycleCount, ctx);
    detectWasteUsage(
      this.prev.wasteLength,
      this.prev.wasteTopId,
      this.prev.stockCycleCount,
      state.stockCycleCount,
      state.waste,
      state.tableau,
      foundationGrew,
      ctx,
    );
    detectFaceCardMoves(this.prev.faceCardPiles, next.faceCardPiles, this.prev.tableauLengths, this.prev.moves, state, ctx);
    detectColumnClears(this.prev.tableauEmpty, next.tableauEmpty, ctx);
    detectReveals(this.prev.faceDownCounts, this.prev.faceDownIds, state.tableau, ctx);
    detectCombo(this.prev.tableauLengths, next.tableauLengths, this.prev.moves, state.moves, ctx);

    this.prev = next;
  }
}

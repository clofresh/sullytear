/**
 * Cross-store orchestration layer.
 *
 * Stores expose data + intra-store actions only. The orchestrator owns
 * every cross-store side effect, breaking the App→runStore→combatStore→
 * gameStore reach-through chain that the tech-debt issue (#34) called out.
 *
 * Dependency graph after this refactor:
 *
 *     orchestrator ──► gameStore
 *           │                  ▲
 *           ├──► combatStore   │ (via EventDetector subscription)
 *           ├──► runStore      │
 *           └──► metaStore     │
 *
 * No store imports another store for side effects. `runStore` actions
 * delegate cross-store work to `startEncounter` / `endRunEffects` here.
 */

import { useGameStore, registerCombatBridge, type PreDealtDeal } from './store';
import { useCombatStore, type EncounterConfig } from './combatStore';
import { useMetaStore } from './metaStore';
import { EventDetector } from './combat/EventDetector';
import { useRunStore } from './runStore';

// --- Combat event detection ----------------------------------------------

const detector = new EventDetector(useGameStore.getState(), {
  combat: {
    dealDamageToMonster: (d, l) => useCombatStore.getState().dealDamageToMonster(d, l),
    dealDamageToHero: (d) => useCombatStore.getState().dealDamageToHero(d),
    addThreat: (a) => useCombatStore.getState().addThreat(a),
    healMonster: (a) => useCombatStore.getState().healMonster(a),
    healHero: (a, l) => useCombatStore.getState().healHero(a, l),
    applyPoison: () => useCombatStore.getState().applyPoison(),
    setPoisonTurns: (t) => useCombatStore.getState().setPoisonTurns(t),
    setEmpowerMultiplier: (m) => useCombatStore.getState().setEmpowerMultiplier(m),
    emitFaceCardEvent: (l) => useCombatStore.getState().emitFaceCardEvent(l),
    grantArmor: (a, l) => useCombatStore.getState().grantArmor(a, l),
    grantDefense: (p, l) => useCombatStore.getState().grantDefense(p, l),
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
  // runStore <-> orchestrator is an existing circular (runStore imports
  // startEncounter from here). The getter form works because it's only
  // invoked at detector run time, after both modules are fully evaluated.
  getStickers: () => useRunStore.getState().stickers,
});

useGameStore.subscribe((state) => detector.run(state));

// Register the combat bridge so gameStore.takeSnapshot/undo can capture
// and restore combat state alongside solitaire state.
registerCombatBridge({
  snapshot: () => useCombatStore.getState().snapshotCombat(),
  restore: (snap) => useCombatStore.getState().restoreCombatSnapshot(snap),
});

// --- Public helpers reading detector state -------------------------------

export function hasPlayTriggered(cardId: string): boolean {
  return detector.hasPlayTriggered(cardId);
}

/** @internal — used by tests to reset tracking state between cases. */
export function _resetTracking(): void {
  detector.withSuppressedEvents(() => {}, () => useGameStore.getState());
}

/** @internal — used by tests and the orchestrator itself to apply
 *  gameStore state without firing combat events. */
export function _withSuppressedEvents(fn: () => void): void {
  detector.withSuppressedEvents(fn, () => useGameStore.getState());
}

// --- Run-level orchestration ---------------------------------------------

/**
 * Begin a new encounter: deal a fresh deck (without firing combat events)
 * and start combat with the given monster config.
 */
export function startEncounter(config: EncounterConfig, preDealt?: PreDealtDeal): void {
  _withSuppressedEvents(() => {
    useGameStore.getState().newGame(undefined, preDealt);
  });
  useCombatStore.getState().startCombat(config);
}

/** Record run-start meta progression. */
export function recordRunStarted(): void {
  useMetaStore.getState().recordRunStarted();
}

/** Record monster-slain meta progression. */
export function recordMonsterSlain(): void {
  useMetaStore.getState().recordMonsterSlain();
}

/**
 * Apply end-of-run side effects: credit gold and (on victory) record
 * the completed run.
 */
export function endRunEffects(goldEarned: number, result: 'victory' | 'defeat'): void {
  useMetaStore.getState().addGold(goldEarned);
  if (result === 'victory') {
    useMetaStore.getState().recordRunCompleted();
  }
}

/** Read the hero's current HP — used by runStore to compute carry-over and gold. */
export function getHeroHp(): number {
  return useCombatStore.getState().heroHp;
}

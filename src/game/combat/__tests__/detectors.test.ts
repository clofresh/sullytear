import { describe, it, expect, vi } from 'vitest';
import type { Card, Suit, Rank } from '../../types';
import type { CombatActionsSlice, DetectorContext } from '../types';
import { detectFoundationChanges } from '../detectors/foundationDetector';
import { detectStockCycle } from '../detectors/stockCycleDetector';
import { detectColumnClears } from '../detectors/columnClearDetector';
import { detectCombo } from '../detectors/comboDetector';
import { detectWasteUsage } from '../detectors/wasteDetector';

function makeCard(suit: Suit, rank: Rank, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp };
}

function stubCombat(): CombatActionsSlice & { _calls: Record<string, unknown[][]> } {
  const calls: Record<string, unknown[][]> = {};
  const track = (name: string) =>
    vi.fn((...args: unknown[]) => { (calls[name] ||= []).push(args); });
  return {
    dealDamageToMonster: track('dealDamageToMonster'),
    dealDamageToHero: track('dealDamageToHero'),
    healMonster: track('healMonster'),
    healHero: track('healHero'),
    applyPoison: track('applyPoison'),
    setPoisonTurns: track('setPoisonTurns'),
    setEmpowerMultiplier: track('setEmpowerMultiplier'),
    emitFaceCardEvent: track('emitFaceCardEvent'),
    grantArmor: track('grantArmor'),
    grantDefense: track('grantDefense'),
    _calls: calls,
  } as ReturnType<typeof stubCombat>;
}

function makeCtx(overrides: Partial<{ empowerMultiplier: number; poisonTurns: number; heroHp: number }> = {}) {
  const combat = stubCombat();
  const setHeroHp = vi.fn();
  const ctx: DetectorContext = {
    combat,
    combatState: () => ({
      empowerMultiplier: overrides.empowerMultiplier ?? 1.0,
      poisonTurns: overrides.poisonTurns ?? 0,
      combatResult: 'none',
      monsterAttackDamage: 12,
      heroHp: overrides.heroHp ?? 50,
    }),
    setHeroHp,
    playTriggeredCards: new Set<string>(),
  };
  return { ctx, combat, setHeroHp };
}

describe('foundationDetector', () => {
  it('deals damage equal to rank when foundation grows', () => {
    const { ctx, combat } = makeCtx();
    const result = detectFoundationChanges([0, 0, 0, 0], [[makeCard('hearts', 7)], [], [], []], ctx);
    expect(combat._calls.dealDamageToMonster?.[0]).toEqual([7]);
    expect(result.foundationGrew).toBe(true);
  });

  it('multiplies damage by empower then clears multiplier', () => {
    const { ctx, combat } = makeCtx({ empowerMultiplier: 2.0 });
    detectFoundationChanges([0, 0, 0, 0], [[makeCard('hearts', 5)], [], [], []], ctx);
    expect(combat._calls.dealDamageToMonster?.[0]).toEqual([10]);
    expect(combat._calls.setEmpowerMultiplier?.[0]).toEqual([1.0]);
  });

  it('triggers Ace Awakens on rank 1', () => {
    const { ctx, combat } = makeCtx();
    detectFoundationChanges([0, 0, 0, 0], [[makeCard('hearts', 1)], [], [], []], ctx);
    expect(combat._calls.healHero?.[0]).toEqual([3]);
    expect(combat._calls.emitFaceCardEvent?.[0]).toEqual(['Ace Awakens!']);
  });

  it('heals monster on undo', () => {
    const { ctx, combat } = makeCtx();
    detectFoundationChanges([3, 0, 0, 0], [[makeCard('hearts', 1), makeCard('hearts', 2)], [], [], []], ctx);
    expect(combat._calls.healMonster?.[0]).toEqual([3]);
  });
});

describe('stockCycleDetector', () => {
  it('damages hero on cycle increase', () => {
    const { ctx, combat } = makeCtx();
    detectStockCycle(0, 1, ctx);
    expect(combat._calls.dealDamageToHero?.[0]).toEqual([12]);
  });

  it('heals hero on cycle undo', () => {
    const { ctx, combat } = makeCtx();
    detectStockCycle(2, 1, ctx);
    expect(combat._calls.healHero?.[0]).toEqual([12]);
  });
});

describe('columnClearDetector', () => {
  it('heals hero by 5 on clear', () => {
    const { ctx, combat } = makeCtx();
    detectColumnClears([false, false, false, false, false, false, false], [true, false, false, false, false, false, false], ctx);
    expect(combat._calls.healHero?.[0]).toEqual([5, 'Column Clear!']);
  });

  it('subtracts 5 hero hp on un-clear', () => {
    const { ctx, setHeroHp } = makeCtx({ heroHp: 20 });
    detectColumnClears([true, false, false, false, false, false, false], [false, false, false, false, false, false, false], ctx);
    expect(setHeroHp).toHaveBeenCalledWith(15);
  });
});

describe('comboDetector', () => {
  it('damages monster on growth ≥ 3 forward move', () => {
    const { ctx, combat } = makeCtx();
    detectCombo([0, 0, 0, 0, 0, 0, 0], [4, 0, 0, 0, 0, 0, 0], 1, 2, ctx);
    expect(combat._calls.dealDamageToMonster?.[0]).toEqual([8, 'Combo x4!']);
  });

  it('heals monster on undo of combo', () => {
    const { ctx, combat } = makeCtx();
    detectCombo([4, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], 2, 1, ctx);
    expect(combat._calls.healMonster?.[0]).toEqual([8]);
  });

  it('ignores growth of 2', () => {
    const { ctx, combat } = makeCtx();
    detectCombo([0, 0, 0, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0, 0], 1, 2, ctx);
    expect(combat._calls.dealDamageToMonster).toBeUndefined();
  });
});

describe('wasteDetector', () => {
  it('damages hero by sum of drawn ranks', () => {
    const { ctx, combat } = makeCtx();
    detectWasteUsage(0, null, 0, 0,
      [makeCard('hearts', 5), makeCard('hearts', 7), makeCard('hearts', 3)],
      [[], [], [], [], [], [], []],
      false, ctx);
    expect(combat._calls.dealDamageToHero?.[0]).toEqual([15]);
  });

  it('damages monster by rank when waste card moved to tableau (no foundation grew)', () => {
    const { ctx, combat } = makeCtx();
    const card = makeCard('hearts', 9);
    detectWasteUsage(1, card.id, 0, 0,
      [],
      [[card], [], [], [], [], [], []],
      false, ctx);
    expect(combat._calls.dealDamageToMonster?.[0]).toEqual([9, 'Waste!']);
  });

  it('does not double-count when waste card went to a foundation', () => {
    const { ctx, combat } = makeCtx();
    const card = makeCard('hearts', 9);
    detectWasteUsage(1, card.id, 0, 0,
      [],
      [[card], [], [], [], [], [], []],
      true, ctx);
    expect(combat._calls.dealDamageToMonster).toBeUndefined();
  });
});

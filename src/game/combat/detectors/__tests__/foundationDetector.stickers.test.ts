import { describe, it, expect, vi } from 'vitest';
import type { Card, Suit, Rank } from '../../../types';
import type { CombatActionsSlice, DetectorContext } from '../../types';
import { detectFoundationChanges } from '../foundationDetector';
import { foundationId } from '../../../pileId';

function makeCard(suit: Suit, rank: Rank, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp };
}

function stubCombat(): CombatActionsSlice & { _calls: Record<string, unknown[][]> } {
  const calls: Record<string, unknown[][]> = {};
  const track = (name: string) =>
    vi.fn((...args: unknown[]) => {
      (calls[name] ||= []).push(args);
    });
  return {
    dealDamageToMonster: track('dealDamageToMonster'),
    dealDamageToHero: track('dealDamageToHero'),
    addThreat: track('addThreat'),
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

function makeCtx(
  foundationDamageBonus: DetectorContext['stickers']['foundationDamageBonus'] = () => 0,
  onDamageDealt: DetectorContext['stickers']['onDamageDealt'] = () => 0,
) {
  const combat = stubCombat();
  const ctx: DetectorContext = {
    combat,
    combatState: () => ({
      empowerMultiplier: 1.0,
      poisonTurns: 0,
      combatResult: 'none',
      monsterAttackDamage: 12,
      heroHp: 50,
    }),
    setHeroHp: vi.fn(),
    playTriggeredCards: new Set(),
    revealStreak: { value: 0 },
    stickers: {
      getAll: () => [],
      foundationDamageBonus,
      onReveal: () => {},
      onDamageDealt,
    },
  };
  return { ctx, combat };
}

describe('foundationDetector sticker hooks', () => {
  it('adds foundation damage bonus from card and pile stickers', () => {
    const card = makeCard('hearts', 7);
    const expectedPile = foundationId(0);
    const bonus = vi.fn((c: Card, p: string) => {
      expect(c.id).toBe(card.id);
      expect(p).toBe(expectedPile);
      return 5; // Sharpened 3 + Forge 2
    });
    const { ctx, combat } = makeCtx(bonus);
    detectFoundationChanges([0, 0, 0, 0], [[card], [], [], []], ctx);
    expect(combat._calls.dealDamageToMonster?.[0]).toEqual([12]); // 7 + 5
    expect(bonus).toHaveBeenCalledOnce();
  });

  it('applies vampire heal via onDamageDealt after damage', () => {
    const card = makeCard('spades', 10);
    const { ctx, combat } = makeCtx(
      () => 0,
      (amt) => Math.max(1, Math.floor(amt * 0.1)),
    );
    detectFoundationChanges([0, 0, 0, 0], [[], [card], [], []], ctx);
    expect(combat._calls.dealDamageToMonster?.[0]).toEqual([10]);
    expect(combat._calls.healHero?.[0]).toEqual([1]);
  });
});

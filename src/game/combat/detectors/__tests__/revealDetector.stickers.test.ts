import { describe, it, expect, vi } from 'vitest';
import type { Card, Suit, Rank } from '../../../types';
import type { CombatActionsSlice, DetectorContext } from '../../types';
import { detectReveals } from '../revealDetector';

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

describe('revealDetector sticker hooks', () => {
  it('calls stickers.onReveal for each newly revealed card', () => {
    const combat = stubCombat();
    const onReveal = vi.fn((card: Card) => {
      combat.dealDamageToMonster(card.rank, 'Volatile!');
    });
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
        foundationDamageBonus: () => 0,
        onReveal,
        onDamageDealt: () => 0,
      },
    };

    const hidden = makeCard('hearts', 8, false);
    const revealed = { ...hidden, faceUp: true };
    // column 0 had 1 face-down; now that card is face-up.
    const tableau: Card[][] = [[revealed], [], [], [], [], [], []];
    const prevFaceDownCounts = [1, 0, 0, 0, 0, 0, 0];
    const prevFaceDownIds = new Set([hidden.id]);

    detectReveals(prevFaceDownCounts, prevFaceDownIds, tableau, ctx);

    expect(onReveal).toHaveBeenCalledOnce();
    // Chip 2 + Volatile 8
    expect(combat._calls.dealDamageToMonster).toEqual([[2, 'Reveal!'], [8, 'Volatile!']]);
  });
});

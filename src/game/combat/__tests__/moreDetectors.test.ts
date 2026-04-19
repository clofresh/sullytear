import { describe, it, expect, vi } from 'vitest';
import type { Card, Suit, Rank } from '../../types';
import type { CombatActionsSlice, DetectorContext } from '../types';
import { detectFaceCardMoves } from '../detectors/faceCardMoveDetector';
import { detectReveals } from '../detectors/revealDetector';
import { buildFaceCardPiles } from '../types';

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
  overrides: Partial<{ heroHp: number }> = {},
  triggered = new Set<string>(),
  revealStreak: { value: number } = { value: 0 },
) {
  const combat = stubCombat();
  const setHeroHp = vi.fn();
  const ctx: DetectorContext = {
    combat,
    combatState: () => ({
      empowerMultiplier: 1.0,
      poisonTurns: 0,
      combatResult: 'none',
      monsterAttackDamage: 12,
      heroHp: overrides.heroHp ?? 50,
    }),
    setHeroHp,
    playTriggeredCards: triggered,
    revealStreak,
    stickers: {
      getAll: () => [],
      foundationDamageBonus: () => 0,
      onReveal: () => {},
        onUnreveal: () => {},
      onDamageDealt: () => 0,
    },
  };
  return { ctx, combat, setHeroHp, revealStreak };
}

function emptyTab(): Card[][] {
  return [[], [], [], [], [], [], []];
}

// ──────────────────────────────────────────────────────────────────────
// faceCardMoveDetector — tier-2 "Rises!" effects when a face card lands
// at the bottom of a moved group on a new tableau column.
// ──────────────────────────────────────────────────────────────────────
describe('faceCardMoveDetector', () => {
  function moveFaceCardToCol0(rank: Rank) {
    const card = makeCard('hearts', rank);
    const prevTab = emptyTab();
    prevTab[1] = [card]; // started in column 1
    const nextTab = emptyTab();
    nextTab[0] = [card]; // moved to column 0

    const prevPiles = buildFaceCardPiles({ tableau: prevTab, waste: [] });
    const nextPiles = buildFaceCardPiles({ tableau: nextTab, waste: [] });
    const prevLengths = prevTab.map(p => p.length);
    return { card, prevTab, nextTab, prevPiles, nextPiles, prevLengths };
  }

  it('triggers Ace Rises! tier-2 on first move', () => {
    const { nextTab, prevPiles, nextPiles, prevLengths } = moveFaceCardToCol0(1);
    const { ctx, combat } = makeCtx();
    detectFaceCardMoves(prevPiles, nextPiles, prevLengths, /*prevMoves*/ 0, { tableau: nextTab, waste: [], moves: 1 }, ctx);
    expect(combat._calls.healHero?.[0]).toEqual([2]);
    expect(combat._calls.emitFaceCardEvent?.[0]).toEqual(['Ace Rises!']);
    expect(ctx.playTriggeredCards.has('hearts-1')).toBe(true);
  });

  it('triggers Jack Rises! (poison 2) tier-2', () => {
    const { nextTab, prevPiles, nextPiles, prevLengths } = moveFaceCardToCol0(11);
    const { ctx, combat } = makeCtx();
    detectFaceCardMoves(prevPiles, nextPiles, prevLengths, 0, { tableau: nextTab, waste: [], moves: 1 }, ctx);
    expect(combat._calls.setPoisonTurns?.[0]).toEqual([2]);
    expect(combat._calls.emitFaceCardEvent?.[0]).toEqual(['Jack Rises!']);
  });

  it('triggers Queen Rises! (heal 3) tier-2', () => {
    const { nextTab, prevPiles, nextPiles, prevLengths } = moveFaceCardToCol0(12);
    const { ctx, combat } = makeCtx();
    detectFaceCardMoves(prevPiles, nextPiles, prevLengths, 0, { tableau: nextTab, waste: [], moves: 1 }, ctx);
    expect(combat._calls.healHero?.[0]).toEqual([3]);
    expect(combat._calls.emitFaceCardEvent?.[0]).toEqual(['Queen Rises!']);
  });

  it('triggers King Rises! (+6 armor) tier-2', () => {
    const { nextTab, prevPiles, nextPiles, prevLengths } = moveFaceCardToCol0(13);
    const { ctx, combat } = makeCtx();
    detectFaceCardMoves(prevPiles, nextPiles, prevLengths, 0, { tableau: nextTab, waste: [], moves: 1 }, ctx);
    expect(combat._calls.grantArmor?.[0]).toEqual([6, 'King Rises!']);
    expect(combat._calls.emitFaceCardEvent?.[0]).toEqual(['King Rises!']);
  });

  it('does not re-trigger a card that already fired tier-2', () => {
    const { nextTab, prevPiles, nextPiles, prevLengths } = moveFaceCardToCol0(12);
    const triggered = new Set<string>(['hearts-12']);
    const { ctx, combat } = makeCtx({}, triggered);
    detectFaceCardMoves(prevPiles, nextPiles, prevLengths, 0, { tableau: nextTab, waste: [], moves: 1 }, ctx);
    expect(combat._calls.healHero).toBeUndefined();
    expect(combat._calls.emitFaceCardEvent).toBeUndefined();
  });

  it('reverses Queen tier-2 on undo (-3 hp)', () => {
    // Card is currently back in col 1 (the "prev" of the original move),
    // moves count went down → undo path.
    const card = makeCard('hearts', 12);
    const triggered = new Set<string>(['hearts-12']);
    const tabBack = emptyTab();
    tabBack[1] = [card];
    const piles = buildFaceCardPiles({ tableau: tabBack, waste: [] });
    // prevPiles claims card was in tableau-0 (where it had been pre-undo)
    const prevPiles = new Map<string, string>([['hearts-12', 'tableau-0']]);

    const { ctx, setHeroHp } = makeCtx({ heroHp: 20 }, triggered);
    detectFaceCardMoves(prevPiles, piles, tabBack.map(p => p.length), /*prevMoves*/ 5, { tableau: tabBack, waste: [], moves: 4 }, ctx);
    expect(setHeroHp).toHaveBeenCalledWith(17);
    expect(triggered.has('hearts-12')).toBe(false);
  });

  it('clears playTriggered for King on undo (armor restore is handled by combat snapshot, not this detector)', () => {
    const card = makeCard('hearts', 13);
    const triggered = new Set<string>(['hearts-13']);
    const tabBack = emptyTab();
    tabBack[1] = [card];
    const piles = buildFaceCardPiles({ tableau: tabBack, waste: [] });
    const prevPiles = new Map<string, string>([['hearts-13', 'tableau-0']]);

    const { ctx } = makeCtx({}, triggered);
    detectFaceCardMoves(prevPiles, piles, tabBack.map(p => p.length), 5, { tableau: tabBack, waste: [], moves: 4 }, ctx);
    expect(triggered.has('hearts-13')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────
// revealDetector — tier-1 "Stirs..." effects when a face-down card is
// flipped face-up.
// ──────────────────────────────────────────────────────────────────────
describe('revealDetector', () => {
  it('deals 2 damage per revealed card', () => {
    const tab = emptyTab();
    tab[0] = [makeCard('hearts', 5)]; // 1 face-up
    const prevCounts = [1, 0, 0, 0, 0, 0, 0]; // was 1 face-down in col 0
    const prevIds = new Set<string>(['hearts-5']); // (any id that's now face-up)
    const { ctx, combat } = makeCtx();
    detectReveals(prevCounts, prevIds, tab, ctx);
    // Reveal damage: 2 × 1 = 2
    expect(combat._calls.dealDamageToMonster?.[0]).toEqual([2, 'Reveal!']);
  });

  it('triggers Ace Stirs... tier-1 (heal 1)', () => {
    const tab = emptyTab();
    tab[0] = [makeCard('hearts', 1)];
    const prevCounts = [1, 0, 0, 0, 0, 0, 0];
    const prevIds = new Set<string>(['hearts-1']);
    const { ctx, combat } = makeCtx();
    detectReveals(prevCounts, prevIds, tab, ctx);
    expect(combat._calls.healHero?.[0]).toEqual([1]);
    expect(combat._calls.emitFaceCardEvent?.[0]).toEqual(['Ace Stirs...']);
  });

  it('triggers Jack/Queen/King Stirs... tier-1', () => {
    for (const [rank, expected] of [
      [11, ['Jack Stirs...', 'setPoisonTurns', 1]] as const,
      [12, ['Queen Stirs...', 'healHero', 2]] as const,
      [13, ['King Stirs...', 'grantArmor', 3]] as const,
    ]) {
      const tab = emptyTab();
      tab[0] = [makeCard('hearts', rank as Rank)];
      const prevCounts = [1, 0, 0, 0, 0, 0, 0];
      const prevIds = new Set<string>([`hearts-${rank}`]);
      const { ctx, combat } = makeCtx();
      detectReveals(prevCounts, prevIds, tab, ctx);
      const [label, action, value] = expected;
      expect(combat._calls.emitFaceCardEvent?.[0]).toEqual([label]);
      // grantArmor passes a label, others don't.
      expect(combat._calls[action]?.[0]?.[0]).toEqual(value);
    }
  });

  it('heals monster on un-reveal (undo)', () => {
    const tab = emptyTab();
    tab[0] = [makeCard('hearts', 5, false)]; // now face-down
    const prevCounts = [0, 0, 0, 0, 0, 0, 0]; // had 0 face-down
    const prevIds = new Set<string>(); // (none were face-down before)
    const { ctx, combat } = makeCtx();
    detectReveals(prevCounts, prevIds, tab, ctx);
    expect(combat._calls.healMonster?.[0]).toEqual([2]);
  });

  it('reverses Ace tier-1 on un-reveal (-1 hp)', () => {
    const tab = emptyTab();
    tab[0] = [makeCard('hearts', 1, false)]; // Ace flipped back to face-down
    const prevCounts = [0, 0, 0, 0, 0, 0, 0];
    const prevIds = new Set<string>();
    const { ctx, setHeroHp } = makeCtx({ heroHp: 30 });
    detectReveals(prevCounts, prevIds, tab, ctx);
    expect(setHeroHp).toHaveBeenCalledWith(29);
  });

  describe('Diligent Play streak', () => {
    it('grants +2 armor when streak crosses 3 cumulative reveals', () => {
      const streak = { value: 2 };
      const tab = emptyTab();
      tab[0] = [makeCard('hearts', 5)];
      const { ctx, combat } = makeCtx({}, new Set(), streak);
      detectReveals([1, 0, 0, 0, 0, 0, 0], new Set(['hearts-5']), tab, ctx);
      expect(combat._calls.grantArmor?.[0]).toEqual([2, 'Diligent Play!']);
      expect(streak.value).toBe(3);
    });

    it('does not grant armor until a threshold is crossed', () => {
      const streak = { value: 0 };
      const tab = emptyTab();
      tab[0] = [makeCard('hearts', 5)];
      const { ctx, combat } = makeCtx({}, new Set(), streak);
      detectReveals([1, 0, 0, 0, 0, 0, 0], new Set(['hearts-5']), tab, ctx);
      expect(combat._calls.grantArmor).toBeUndefined();
      expect(streak.value).toBe(1);
    });

    it('grants multiple bonuses when a single move crosses multiple thresholds', () => {
      // Reveal 6 cards at once (unrealistic but covers the math) starting from 0.
      const streak = { value: 0 };
      const tab = emptyTab();
      // 6 face-up cards across columns; prev had 6 face-down.
      tab[0] = [makeCard('hearts', 2), makeCard('hearts', 3), makeCard('hearts', 4)];
      tab[1] = [makeCard('spades', 2), makeCard('spades', 3), makeCard('spades', 4)];
      const prevCounts = [3, 3, 0, 0, 0, 0, 0];
      const prevIds = new Set<string>([
        'hearts-2', 'hearts-3', 'hearts-4',
        'spades-2', 'spades-3', 'spades-4',
      ]);
      const { ctx, combat } = makeCtx({}, new Set(), streak);
      detectReveals(prevCounts, prevIds, tab, ctx);
      // 6 reveals → crosses thresholds at 3 and 6 → 2 × +2 = +4 armor in one grant
      expect(combat._calls.grantArmor?.[0]).toEqual([4, 'Diligent Play!']);
      expect(streak.value).toBe(6);
    });

    it('decrements streak on un-reveal without granting armor', () => {
      const streak = { value: 3 };
      const tab = emptyTab();
      tab[0] = [makeCard('hearts', 5, false)]; // face-down
      const { ctx, combat } = makeCtx({}, new Set(), streak);
      detectReveals([0, 0, 0, 0, 0, 0, 0], new Set(), tab, ctx);
      expect(combat._calls.grantArmor).toBeUndefined();
      expect(streak.value).toBe(2);
    });

    it('streak floors at 0 on excess un-reveals', () => {
      const streak = { value: 1 };
      const tab = emptyTab();
      tab[0] = [makeCard('hearts', 5, false), makeCard('spades', 5, false)];
      const { ctx } = makeCtx({}, new Set(), streak);
      detectReveals([0, 0, 0, 0, 0, 0, 0], new Set(), tab, ctx);
      expect(streak.value).toBe(0);
    });
  });
});

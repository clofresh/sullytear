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
    healMonster: track('healMonster'),
    healHero: track('healHero'),
    applyPoison: track('applyPoison'),
    setPoisonTurns: track('setPoisonTurns'),
    setEmpowerMultiplier: track('setEmpowerMultiplier'),
    emitFaceCardEvent: track('emitFaceCardEvent'),
    _calls: calls,
  } as ReturnType<typeof stubCombat>;
}

function makeCtx(overrides: Partial<{ heroHp: number }> = {}, triggered = new Set<string>()) {
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
  };
  return { ctx, combat, setHeroHp };
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

  it('triggers King Rises! (empower 1.5) tier-2', () => {
    const { nextTab, prevPiles, nextPiles, prevLengths } = moveFaceCardToCol0(13);
    const { ctx, combat } = makeCtx();
    detectFaceCardMoves(prevPiles, nextPiles, prevLengths, 0, { tableau: nextTab, waste: [], moves: 1 }, ctx);
    expect(combat._calls.setEmpowerMultiplier?.[0]).toEqual([1.5]);
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

  it('reverses King tier-2 on undo (empower → 1.0)', () => {
    const card = makeCard('hearts', 13);
    const triggered = new Set<string>(['hearts-13']);
    const tabBack = emptyTab();
    tabBack[1] = [card];
    const piles = buildFaceCardPiles({ tableau: tabBack, waste: [] });
    const prevPiles = new Map<string, string>([['hearts-13', 'tableau-0']]);

    const { ctx, combat } = makeCtx({}, triggered);
    detectFaceCardMoves(prevPiles, piles, tabBack.map(p => p.length), 5, { tableau: tabBack, waste: [], moves: 4 }, ctx);
    expect(combat._calls.setEmpowerMultiplier?.[0]).toEqual([1.0]);
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
      [13, ['King Stirs...', 'setEmpowerMultiplier', 1.25]] as const,
    ]) {
      const tab = emptyTab();
      tab[0] = [makeCard('hearts', rank as Rank)];
      const prevCounts = [1, 0, 0, 0, 0, 0, 0];
      const prevIds = new Set<string>([`hearts-${rank}`]);
      const { ctx, combat } = makeCtx();
      detectReveals(prevCounts, prevIds, tab, ctx);
      const [label, action, value] = expected;
      expect(combat._calls.emitFaceCardEvent?.[0]).toEqual([label]);
      expect(combat._calls[action]?.[0]).toEqual([value]);
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
});

import type { Card } from '../../types';
import type { DetectorContext } from '../types';

/**
 * Detection #3b: Face card moves to tableau (Tier 2 — Rises!).
 *
 * - Forward: face card lands at the bottom of a moved group on a new
 *   tableau column → trigger tier-2 effect (once per card).
 * - Undo: face cards moved back → reverse tier-2 effects.
 */
export function detectFaceCardMoves(
  prevFaceCardPiles: Map<string, string>,
  currentFaceCardPiles: Map<string, string>,
  prevTableauLengths: number[],
  prevMoves: number,
  state: { tableau: Card[][]; waste: Card[]; moves: number },
  ctx: DetectorContext,
): void {
  const isUndoMove = state.moves < prevMoves;

  if (isUndoMove) {
    for (const [cardId, prevPile] of prevFaceCardPiles) {
      const currentPile = currentFaceCardPiles.get(cardId);
      if (currentPile !== prevPile && ctx.playTriggeredCards.has(cardId)) {
        ctx.playTriggeredCards.delete(cardId);
        const card =
          state.tableau.flat().find(c => c.id === cardId) ??
          state.waste.find(c => c.id === cardId);
        if (!card) continue;
        if (card.rank === 1) {
          ctx.setHeroHp(Math.max(0, ctx.combatState().heroHp - 2));
        }
        if (card.rank === 11) ctx.combat.setPoisonTurns(0);
        if (card.rank === 12) {
          ctx.setHeroHp(Math.max(0, ctx.combatState().heroHp - 3));
        }
        // King: armor reversal handled by combat snapshot restore.
      }
    }
    return;
  }

  for (const [cardId, currentPile] of currentFaceCardPiles) {
    if (!currentPile.startsWith('tableau-')) continue;
    const prevPile = prevFaceCardPiles.get(cardId);
    if (prevPile === undefined || prevPile === currentPile) continue;
    if (ctx.playTriggeredCards.has(cardId)) continue;

    const pileIdx = parseInt(currentPile.split('-')[1]);
    const pile = state.tableau[pileIdx];
    const prevLen = prevTableauLengths[pileIdx];
    const growth = pile.length - prevLen;
    if (growth <= 0) continue;
    const bottomOfMoved = pile[pile.length - growth];
    if (!bottomOfMoved || bottomOfMoved.id !== cardId) continue;

    ctx.playTriggeredCards.add(cardId);
    const card = bottomOfMoved;
    if (card.rank === 1)  { ctx.combat.healHero(2);              ctx.combat.emitFaceCardEvent('Ace Rises!'); }
    if (card.rank === 11) { ctx.combat.setPoisonTurns(2);        ctx.combat.emitFaceCardEvent('Jack Rises!'); }
    if (card.rank === 12) { ctx.combat.healHero(3);              ctx.combat.emitFaceCardEvent('Queen Rises!'); }
    if (card.rank === 13) { ctx.combat.grantArmor(6, 'King Rises!'); ctx.combat.emitFaceCardEvent('King Rises!'); }
  }
}

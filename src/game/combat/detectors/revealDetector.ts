import type { Card } from '../../types';
import type { DetectorContext } from '../types';

/**
 * Detection #5: Face-down card reveals (Tier 1 — Stirs...).
 *
 * - Forward: each newly-revealed card deals 2 chip damage. If a face card
 *   was revealed, trigger its tier-1 effect.
 * - Undo: cards flipped back to face-down → heal monster, undo tier-1 effects.
 */
export function detectReveals(
  prevFaceDownCounts: number[],
  prevFaceDownIds: Set<string>,
  tableau: Card[][],
  ctx: DetectorContext,
): void {
  const currentCounts = tableau.map(t => t.filter(c => !c.faceUp).length);

  // Diligent Play: every 3rd cumulative reveal this encounter grants +2 armor.
  let totalReveals = 0;
  let totalUnreveals = 0;

  for (let i = 0; i < 7; i++) {
    if (currentCounts[i] < prevFaceDownCounts[i]) {
      const reveals = prevFaceDownCounts[i] - currentCounts[i];
      totalReveals += reveals;
      ctx.combat.dealDamageToMonster(2 * reveals, 'Reveal!');

      for (const card of tableau[i]) {
        if (!card.faceUp || !prevFaceDownIds.has(card.id)) continue;
        if (card.rank === 1)  { ctx.combat.healHero(1);              ctx.combat.emitFaceCardEvent('Ace Stirs...'); }
        if (card.rank === 11) { ctx.combat.setPoisonTurns(1);        ctx.combat.emitFaceCardEvent('Jack Stirs...'); }
        if (card.rank === 12) { ctx.combat.healHero(2);              ctx.combat.emitFaceCardEvent('Queen Stirs...'); }
        if (card.rank === 13) { ctx.combat.grantArmor(3, 'King Stirs...'); ctx.combat.emitFaceCardEvent('King Stirs...'); }
      }
    } else if (currentCounts[i] > prevFaceDownCounts[i]) {
      const unreveals = currentCounts[i] - prevFaceDownCounts[i];
      totalUnreveals += unreveals;
      ctx.combat.healMonster(2 * unreveals);

      for (const card of tableau[i]) {
        if (card.faceUp || prevFaceDownIds.has(card.id)) continue;
        if (card.rank === 1) {
          ctx.setHeroHp(Math.max(0, ctx.combatState().heroHp - 1));
        }
        if (card.rank === 11) ctx.combat.setPoisonTurns(0);
        if (card.rank === 12) {
          ctx.setHeroHp(Math.max(0, ctx.combatState().heroHp - 2));
        }
        // King: armor/defense reversal handled by combat snapshot restore.
      }
    }
  }

  // Diligent Play streak: grant +2 armor for each multiple-of-3 threshold
  // crossed by this move's net reveals. Un-reveals decrement symmetrically
  // so undo is consistent. Armor grants themselves are reversed via the
  // combat snapshot restore path (same pattern as Kings).
  const prevStreak = ctx.revealStreak.value;
  const nextStreak = Math.max(0, prevStreak + totalReveals - totalUnreveals);
  ctx.revealStreak.value = nextStreak;
  if (totalReveals > 0) {
    const crossings = Math.floor(nextStreak / 3) - Math.floor(prevStreak / 3);
    if (crossings > 0) {
      ctx.combat.grantArmor(2 * crossings, 'Diligent Play!');
    }
  }
}

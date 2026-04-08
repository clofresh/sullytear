import type { Card } from '../../types';
import type { DetectorContext } from '../types';
import { foundationId } from '../../pileId';

/**
 * Detection #1: Foundation pile growth/shrinkage.
 *
 * - Card placed on foundation → damage = card rank (× empowerMultiplier).
 *   Royal awakenings (Ace/Jack/Queen/King) trigger tier-3 effects.
 * - Card removed (undo) → heal monster by removed rank, undo Ace/Queen heals.
 *
 * Returns whether a foundation grew this frame (used by wasteDetector to
 * avoid double-counting waste→foundation as a "waste play").
 */
export function detectFoundationChanges(
  prevLengths: number[],
  foundations: Card[][],
  ctx: DetectorContext,
): { foundationGrew: boolean } {
  let foundationGrew = false;
  const currentLengths = foundations.map(f => f.length);

  for (let i = 0; i < 4; i++) {
    if (currentLengths[i] > prevLengths[i]) {
      foundationGrew = true;
      const topCard = foundations[i][foundations[i].length - 1];
      if (!topCard) continue;

      let damage: number = topCard.rank;
      const empower = ctx.combatState().empowerMultiplier;
      if (empower > 1.0) {
        damage = Math.round(damage * empower);
        ctx.combat.setEmpowerMultiplier(1.0);
      }
      const stickerBonus = ctx.stickers.foundationDamageBonus(topCard, foundationId(i));
      // Flat sticker bonuses (Sharpened, Forge) are added AFTER the empower multiply — they remain flat and do not scale with Surge.
      damage += stickerBonus;
      ctx.combat.dealDamageToMonster(damage);
      const vampHeal = ctx.stickers.onDamageDealt(damage);
      if (vampHeal > 0) ctx.combat.healHero(vampHeal);

      // Royal Awakening — Tier 3 (Awakens!)
      if (topCard.rank === 1) {
        ctx.combat.healHero(3);
        ctx.combat.emitFaceCardEvent('Ace Awakens!');
      } else if (topCard.rank === 11) {
        ctx.combat.setPoisonTurns(3);
        ctx.combat.emitFaceCardEvent('Jack Awakens!');
      } else if (topCard.rank === 12) {
        ctx.combat.healHero(5);
        ctx.combat.emitFaceCardEvent('Queen Awakens!');
      } else if (topCard.rank === 13) {
        ctx.combat.grantArmor(10, 'King Awakens!');
        ctx.combat.grantDefense(10, 'King Awakens!');
        ctx.combat.emitFaceCardEvent('King Awakens!');
      }
    } else if (currentLengths[i] < prevLengths[i]) {
      // Undo: heal monster by the rank that was removed.
      const healRank = prevLengths[i];
      ctx.combat.healMonster(healRank);
      if (healRank === 1) {
        ctx.setHeroHp(Math.max(0, ctx.combatState().heroHp - 3));
      }
      if (healRank === 12) {
        ctx.setHeroHp(Math.max(0, ctx.combatState().heroHp - 5));
      }
    }
  }

  return { foundationGrew };
}

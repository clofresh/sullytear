import type { DetectorContext } from '../types';

/**
 * Detection #2: Stock cycle (waste flipped back to stock).
 *
 * - Forward (count increased) → monster attacks hero.
 * - Undo  (count decreased) → reverse the attack.
 */
export function detectStockCycle(
  prevCount: number,
  currentCount: number,
  ctx: DetectorContext,
): void {
  if (currentCount > prevCount) {
    ctx.combat.dealDamageToHero(ctx.combatState().monsterAttackDamage);
  } else if (currentCount < prevCount) {
    ctx.combat.healHero(ctx.combatState().monsterAttackDamage);
  }
}

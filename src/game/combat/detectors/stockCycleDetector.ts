import type { DetectorContext } from '../types';

/**
 * Detection #2: Stock cycle (waste flipped back to stock).
 *
 * - Forward (count increased) → dump threat (monsterAttackDamage * 2)
 *   onto the monster's threat meter. If the meter fills, the addThreat
 *   action fires the monster's attack via dealDamageToHero.
 * - Undo  (count decreased) → subtract the same amount (clamped at 0
 *   by addThreat).
 */
export function detectStockCycle(
  prevCount: number,
  currentCount: number,
  ctx: DetectorContext,
): void {
  const atk = ctx.combatState().monsterAttackDamage;
  if (currentCount > prevCount) {
    ctx.combat.addThreat(atk * 2);
  } else if (currentCount < prevCount) {
    ctx.combat.addThreat(-atk * 2);
  }
}

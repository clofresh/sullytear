import type { DetectorContext } from '../types';

/**
 * Detection #4: Tableau column clear / un-clear.
 *
 * - Column went non-empty → empty: heal hero by 5.
 * - Column went empty → non-empty (undo): subtract 5 hero HP.
 */
export function detectColumnClears(
  prevEmpty: boolean[],
  currentEmpty: boolean[],
  ctx: DetectorContext,
): void {
  for (let i = 0; i < 7; i++) {
    if (!prevEmpty[i] && currentEmpty[i]) {
      ctx.combat.healHero(5, 'Column Clear!');
    } else if (prevEmpty[i] && !currentEmpty[i]) {
      if (ctx.combatState().combatResult === 'none') {
        ctx.setHeroHp(Math.max(0, ctx.combatState().heroHp - 5));
      }
    }
  }
}

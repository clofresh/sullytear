import type { Card } from '../../types';
import type { DetectorContext } from '../types';

/**
 * Detection #3: Draw and waste→tableau plays.
 *
 * - Waste grew (no cycle change) → a stock draw happened.
 *   Damage hero by sum of newly drawn ranks; tick poison if active.
 * - Waste shrank (no cycle change) and no foundation grew → waste→tableau.
 *   Damage monster by the played card's rank.
 */
export function detectWasteUsage(
  prevWasteLength: number,
  prevWasteTopId: string | null,
  prevStockCycleCount: number,
  currentStockCycleCount: number,
  waste: Card[],
  tableau: Card[][],
  foundationGrew: boolean,
  ctx: DetectorContext,
): void {
  const currentWasteLength = waste.length;
  const noCycle = currentStockCycleCount === prevStockCycleCount;

  if (currentWasteLength > prevWasteLength && noCycle) {
    const drawn = currentWasteLength - prevWasteLength;
    let rankSum = 0;
    for (let i = currentWasteLength - drawn; i < currentWasteLength; i++) {
      rankSum += waste[i].rank;
    }
    ctx.combat.dealDamageToHero(rankSum);
    if (ctx.combatState().poisonTurns > 0) {
      ctx.combat.applyPoison();
    }
  } else if (currentWasteLength < prevWasteLength && noCycle) {
    if (!foundationGrew && prevWasteTopId !== null) {
      for (const col of tableau) {
        const card = col.find(c => c.id === prevWasteTopId);
        if (card) {
          ctx.combat.dealDamageToMonster(card.rank, 'Waste!');
          break;
        }
      }
    }
  }
}

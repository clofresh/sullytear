import type { DetectorContext } from '../types';

/**
 * Detection #6: Combo attacks — tableau columns that grow/shrink by 3+.
 *
 * - Forward: damage monster by 2× growth, label "Combo xN!".
 * - Undo: heal monster by 2× shrinkage.
 */
export function detectCombo(
  prevTableauLengths: number[],
  currentTableauLengths: number[],
  prevMoves: number,
  currentMoves: number,
  ctx: DetectorContext,
): void {
  const isUndo = currentMoves < prevMoves;
  for (let i = 0; i < 7; i++) {
    if (isUndo) {
      const shrinkage = prevTableauLengths[i] - currentTableauLengths[i];
      if (shrinkage >= 3) ctx.combat.healMonster(2 * shrinkage);
    } else {
      const growth = currentTableauLengths[i] - prevTableauLengths[i];
      if (growth >= 3) ctx.combat.dealDamageToMonster(2 * growth, `Combo x${growth}!`);
    }
  }
}

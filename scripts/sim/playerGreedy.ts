/**
 * Greedy heuristic player for the headless simulator.
 *
 * Priority (highest first):
 *   1. Foundation placement from tableau that also reveals a new card
 *   2. Any foundation placement from tableau
 *   3. Tableau→tableau move that reveals a face-down card
 *   4. Tableau→tableau move onto an empty column (King relocation)
 *   5. Other tableau→tableau moves (shortest transfer first, so we
 *      don't endlessly shuffle long sequences)
 *   6. Waste→tableau
 *   7. Waste→foundation
 *   8. Draw from stock
 *   9. Stock cycle (reset), only if threat headroom is safe
 *
 * The ranking emulates an average-skill human: take free progress,
 * reveal face-down cards, avoid burning stock cycles under pressure.
 *
 * The player returns a single next action; the runner applies it and
 * re-queries until the encounter ends or a hard turn cap trips.
 */

import type { Card } from '../../src/game/types.ts';
import { canMoveToFoundation, canMoveToTableau } from '../../src/game/rules.ts';

export interface GameView {
  stock: Card[];
  waste: Card[];
  tableau: Card[][];
  foundations: Card[][];
  stockCycleCount: number;
  drawMode: 1 | 3;
}

export interface CombatView {
  monsterThreat: number;
  monsterThreatMax: number;
  monsterAttackDamage: number;
  heroHp: number;
}

export type Action =
  | { kind: 'move'; from: string; fromIndex: number; to: string }
  | { kind: 'draw' }
  | { kind: 'done' };

interface RankedMove {
  action: Action;
  score: number;
}

function foundationIndexFor(card: Card, foundations: Card[][]): number {
  for (let i = 0; i < 4; i++) {
    if (canMoveToFoundation(card, foundations[i])) return i;
  }
  return -1;
}

function emptyTableauIndex(tableau: Card[][]): number {
  for (let i = 0; i < 7; i++) {
    if (tableau[i].length === 0) return i;
  }
  return -1;
}

/** Enumerate candidate moves and score them. Highest score wins. */
function enumerateMoves(game: GameView): RankedMove[] {
  const moves: RankedMove[] = [];
  const { tableau, waste, foundations } = game;

  // 1–2: tableau → foundation
  for (let t = 0; t < 7; t++) {
    const pile = tableau[t];
    if (pile.length === 0) continue;
    const top = pile[pile.length - 1];
    if (!top.faceUp) continue;
    const fi = foundationIndexFor(top, foundations);
    if (fi < 0) continue;
    // Penalize foundation moves for low ranks (2,3) to keep builders
    // available in the tableau — classic Klondike wisdom.
    const reveals = pile.length >= 2 && !pile[pile.length - 2].faceUp;
    const keepForBuilder = top.rank <= 3 ? -5 : 0;
    moves.push({
      action: { kind: 'move', from: `tableau-${t}`, fromIndex: pile.length - 1, to: `foundation-${fi}` },
      score: 100 + (reveals ? 20 : 0) + keepForBuilder,
    });
  }

  // 3–5: tableau → tableau
  for (let from = 0; from < 7; from++) {
    const src = tableau[from];
    if (src.length === 0) continue;
    // Find the index of the lowest face-up card in the source pile —
    // we can move any contiguous run starting at or after that index.
    let firstFaceUp = src.length;
    for (let i = 0; i < src.length; i++) {
      if (src[i].faceUp) { firstFaceUp = i; break; }
    }
    for (let idx = firstFaceUp; idx < src.length; idx++) {
      const moving = src.slice(idx);
      for (let to = 0; to < 7; to++) {
        if (to === from) continue;
        const tgt = tableau[to];
        if (!canMoveToTableau(moving, tgt)) continue;
        const reveals = idx > 0 && !src[idx - 1].faceUp;
        const toEmpty = tgt.length === 0;
        // Don't move a full face-up sequence onto an empty column unless
        // it reveals a new card — it's a no-op otherwise.
        if (toEmpty && idx === 0) continue;
        // Sterile swaps (no reveal, not onto an empty column) have no
        // board value and cause the heuristic to loop — discourage hard
        // so we fall through to drawing from stock instead.
        if (!reveals && !toEmpty) continue;
        let score = 50;
        if (reveals) score += 30;
        if (toEmpty) score += 5;
        // Prefer moving shorter runs (keeps things simple, avoids cycles).
        score -= moving.length;
        moves.push({
          action: { kind: 'move', from: `tableau-${from}`, fromIndex: idx, to: `tableau-${to}` },
          score,
        });
      }
    }
  }

  // 6: waste → tableau
  if (waste.length > 0) {
    const top = waste[waste.length - 1];
    for (let to = 0; to < 7; to++) {
      const tgt = tableau[to];
      if (canMoveToTableau([top], tgt)) {
        moves.push({
          action: { kind: 'move', from: 'waste', fromIndex: waste.length - 1, to: `tableau-${to}` },
          score: 40,
        });
      }
    }
    // Allow King-from-waste onto empty column
    const emptyT = emptyTableauIndex(tableau);
    if (emptyT >= 0 && top.rank === 13) {
      moves.push({
        action: { kind: 'move', from: 'waste', fromIndex: waste.length - 1, to: `tableau-${emptyT}` },
        score: 42,
      });
    }
    // 7: waste → foundation
    const fi = foundationIndexFor(top, foundations);
    if (fi >= 0) {
      moves.push({
        action: { kind: 'move', from: 'waste', fromIndex: waste.length - 1, to: `foundation-${fi}` },
        score: 95,
      });
    }
  }

  return moves;
}

export function chooseAction(game: GameView, combat: CombatView): Action {
  const moves = enumerateMoves(game);
  if (moves.length > 0) {
    moves.sort((a, b) => b.score - a.score);
    return moves[0].action;
  }

  // No board moves: draw from stock.
  if (game.stock.length > 0) {
    return { kind: 'draw' };
  }

  // Stock empty: cycling resets waste back to stock. Only do it when
  // threat headroom can absorb another monster attack, and cap the
  // number of cycles so we can't loop forever.
  if (game.waste.length > 0 && game.stockCycleCount < 3) {
    const threatRoom = combat.monsterThreatMax - combat.monsterThreat;
    const hpRoom = combat.heroHp;
    // Rough safety: at least one attack's worth of HP headroom.
    if (hpRoom > combat.monsterAttackDamage || threatRoom > 0) {
      return { kind: 'draw' };
    }
  }

  return { kind: 'done' };
}

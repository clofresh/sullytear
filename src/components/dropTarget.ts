/**
 * Pure helpers for resolving the drop-target pile during a drag-end.
 *
 * Extracted from GameBoard so the snap/fallback logic can be unit-tested
 * without a real DOM. The DOM-touching wiring lives in `domDropTarget.ts`.
 */

export interface Point {
  x: number;
  y: number;
}

/** Maximum pointer-to-pile-center distance allowed for snap fallback. */
export function getMaxSnapDistance(isStockDrag: boolean, cardWidth: number): number {
  // Stock drags are very lenient — snap to waste from anywhere.
  return isStockDrag ? Infinity : cardWidth * 1.2;
}

/**
 * Among `validTargets`, return the id whose center is closest to `point`,
 * provided it lies within `maxDistance`. Returns null otherwise.
 */
export function findClosestValidTarget(
  point: Point,
  validTargets: ReadonlySet<string>,
  maxDistance: number,
  getPileCenter: (pileId: string) => Point | null,
): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const id of validTargets) {
    const center = getPileCenter(id);
    if (!center) continue;
    const dist = Math.hypot(point.x - center.x, point.y - center.y);
    if (dist < bestDist && dist <= maxDistance) {
      bestDist = dist;
      best = id;
    }
  }
  return best;
}

export interface ResolveDropTargetArgs {
  point: Point;
  dragSourcePileId: string;
  validTargets: ReadonlySet<string>;
  cardWidth: number;
  /** Pile ids found under the pointer, ordered topmost-first. */
  elementsAtPoint: (point: Point) => string[];
  getPileCenter: (pileId: string) => Point | null;
}

/**
 * Resolve the pile id that a drag-end at `point` should drop into.
 *
 * Strategy:
 *   1. Use the pile under the pointer (excluding the source pile).
 *   2. Otherwise, snap to the closest valid target within range.
 */
export function resolveDropTarget(args: ResolveDropTargetArgs): string | null {
  const { point, dragSourcePileId, validTargets, cardWidth, elementsAtPoint, getPileCenter } =
    args;

  for (const id of elementsAtPoint(point)) {
    if (id && id !== dragSourcePileId) return id;
  }

  if (validTargets.size === 0) return null;
  const maxDistance = getMaxSnapDistance(dragSourcePileId === 'stock', cardWidth);
  return findClosestValidTarget(point, validTargets, maxDistance, getPileCenter);
}

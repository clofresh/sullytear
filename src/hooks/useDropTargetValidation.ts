import { useEffect } from 'react';
import { useDragApi, useDragState, type DragSnapshot } from '../game/DragContext';

/**
 * Subscribe to the drag state and report whether `pileId` is currently a
 * valid drop target. Replaces the per-component `setInterval(check, 100)`
 * pattern that used to live in Tableau / Foundation / Waste.
 *
 * The `validate` callback is invoked whenever the drag snapshot changes
 * (event-driven via DragContext) — never on a polling timer.
 */
export function useDropTargetValidation(
  pileId: string,
  validate: (drag: DragSnapshot) => boolean,
): boolean {
  const drag = useDragState();
  const api = useDragApi();
  const valid = drag.active ? validate(drag) : false;

  useEffect(() => {
    api.registerValidTarget(pileId, valid);
    return () => api.registerValidTarget(pileId, false);
  }, [api, pileId, valid]);

  return valid;
}
